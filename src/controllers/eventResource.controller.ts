import { Request, Response } from 'express';
import Event from '../models/event.model';
import User from '../models/user.model';
import { sendSessionFeedbackEmail, sendResourceRequestConfirmation } from '../services/mail.service';
import { sendNotification } from '../services/websocket.service';
import { logActivity } from '../services/activityLog.service';

/**
 * Request Event Transcript
 * Attendee requests transcript and receives email notification
 */
export const requestTranscript = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const { attendeeEmail, attendeeName, eventTitle } = req.body;

        if (!attendeeEmail || !attendeeName || !eventTitle) {
            return res.status(400).json({
                message: 'Missing required fields: attendeeEmail, attendeeName, eventTitle'
            });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const organizer = await User.findById(event.organizerId);
        const organizerEmail = organizer?.email || process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

        // Send email to organizer about transcript request
        if (organizerEmail) {
            await sendSessionFeedbackEmail(
                organizerEmail,
                attendeeName,
                attendeeEmail,
                eventTitle,
                `Transcript request for event: ${eventTitle}`,
                { transcript: true, recording: false }
            );
        }

        // Send Dashboard Notification to Organizer
        if (event.organizerId) {
            sendNotification(event.organizerId.toString(), 'transcript_request', {
                eventId: event._id,
                eventTitle: event.title,
                attendeeName,
                attendeeEmail,
                message: `${attendeeName} requested a transcript for ${event.title}`
            });
        }

        // Log Activity
        await logActivity(req.user?.userId || 'system', "Transcript Requested", { eventId: event._id, title: event.title }, req);

        // Send confirmation email to attendee via GAS Proxy
        await sendResourceRequestConfirmation(
            attendeeEmail,
            attendeeName,
            eventTitle,
            'transcript'
        );

        res.status(200).json({
            message: 'Transcript request received. You will receive an email notification once ready.',
            success: true
        });
    } catch (error) {
        console.error('Error requesting transcript:', error);
        res.status(500).json({
            message: 'Failed to process transcript request',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Request Event Recording
 * Attendee requests recording and receives email notification
 */
export const requestRecording = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const { attendeeEmail, attendeeName, eventTitle } = req.body;

        if (!attendeeEmail || !attendeeName || !eventTitle) {
            return res.status(400).json({
                message: 'Missing required fields: attendeeEmail, attendeeName, eventTitle'
            });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const organizer = await User.findById(event.organizerId);
        const organizerEmail = organizer?.email || process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

        // Send email to organizer about recording request
        if (organizerEmail) {
            await sendSessionFeedbackEmail(
                organizerEmail,
                attendeeName,
                attendeeEmail,
                eventTitle,
                `Recording request for event: ${eventTitle}`,
                { transcript: false, recording: true }
            );
        }

        // Send Dashboard Notification to Organizer
        if (event.organizerId) {
            sendNotification(event.organizerId.toString(), 'recording_request', {
                eventId: event._id,
                eventTitle: event.title,
                attendeeName,
                attendeeEmail,
                message: `${attendeeName} requested a recording for ${event.title}`
            });
        }

        // Log Activity
        await logActivity(req.user?.userId || 'system', "Recording Requested", { eventId: event._id, title: event.title }, req);

        // Send confirmation email to attendee via GAS Proxy
        await sendResourceRequestConfirmation(
            attendeeEmail,
            attendeeName,
            eventTitle,
            'recording'
        );

        res.status(200).json({
            message: 'Recording request received. You will receive an email notification once ready.',
            success: true
        });
    } catch (error) {
        console.error('Error requesting recording:', error);
        res.status(500).json({
            message: 'Failed to process recording request',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export default {
    requestTranscript,
    requestRecording,
};
