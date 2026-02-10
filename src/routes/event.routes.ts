import express from "express";
import { createEvent, getMyEvents, getAllEvents, getEventById, updateEvent, deleteEvent, enrollEvent, getEventAttendees, getEventAnalytics, uploadCoverImage, uploadLogoImage, getEnrolledEvents, joinEventByCode, submitEventFeedback, getAllMyAttendees, getGlobalAnalytics, getEventChangeLogs, getAllEventChangeLogs, getEventAttendanceLogs, getEventAttendanceStats, sendSessionLinkToAttendees, sendEventReminder, sendCustomEmailToAttendees } from "../controllers/event.controller";
import { requestTranscript, requestRecording } from "../controllers/eventResource.controller";
import { authGuard, optionalAuth } from "../middleware/auth.middleware";
import { adminGuard } from "../middleware/admin.middleware";
import { uploadEventCover, uploadEventLogo } from "../middleware/upload.middleware";
import { sanitizeInput } from "../utils/validation.utils";

const router = express.Router();

// Upload endpoints - requires authentication
router.post("/cover", authGuard, uploadEventCover.single('file'), uploadCoverImage) as any;
router.post("/logo", authGuard, uploadEventLogo.single('file'), uploadLogoImage) as any;
router.post("/", authGuard, sanitizeInput, createEvent);
router.get("/my", authGuard, getMyEvents) as any;
router.get("/my-attendees", authGuard, getAllMyAttendees) as any;
router.get("/enrolled", authGuard, getEnrolledEvents) as any;
router.get("/analytics/global", authGuard, getGlobalAnalytics) as any;
router.get("/all", getAllEvents) as any;
router.get("/:id", optionalAuth, getEventById) as any;
router.get("/join/:code", optionalAuth, joinEventByCode) as any;
router.put("/:id", authGuard, sanitizeInput, updateEvent) as any;
router.delete("/:id", authGuard, deleteEvent) as any;
router.post("/:id/enroll", authGuard, enrollEvent) as any;
router.get("/:id/attendees", authGuard, getEventAttendees) as any;
router.get("/:id/analytics", authGuard, getEventAnalytics) as any;
router.post("/:id/feedback", authGuard, sanitizeInput, submitEventFeedback) as any;

// Admin-only routes for audit logs
router.get("/audit/all", authGuard, adminGuard, getAllEventChangeLogs) as any;
router.get("/:id/audit", authGuard, adminGuard, getEventChangeLogs) as any;

// Attendance tracking routes (Organizer only)
router.get("/:id/attendance/logs", authGuard, getEventAttendanceLogs) as any;
router.get("/:id/attendance/stats", authGuard, getEventAttendanceStats) as any;

// Email communication routes (Organizer only)
router.post("/:id/send-session-link", authGuard, sendSessionLinkToAttendees) as any;
router.post("/:id/send-reminder", authGuard, sendEventReminder) as any;
router.post("/:id/send-custom-email", authGuard, sanitizeInput, sendCustomEmailToAttendees) as any;

// Attendee resource request routes
router.post("/:id/request-transcript", authGuard, requestTranscript) as any;
router.post("/:id/request-recording", authGuard, requestRecording) as any;


export default router;
