import express, { Router } from 'express';
import * as sessionController from '../controllers/session.controller';
import { authenticate, isSessionOrganizer, isSessionParticipant, requirePermission } from '../middleware/rbac.middleware';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Session Management Routes
 */

// Create session (Organizer)
router.post('/', sessionController.createSession);

// Get session details
router.get('/:sessionId', sessionController.getSession);

// Update session (Organizer only)
router.put('/:sessionId', isSessionOrganizer, sessionController.updateSession);

// Delete session (Organizer only)
router.delete('/:sessionId', isSessionOrganizer, sessionController.deleteSession);

/**
 * Participant Management Routes
 */

// Get session participants
router.get('/:sessionId/participants', isSessionParticipant, sessionController.getParticipants);

// Join session
router.post('/:sessionId/join', sessionController.joinSession);

// Leave session
router.post('/:sessionId/leave', isSessionParticipant, sessionController.leaveSession);

// Mute participant (Moderator/Organizer)
router.post(
  '/:sessionId/participants/:userId/mute',
  isSessionParticipant,
  requirePermission('mute_participant'),
  sessionController.muteParticipant
);

// Unmute participant (Moderator/Organizer)
router.post(
  '/:sessionId/participants/:userId/unmute',
  isSessionParticipant,
  requirePermission('mute_participant'),
  sessionController.unmuteParticipant
);

// Remove participant (Moderator/Organizer)
router.delete(
  '/:sessionId/participants/:userId',
  isSessionParticipant,
  requirePermission('remove_participant'),
  sessionController.removeParticipant
);

/**
 * Session Control Routes
 */

// Start session (Organizer only)
router.post('/:sessionId/start', isSessionOrganizer, sessionController.startSession);

// End session (Organizer only)
router.post('/:sessionId/end', isSessionOrganizer, sessionController.endSession);

/**
 * Chat Routes
 */

// Get chat history
router.get('/:sessionId/chat', isSessionParticipant, sessionController.getChatHistory);

// Send message via WebSocket (see websocket handlers)

/**
 * Attendance Tracking Routes
 */

// Get attendance logs for session (Organizer only)
router.get('/:sessionId/attendance/logs', isSessionOrganizer, sessionController.getSessionAttendanceLogs);

// Get attendance statistics for session (Organizer only)
router.get('/:sessionId/attendance/stats', isSessionOrganizer, sessionController.getSessionAttendanceStats);

// Manual check-in (Organizer only)
router.post('/:sessionId/attendance/checkin', isSessionOrganizer, sessionController.manualCheckIn);

// Manual check-out (Organizer only)
router.post('/:sessionId/attendance/checkout', isSessionOrganizer, sessionController.manualCheckOut);


export default router;
