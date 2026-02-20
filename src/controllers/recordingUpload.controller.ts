/**
 * recordingUpload.controller.ts
 * Handles chunked recording uploads from the browser.
 *
 * Flow:
 *   POST /sessions/:sessionId/recording/init        ← browser calls once at start
 *   POST /sessions/:sessionId/recording/chunk       ← browser calls every ~5 s
 *   POST /sessions/:sessionId/recording/finalize    ← browser calls when MediaRecorder stops
 *
 * Chunks are buffered in-memory per uploadId, then the finalize step
 * pushes them to R2 using S3 Multipart Upload (for large files).
 *
 * R2 Multipart constraint: each part (except the last) MUST be ≥ 5 MB.
 * We accumulate chunks until we reach the 5 MB threshold before issuing
 * a PartUpload so small 5-second webm chunks are merged appropriately.
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import {
    initMultipartUpload,
    uploadPart,
    completeMultipartUpload,
    abortMultipartUpload,
    uploadFile,
    getPublicUrl,
} from '../services/s3.service';
import Session from '../models/session.model';

/* ─────────────────────────────────────────────
 * In-memory buffer per active upload
 * In production with multiple instances, use Redis or a shared store.
 * ───────────────────────────────────────────── */
interface UploadBuffer {
    sessionId: string;
    userId: string;
    key: string;               // R2 object key
    r2UploadId: string;        // S3 Multipart UploadId
    parts: { ETag: string; PartNumber: number }[];
    partNumber: number;        // next part index (1-based)
    pendingBuffer: Buffer[];   // chunks not yet flushed to R2
    pendingSize: number;       // bytes in pendingBuffer
    createdAt: Date;
}

const MINIMUM_PART_SIZE = 5 * 1024 * 1024; // 5 MB — R2 requirement
const uploads = new Map<string, UploadBuffer>();

/* Cleanup stale buffers older than 3 hours */
setInterval(() => {
    const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000);
    for (const [id, buf] of uploads.entries()) {
        if (buf.createdAt < cutoff) {
            console.warn(`[Recording] Cleaning up stale upload ${id}`);
            abortMultipartUpload(buf.key, buf.r2UploadId).catch(() => { });
            uploads.delete(id);
        }
    }
}, 30 * 60 * 1000);

/* ─────────────────────────────────────────────
 * 1 ─ INIT
 * ───────────────────────────────────────────── */
export const initRecordingUpload = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;
        const userId = req.user?.userId;

        const session = await Session.findById(sessionId);
        if (!session) {
            res.status(404).json({ message: 'Session not found' });
            return;
        }

        // Generate storage key
        const timestamp = Date.now();
        const key = `recordings/${sessionId}/${timestamp}-${userId}.webm`;

        // Start a real S3 Multipart Upload on R2
        let r2UploadId: string;
        try {
            r2UploadId = await initMultipartUpload(key, 'video/webm');
        } catch (e) {
            // Fallback: use simple upload mode (for local dev / missing R2 creds)
            console.warn('[Recording] R2 multipart init failed, will use simple upload fallback', e);
            r2UploadId = 'SIMPLE_FALLBACK';
        }

        const uploadId = (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));
        uploads.set(uploadId, {
            sessionId,
            userId: userId!,
            key,
            r2UploadId,
            parts: [],
            partNumber: 1,
            pendingBuffer: [],
            pendingSize: 0,
            createdAt: new Date(),
        });

        // Mark session as recording
        session.recordingStatus = 'recording';
        await session.save();

        res.json({ message: 'Recording upload initialised', data: { uploadId } });
    } catch (error) {
        console.error('[Recording] init error:', error);
        res.status(500).json({ message: 'Failed to initialise recording', error });
    }
};

/* ─────────────────────────────────────────────
 * 2 ─ CHUNK
 * ───────────────────────────────────────────── */
