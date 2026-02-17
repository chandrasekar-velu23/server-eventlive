
import { Request, Response } from 'express';
import * as attendanceService from '../services/attendance.service';
import mailService from '../services/mail.service';

/**
 * Get detailed logs for a specific attendee in an event
 */
export const getAttendeeDetailedLogs = async (req: Request, res: Response) => {
    try {
        const { eventId, userId } = req.params;
        const logs = await attendanceService.getAttendeeActivityLogs(userId, eventId);
        res.json(logs);
    } catch (error) {
        console.error('Error fetching attendee logs:', error);
        res.status(500).json({ message: 'Failed to fetch attendee logs' });
    }
};

/**
 * Export attendee logs as CSV
 */
export const exportAttendeeLogs = async (req: Request, res: Response) => {
    try {
        const { eventId, userId } = req.params;
        const logs = await attendanceService.getAttendeeActivityLogs(userId, eventId);

        // Convert to CSV
        const headers = ['Type', 'Timestamp', 'Details'];
        const rows = logs.map(log => {
            const date = log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A';
            const details = JSON.stringify(log.details || {}).replace(/"/g, '""'); // Escape quotes
            return `"${log.type}","${date}","${details}"`;
        });

        const csvContent = [headers.join(','), ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=attendee-logs-${userId}.csv`);
        res.send(csvContent);
    } catch (error) {
        console.error('Error exporting attendee logs:', error);
        res.status(500).json({ message: 'Failed to export logs' });
    }
};

/**
 * Send email to an attendee
 */
export const sendEmailToAttendee = async (req: Request, res: Response) => {
    try {
        const { toEmail, subject, content } = req.body;

        if (!toEmail || !subject || !content) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        await mailService.sendAttendeeEmail(toEmail, subject, content);
        res.json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending email to attendee:', error);
        res.status(500).json({ message: 'Failed to send email' });
    }
};

/**
 * Send request/support email from attendee
 */
export const sendRequestMail = async (req: Request, res: Response) => {
    try {
        const { type, subject, content } = req.body;
        // User info from auth middleware
        const user = (req as any).user;

        if (!type || !subject || !content) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        await mailService.sendRequestEmail(
            user.email,
            user.name,
            type,
            subject,
            content
        );
        res.json({ message: 'Request sent successfully' });
    } catch (error) {
        console.error('Error sending request email:', error);
        res.status(500).json({ message: 'Failed to send request' });
    }
};
