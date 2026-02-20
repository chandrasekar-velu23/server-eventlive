import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ENDPOINT = process.env.R2_ENDPOINT;

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_ENDPOINT) {
    console.warn("Missing R2 environment variables. R2 storage will not work.");
}

export const s3Client = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || "",
        secretAccessKey: R2_SECRET_ACCESS_KEY || "",
    },
});

export const getPublicUrl = (filename: string): string => {
    // If you have a custom domain for your R2 bucket, use it here.
    // Otherwise, you might need to use the R2.dev URL if enabled, or a worker.
    // For now, assuming R2_PUBLIC_URL is set or falling back to a constructed URL if possible,
    // but R2 buckets aren't public by default without a worker or custom domain.
    // We will use an env variable for the public domain.
    // We will use an env variable for the public domain.
    let publicDomain = process.env.R2_PUBLIC_DOMAIN || "";

    // Remove trailing slash if present
    if (publicDomain.endsWith('/')) {
        publicDomain = publicDomain.slice(0, -1);
    }

    if (publicDomain) {
        // Ensure filename doesn't start with / if domain doesn't end with one (we just removed it)
        const cleanFilename = filename.startsWith('/') ? filename.slice(1) : filename;
        return `${publicDomain}/${cleanFilename}`;
    }
    return filename;
};

export const uploadFile = async (
    file: Express.Multer.File | { buffer: Buffer, originalname: string, mimetype: string },
    key: string,
    contentType: string
): Promise<string> => {
    // Check storage provider
    if (process.env.STORAGE_PROVIDER === 'local') {
        const fs = await import('fs');
        const path = await import('path');

        // Construct local path
        // key might be "recordings/sessionId/filename.webm"
        // We want to save to "public/uploads/recordings/..."
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        const fullPath = path.join(uploadDir, key);
        const dir = path.dirname(fullPath);

        // Ensure directory exists
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Write file
        let buffer: Buffer;
        if ('buffer' in file && file.buffer) {
            buffer = file.buffer;
        } else if ('path' in file && file.path) {
            buffer = fs.readFileSync(file.path);
        } else {
            throw new Error("File buffer or path not found");
        }

        fs.writeFileSync(fullPath, buffer);

        // Return URL
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        return `${backendUrl}/uploads/${key}`;
    }

    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: 'buffer' in file ? file.buffer : undefined, // Handle if not in memory? Middleware used memoryStorage so buffer is there.
        ContentType: contentType,
        // ACL: "public-read", // R2 doesn't support ACLs
    });

    try {
        await s3Client.send(command);
        return getPublicUrl(key);
    } catch (error) {
        console.error("Error uploading file to R2:", error);
        throw new Error("Failed to upload file to storage");
    }
};

/* ─────────────────────────────────────────────────────────────────
 * Multipart Upload helpers (used by chunked recording controller)
 * ───────────────────────────────────────────────────────────────── */

/** Create a new multipart upload and return the UploadId */
export const initMultipartUpload = async (key: string, contentType: string): Promise<string> => {
    const cmd = new CreateMultipartUploadCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });
    const res = await s3Client.send(cmd);
    if (!res.UploadId) throw new Error('R2 did not return an UploadId');
    return res.UploadId;
};

/** Upload a single part (1-indexed). Returns the ETag needed for completion. */
export const uploadPart = async (
    key: string,
    uploadId: string,
    partNumber: number, // 1–10000
    body: Buffer,
): Promise<{ ETag: string; PartNumber: number }> => {
    const cmd = new UploadPartCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: body,
        ContentLength: body.byteLength,
    });
    const res = await s3Client.send(cmd);
    if (!res.ETag) throw new Error(`No ETag for part ${partNumber}`);
    return { ETag: res.ETag, PartNumber: partNumber };
};

/** Complete the multipart upload and return the final public URL */
export const completeMultipartUpload = async (
    key: string,
    uploadId: string,
    parts: { ETag: string; PartNumber: number }[],
): Promise<string> => {
    const cmd = new CompleteMultipartUploadCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
    });
    await s3Client.send(cmd);
    return getPublicUrl(key);
};

/** Abort an incomplete multipart upload (cleanup on error) */
export const abortMultipartUpload = async (key: string, uploadId: string): Promise<void> => {
    await s3Client.send(new AbortMultipartUploadCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
    }));
};
