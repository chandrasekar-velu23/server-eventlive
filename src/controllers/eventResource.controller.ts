import { Request, Response } from 'express';
import { sendSessionFeedbackEmail } from '../services/mail.service';

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

        // TODO: Store the request in database for tracking
        // For now, we'll send an email notification to the organizer

        // Get event organizer email (you'll need to fetch this from your event model)
        // const event = await Event.findById(eventId).populate('organizer');
        // const organizerEmail = event.organizer.email;

        // For now, using a placeholder - replace with actual organizer email fetch
        const organizerEmail = process.env.ADMIN_EMAIL || 'chandrasekarvelu23@gmail.com';

        // Send email to organizer about transcript request
        await sendSessionFeedbackEmail(
            organizerEmail,
            attendeeName,
            attendeeEmail,
            eventTitle,
            `Transcript request for event: ${eventTitle}`,
            { transcript: true, recording: false }
        );

        // Send confirmation email to attendee
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: `"EventLive Support" <${process.env.EMAIL_USER}>`,
            to: attendeeEmail,
            subject: `Transcript Request Received - ${eventTitle}`,
            html: `
        <h3>Transcript Request Confirmed</h3>
        <p>Hello ${attendeeName},</p>
        <p>We've received your request for the transcript of <strong>${eventTitle}</strong>.</p>
        <p>Our team will process your request and send you the transcript within 24 hours.</p>
        <p>You'll receive an email at <strong>${attendeeEmail}</strong> once it's ready.</p>
        <br/>
        <p>Thank you for attending!</p>
        <p>- EventLive Team</p>
      `,
        });

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

        // TODO: Store the request in database for tracking
        // For now, we'll send an email notification to the organizer

        // Get event organizer email (you'll need to fetch this from your event model)
        // const event = await Event.findById(eventId).populate('organizer');
        // const organizerEmail = event.organizer.email;

        // For now, using a placeholder - replace with actual organizer email fetch
        const organizerEmail = process.env.ADMIN_EMAIL || 'chandrasekarvelu23@gmail.com';

        // Send email to organizer about recording request
        await sendSessionFeedbackEmail(
            organizerEmail,
            attendeeName,
            attendeeEmail,
            eventTitle,
            `Recording request for event: ${eventTitle}`,
            { transcript: false, recording: true }
        );

        // Send confirmation email to attendee
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: `"EventLive Support" <${process.env.EMAIL_USER}>`,
            to: attendeeEmail,
            subject: `Recording Request Received - ${eventTitle}`,
            html: `
        <h3>Recording Request Confirmed</h3>
        <p>Hello ${attendeeName},</p>
        <p>We've received your request for the recording of <strong>${eventTitle}</strong>.</p>
        <p>Our team will process your request and send you the recording link within 24 hours.</p>
        <p>You'll receive an email at <strong>${attendeeEmail}</strong> once it's ready.</p>
        <br/>
        <p>Thank you for attending!</p>
        <p>- EventLive Team</p>
      `,
        });

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