export const uploadRecordingChunk = async (req: Request, res: Response): Promise<void> => {
    try {
        const { uploadId } = req.body;

        if (!req.file) {
            res.status(400).json({ message: 'No chunk data received' });
            return;
        }
        if (!uploadId) {
            res.status(400).json({ message: 'uploadId is required' });
            return;
        }

        const buf = uploads.get(uploadId);
        if (!buf) {
            res.status(404).json({ message: 'Upload not found. Was it initialised?' });
            return;
        }

        // Accumulate chunk into pending buffer
        buf.pendingBuffer.push(req.file.buffer);
        buf.pendingSize += req.file.buffer.byteLength;

        // Flush to R2 when we have enough data (>= 5 MB), except for SIMPLE_FALLBACK
        if (buf.r2UploadId !== 'SIMPLE_FALLBACK' && buf.pendingSize >= MINIMUM_PART_SIZE) {
            await flushPartToR2(buf);
        }

        res.json({ message: 'Chunk received', data: { chunkIndex: req.body.chunkIndex } });
    } catch (error) {
        console.error('[Recording] chunk error:', error);
        res.status(500).json({ message: 'Failed to store chunk', error });
    }
};

/* ─────────────────────────────────────────────
 * 3 ─ FINALIZE
 * ───────────────────────────────────────────── */
export const finalizeRecordingUpload = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;
        const { uploadId } = req.body;

        if (!uploadId) {
            res.status(400).json({ message: 'uploadId is required' });
            return;
        }

        const buf = uploads.get(uploadId);
        if (!buf) {
            res.status(404).json({ message: 'Upload session not found' });
            return;
        }

        let finalUrl: string;

        if (buf.r2UploadId === 'SIMPLE_FALLBACK') {
            /* ── Simple upload fallback (dev / local storage) ── */
            const combined = Buffer.concat(buf.pendingBuffer);
            finalUrl = await uploadFile(
                { buffer: combined, originalname: `recording-${sessionId}.webm`, mimetype: 'video/webm' },
                buf.key,
                'video/webm',
            );
        } else {
            /* ── Real R2 multipart completion ── */
            // Flush any remaining data (the final part, which may be < 5 MB — that's allowed)
            if (buf.pendingSize > 0) {
                await flushPartToR2(buf);
            }

            // Make sure we have at least one part
            if (buf.parts.length === 0) {
                // Edge case: recording was too short — parts array is empty
                // Fall back to single PutObject
                const combined = Buffer.concat(buf.pendingBuffer);
                finalUrl = await uploadFile(
                    { buffer: combined, originalname: `recording.webm`, mimetype: 'video/webm' },
                    buf.key,
                    'video/webm',
                );
            } else {
                finalUrl = await completeMultipartUpload(buf.key, buf.r2UploadId, buf.parts);
            }
        }

        // Cleanup buffer
        uploads.delete(uploadId);

        // Persist URL on session
        const session = await Session.findById(sessionId);
        if (session) {
            session.recordingUrl = finalUrl;
            session.recordingStatus = 'processed';
            await session.save();
        }

        // Audit log
        try {
            const { logAction } = await import('../services/auditLog.service');
            await logAction({
                userId: req.user?.userId || 'system',
                action: 'RECORDING_UPLOAD',
                resourceId: sessionId,
                resourceType: 'SESSION',
                details: { url: finalUrl },
            });
        } catch { /* non-fatal */ }

        res.json({
            message: 'Recording finalised and stored in cloud',
            data: { url: finalUrl },
        });
    } catch (error) {
        console.error('[Recording] finalize error:', error);
        res.status(500).json({ message: 'Failed to finalise recording', error });
    }
};

/* ─────────────────────────────────────────────
 * Helper: flush pending buffer to R2 as a part
 * ───────────────────────────────────────────── */
async function flushPartToR2(buf: UploadBuffer): Promise<void> {
    if (buf.pendingSize === 0) return;

    const combined = Buffer.concat(buf.pendingBuffer);
    const part = await uploadPart(buf.key, buf.r2UploadId, buf.partNumber, combined);
    buf.parts.push(part);
    buf.partNumber++;
    buf.pendingBuffer = [];
    buf.pendingSize = 0;
}
