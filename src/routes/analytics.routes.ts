
import express from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { authGuard } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * Analytics Routes
 */

// Get detailed logs for a specific attendee in an event
router.get('/attendees/:eventId/logs/:userId', authGuard, analyticsController.getAttendeeDetailedLogs);

// Export attendee logs as CSV
router.get('/attendees/:eventId/export/:userId', authGuard, analyticsController.exportAttendeeLogs);

// Send email to an attendee
router.post('/email/send-attendee', authGuard, analyticsController.sendEmailToAttendee);

// Send request/support email from attendee
router.post('/email/request', authGuard, analyticsController.sendRequestMail);

export default router;
