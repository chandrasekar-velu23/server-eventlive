import { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import Event from '../models/event.model';
import Session from '../models/session.model';
import User from '../models/user.model';
import { sendEventCreationNotificationToAdmin, sendSessionFeedbackEmail, sendEnrollmentConfirmation, sendEventCreationConfirmationToOrganizer } from '../services/mail.service';
import { sendNotification } from '../services/websocket.service';
import { logActivity } from '../services/activityLog.service';
import { config } from '../config';

export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title, description, shortSummary,
      startTime, endTime, timezone,
      coverImage, type, category, visibility,
      accessType, capacity,
      organizerDisplayName, organizerLogo, brandAccentColor,
      agenda, speakers
    } = req.body;

    const user = (req as any).user;
    const userId = user?.id; // Get user ID from auth middleware

    // Validation
    if (!title || !startTime || !endTime) {
      console.warn("CreateEvent: Missing required fields", { title, startTime, endTime });
      res.status(400).json({ message: "Missing required fields: title, startTime, endTime" });
      return;
    }

    console.log(`[EventController] Creating Event: ${title} | Start: ${startTime} | End: ${endTime} | TZ: ${timezone}`);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Logic: Generate 8-character unique session code
    const sessionCode = nanoid(8).toUpperCase();

    const newEvent = new Event({
      title,
      description: description || "",
      shortSummary: shortSummary || "",
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      timezone: timezone || "UTC",

      organizerId: userId,
      organizerDisplayName: organizerDisplayName || user?.name || "Organizer",
      organizerLogo: organizerLogo || "",
      brandAccentColor: brandAccentColor || "#FF5722",

      sessionCode,
      // Logic: Create a direct link for attendees
      shareableLink: `${config.frontendUrl}/join/${sessionCode}`,
      coverImage: coverImage || "",

      type: type || 'virtual', // Legacy support
      category: category || "Webinar",
      accessType: accessType || "Free",
      capacity: capacity ? Number(capacity) : undefined,
      visibility: visibility || 'public',
      status: 'Published', // Auto-publish for now as per requested flow, or 'Draft' if we want step 2

      agenda: agenda || [],
      speakers: speakers || []
    });

    await newEvent.save();
    console.log(`✅ [EventController] Event Created: ${newEvent._id}`);

    // Trigger Admin Notification
    sendEventCreationNotificationToAdmin(newEvent, newEvent.organizerDisplayName || "Organizer").catch((err: any) => console.error(err));

    // Trigger Organizer Confirmation Email
    if (user?.email) {
      const eventLink = `${config.frontendUrl}/dashboard/events/${newEvent._id}`;
      sendEventCreationConfirmationToOrganizer(
        user.email,
        user.name || "Organizer",
        newEvent.title,
        eventLink,
        newEvent.sessionCode
      ).catch((err: any) => console.error("Organizer email error:", err));
    }

    await logActivity(userId, "Event Created", { eventId: newEvent._id, title: newEvent.title }, req);

    res.status(201).json({
      message: "Event created successfully",
      data: {
        id: newEvent._id,
        title: newEvent.title,
        sessionCode: newEvent.sessionCode,
        shareableLink: newEvent.shareableLink,
        status: newEvent.status
      }
    });
  } catch (error) {
    console.error("Event creation error:", error);
    res.status(500).json({ message: "Failed to create event session" });
  }
};

export const getMyEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const events = await Event.find({ organizerId: userId }).sort({ createdAt: -1 });
    console.log(`[EventController] User ${userId} fetched ${events.length} events`);
    res.status(200).json({ data: events });
  } catch (error) {
    console.error("Get my events error:", error);
    res.status(500).json({ message: "Failed to fetch events" });
  }
};

export const getAllEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const events = await Event.find({ visibility: 'public' }).sort({ createdAt: -1 });
    res.status(200).json({ data: events });
  } catch (error) {
    console.error("Get all events error:", error);
    res.status(500).json({ message: "Failed to fetch events" });
  }
};

export const getEventById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id).populate('speakers');

    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    const userId = (req as any).user?.id;

    // Check visibility permissions
    // Allow if:
    // 1. Event is Public
    // 2. User is the Organizer
    // 3. User is an Enrolled Attendee
    if (event.visibility === 'private') {
      const isOrganizer = event.organizerId.toString() === userId;
      const isEnrolled = event.attendees && event.attendees.map(a => a.toString()).includes(userId);

      if (!isOrganizer && !isEnrolled) {
        res.status(403).json({ message: "Access denied: Private event" });
        return;
      }
    }

    res.status(200).json({ data: event });
  } catch (error) {
    console.error("Get event by id error:", error);
    res.status(500).json({ message: "Failed to fetch event" });
  }
};

export const updateEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || "Unknown User";
    const userEmail = (req as any).user?.email || "unknown@email.com";
    const { _id, organizerId, createdAt, updatedAt, sessionCode, ...updateData } = req.body;

    const event = await Event.findById(id);

    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    // Verify event ownership (checked twice but safe)
    if (event.organizerId.toString() !== userId) {
      res.status(403).json({ message: "Unauthorized: You do not own this event" });
      return;
    }

    // Import audit logging service
    const { detectEventChanges, logEventChanges } = await import("../services/auditLog.service");

    // Prepare update data with proper Date objects
    const preparedUpdateData = { ...updateData };
    if (preparedUpdateData.startTime) {
      preparedUpdateData.startTime = new Date(preparedUpdateData.startTime);
    }
    if (preparedUpdateData.endTime) {
      preparedUpdateData.endTime = new Date(preparedUpdateData.endTime);
    }

    // Detect changes before updating
    const changes = detectEventChanges(event.toObject(), preparedUpdateData);

    // Update event
    Object.assign(event, preparedUpdateData);
    await event.save();

    // Log changes for admin audit trail
    if (changes.length > 0) {
      await logEventChanges(id, userId, userName, userEmail, changes, req);
    }

    res.status(200).json({ message: "Event updated successfully", data: event });
  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({ message: "Failed to update event" });
  }
};

export const deleteEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const event = await Event.findById(id);

    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (event.organizerId.toString() !== userId) {
      res.status(403).json({ message: "Unauthorized: You do not own this event" });
      return;
    }

    await Event.deleteOne({ _id: id });

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({ message: "Failed to delete event" });
  }
};


export const enrollEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const userEmail = (req as any).user?.email;
    const userName = (req as any).user?.name || "A user";

    const event = await Event.findById(id);

    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    // Check if already enrolled
    if (event.attendees && event.attendees.map(a => a.toString()).includes(userId)) {
      res.status(400).json({ message: "Already enrolled" });
      return;
    }

    // Add to attendees
    if (!event.attendees) {
      event.attendees = [];
    }
    event.attendees.push(userId);
    await event.save();

    // Notify Organizer
    try {
      sendNotification(event.organizerId.toString(), 'new_attendee', {
        eventId: event._id,
        eventTitle: event.title,
        userId: userId,
        userName: userName
      });
    } catch (notifError) {
      console.error("Notification error:", notifError);
      // Don't fail enrollment if notification fails
    }

    // Send Enrollment Confirmation Email
    if (userEmail) {
      try {
        const eventLink = event.shareableLink || `${config.frontendUrl}/events/${event._id}`;
        const sessionCode = event.sessionCode || event._id.toString().substring(0, 8).toUpperCase();

        await sendEnrollmentConfirmation(
          userEmail,
          userName,
          event.title,
          eventLink,
          sessionCode,
          event.startTime,
          event.endTime,
          event.timezone || "UTC",
          event.description,
          "Virtual - EventLive"
        );
        console.log(`Enrollment confirmation sent to ${userEmail}`);
      } catch (emailError) {
        console.error("Enrollment email error:", emailError);
        // Don't fail enrollment if email fails
      }
    }

    await logActivity(userId, "Event Enrollment", { eventId: id, title: event.title }, req);

    res.status(200).json({
      message: "Enrolled successfully",
      data: {
        eventId: id,
        userId,
        sessionCode: event.sessionCode || event._id.toString().substring(0, 8).toUpperCase(),
        eventLink: event.shareableLink || `${config.frontendUrl}/events/${event._id}`
      }
    });

  } catch (error) {
    console.error("Enrollment error:", error);
    res.status(500).json({ message: "Failed to enroll in event" });
  }
};

export const getEventAttendees = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id).populate('attendees', 'name email avatar _id');

    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    // Get session for duration check
    const session = await Session.findOne({ eventId: id });
    const result = [];

    if (event.attendees && Array.isArray(event.attendees)) {
      for (const attendee of (event.attendees as any[])) {
        let durationMinutes = 0;
        let status = 'Registered';

        if (session && session.participants) {
          const participation = session.participants.find((p: any) => p.userId.toString() === attendee._id.toString());
          if (participation) {
            status = 'Attended';
            const end = participation.leftAt ? new Date(participation.leftAt).getTime() : (session.status === 'ended' ? new Date(session.updatedAt).getTime() : Date.now());
            const start = new Date(participation.joinedAt).getTime();
            const diff = end - start;
            if (diff > 0) durationMinutes = Math.floor(diff / 60000);
          }
        }

        result.push({
          _id: attendee._id,
          name: attendee.name,
          email: attendee.email,
          avatar: attendee.avatar,
          eventId: event._id,
          eventTitle: event.title,
          enrolledAt: event.createdAt,
          status,
          durationMinutes
        });
      }
    }

    res.status(200).json({ data: result });
  } catch (error) {
    console.error("Get attendees error:", error);
    res.status(500).json({ message: "Failed to fetch attendees" });
  }
};

export const getEventAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);

    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    const session = await Session.findOne({ eventId: id });
    let attendanceRate = 0;
    let avgDuration = 0;
    let pollResponses = 0; // Using questionsAsked as proxy for now

    const totalRegistrations = event.attendees?.length || 0;
    let totalParticipants = 0;
    let totalDuration = 0;

    if (session && session.participants) {
      // Filter unique users if necessary, but participants array usually tracks unique active sessions or history.
      // Assuming unique entry per user per session for simplicity in basic analytics
      const uniqueParticipants = new Set();

      session.participants.forEach((p: any) => {
        // Count unique attendees
        if (!uniqueParticipants.has(p.userId.toString())) {
          uniqueParticipants.add(p.userId.toString());
          totalParticipants++;
        }

        const end = p.leftAt ? new Date(p.leftAt).getTime() : (session.status === 'ended' ? new Date(session.updatedAt).getTime() : Date.now());
        const start = new Date(p.joinedAt).getTime();
        const diff = end - start;
        if (diff > 0) totalDuration += diff;

        pollResponses += p.questionsAsked || 0;
      });
    }

    if (totalRegistrations > 0) {
      attendanceRate = Math.round((totalParticipants / totalRegistrations) * 100);
    }

    if (totalParticipants > 0) {
      avgDuration = Math.round((totalDuration / 60000) / totalParticipants);
    }

    const analytics = {
      registrations: totalRegistrations,
      attendanceRate,
      avgDuration,
      pollResponses
    };

    res.status(200).json({ data: analytics });

  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
};

export const getGlobalAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const events = await Event.find({ organizer: userId });

    if (!events.length) {
      res.status(200).json({
        data: {
          registrations: 0, attendanceRate: 0, avgDuration: 0, pollResponses: 0, totalEvents: 0
        }
      });
      return;
    }

    const eventIds = events.map(e => e._id);
    const sessions = await Session.find({ eventId: { $in: eventIds } });

    let totalRegistrations = 0;
    let totalParticipants = 0;
    let totalDurationMinutes = 0;
    let totalQuestions = 0;

    events.forEach(event => {
      totalRegistrations += event.attendees?.length || 0;
    });

    sessions.forEach(session => {
      if (session.participants) {
        const uniqueInSession = new Set();
        session.participants.forEach((p: any) => {
          if (!uniqueInSession.has(p.userId.toString())) {
            uniqueInSession.add(p.userId.toString());
            totalParticipants++;
          }
          const end = p.leftAt ? new Date(p.leftAt).getTime() : (session.status === 'ended' ? new Date(session.updatedAt).getTime() : Date.now());
          const start = new Date(p.joinedAt).getTime();
          const diff = end - start;
          if (diff > 0) totalDurationMinutes += diff / 60000;

          totalQuestions += p.questionsAsked || 0;
        });
      }
    });

    const attendanceRate = totalRegistrations > 0 ? Math.round((totalParticipants / totalRegistrations) * 100) : 0;
    const avgDuration = totalParticipants > 0 ? Math.round(totalDurationMinutes / totalParticipants) : 0;

    res.status(200).json({
      data: {
        registrations: totalRegistrations,
        attendanceRate,
        avgDuration,
        pollResponses: totalQuestions,
        totalEvents: events.length
      }
    });
  } catch (error) {
    console.error("Global analytics error:", error);
    res.status(500).json({ message: "Failed to fetch global analytics" });
  }
};

export const uploadCoverImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = (req as any).file;
    if (!file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const { getPublicUrl } = await import("../services/s3.service");
    let coverUrl: string;

    if (file.key) {
      // Prioritize key from S3/R2 upload and construct public URL
      coverUrl = getPublicUrl(file.key);
    } else if (file.location) {
      // Fallback to location if key is missing (unlikely with multer-s3)
      coverUrl = file.location;
    } else {
      // Local upload fallback
      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = process.env.BACKEND_URL || `${protocol}://${host}`;
      coverUrl = `${baseUrl}/public/uploads/events/covers/${file.filename}`;
    }

    res.status(200).json({
      message: "Cover uploaded successfully",
      url: coverUrl,
      filename: file.filename || file.key
    });

  } catch (error) {
    console.error("Upload cover error:", error);
    res.status(500).json({ message: "Failed to upload cover" });
  }
};

export const uploadLogoImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = (req as any).file;
    if (!file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const { getPublicUrl } = await import("../services/s3.service");
    let logoUrl: string;

    if (file.key) {
      logoUrl = getPublicUrl(file.key);
    } else if (file.location) {
      logoUrl = file.location;
    } else {
      // Construct public URL for logo
      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = process.env.BACKEND_URL || `${protocol}://${host}`;
      logoUrl = `${baseUrl}/public/uploads/events/logos/${file.filename}`;
    }

    res.status(200).json({
      message: "Logo uploaded successfully",
      url: logoUrl,
      filename: file.filename || file.key
    });

  } catch (error) {
    console.error("Upload logo error:", error);
    res.status(500).json({ message: "Failed to upload logo" });
  }
};

export const getEnrolledEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    // Find events where attendees array contains userId
    const events = await Event.find({ attendees: userId }).sort({ startTime: 1 });

    res.status(200).json({ data: events });
  } catch (error) {
    console.error("Get enrolled events error:", error);
    res.status(500).json({ message: "Failed to fetch enrolled events" });
  }
};

export const joinEventByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const userId = (req as any).user?.id;
    const userEmail = (req as any).user?.email;

    const event = await Event.findOne({ sessionCode: code }).populate('speakers');

    if (!event) {
      res.status(404).json({ message: "Invalid Session Code" });
      return;
    }

    // Auto-enroll authenticated users if not already enrolled
    if (userId && event.attendees && !event.attendees.map(a => a.toString()).includes(userId)) {
      event.attendees.push(userId);
      await event.save();
      console.log(`Auto-enrolled user ${userEmail} via session code`);
    }

    // Find or Create Session
    let session = await Session.findOne({ eventId: event._id });
    if (!session) {
      session = new Session({
        eventId: event._id,
        organizerId: event.organizerId,
        title: event.title,
        scheduledStartTime: event.startTime,
        duration: 60,
        status: 'scheduled',
        sessionCode: event.sessionCode,
        participants: []
      });
      await session.save();
    }

    // Validation for session status
    if (session.status === 'cancelled') {
      res.status(400).json({ message: "This session has been cancelled" });
      return;
    }

    res.status(200).json({
      message: "Successfully joined event",
      data: {
        event,
        session,
        isEnrolled: userId ? true : false
      }
    });

  } catch (error) {
    console.error("Join event by code error:", error);
    res.status(500).json({ message: "Failed to join event" });
  }
};

export const submitEventFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { feedback, rating, requestTranscript, requestRecording } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const event = await Event.findById(id);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    const attendee = await User.findById(userId);
    if (!attendee) {
      res.status(404).json({ message: "User not found" });
      console.log('User not found: ', userId);
      // Proceeding with name/email if user is not found is risky, usually we return.
      return;
    }

    // Find Organizer's Email
    const organizer = await User.findById(event.organizerId);
    // If organization is deleted, maybe send to admin?
    const organizerEmail = organizer?.email || process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

    if (organizerEmail) {
      await sendSessionFeedbackEmail(
        organizerEmail,
        attendee.name,
        attendee.email,
        event.title,
        feedback,
        { transcript: requestTranscript, recording: requestRecording }
      );
    }

    res.status(200).json({ message: "Feedback submitted successfully" });

  } catch (error) {
    console.error("Submit feedback error:", error);
    res.status(500).json({ message: "Failed to submit feedback" });
  }
};

export const getAllMyAttendees = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    // 1. Get all events for the organizer
    const events = await Event.find({ organizerId: userId })
      .populate('attendees', 'name email avatar _id')
      .sort({ createdAt: -1 })
      .lean();

    // 2. Get all sessions for these events to calculate duration
    const eventIds = events.map(e => e._id);
    const sessions = await Session.find({ eventId: { $in: eventIds } }).lean();

    // Map sessions by eventId for O(1) lookup
    const sessionMap = new Map();
    sessions.forEach(s => sessionMap.set(s.eventId.toString(), s));

    const allAttendees: any[] = [];

    for (const event of events) {
      const session = sessionMap.get(event._id.toString());

      if (event.attendees && Array.isArray(event.attendees)) {
        for (const attendee of (event.attendees as any[])) {
          let durationMinutes = 0;
          let status = 'Registered';
          // let joinedAt = null;

          if (session && session.participants) {
            const participation = session.participants.find((p: any) => p.userId.toString() === attendee._id.toString());
            if (participation) {
              status = 'Attended';
              // joinedAt = participation.joinedAt;

              const end = participation.leftAt ? new Date(participation.leftAt).getTime() : (session.status === 'ended' ? new Date(session.updatedAt).getTime() : Date.now());
              const start = new Date(participation.joinedAt).getTime();
              const diff = end - start;
              if (diff > 0) {
                durationMinutes = Math.floor(diff / 60000);
              }
            }
          }

          allAttendees.push({
            _id: attendee._id,
            name: attendee.name,
            email: attendee.email,
            avatar: attendee.avatar,
            eventId: event._id,
            eventTitle: event.title,
            eventCategory: event.category || "General",
            enrolledAt: event.createdAt, // using event creation as proxy if no enroll date
            status,
            durationMinutes
          });
        }
      }
    }

    res.status(200).json({ data: allAttendees });
  } catch (error) {
    console.error("Get all attendees error:", error);
    res.status(500).json({ message: "Failed to fetch attendees" });
  }
};

/**
 * Get change logs for a specific event (Admin only)
 */
export const getEventChangeLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const { getEventChangeLogs: fetchLogs } = await import("../services/auditLog.service");
    const logs = await fetchLogs(id, limit);

    res.status(200).json({ data: logs });
  } catch (error) {
    console.error("Get event change logs error:", error);
    res.status(500).json({ message: "Failed to fetch change logs" });
  }
};

/**
 * Get all change logs (Admin only)
 */
export const getAllEventChangeLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 500;

    const { getAllChangeLogs } = await import("../services/auditLog.service");
    const logs = await getAllChangeLogs(limit);

    res.status(200).json({ data: logs });
  } catch (error) {
    console.error("Get all change logs error:", error);
    res.status(500).json({ message: "Failed to fetch change logs" });
  }
};

/**
 * Get attendance logs for an event (Organizer only)
 */
export const getEventAttendanceLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const limit = parseInt(req.query.limit as string) || 500;

    // Verify event ownership
    const event = await Event.findById(id);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (event.organizerId.toString() !== userId) {
      res.status(403).json({ message: "Unauthorized: You do not own this event" });
      return;
    }

    const { getEventAttendanceLogs: fetchLogs } = await import("../services/attendance.service");
    const logs = await fetchLogs(id, limit);

    res.status(200).json({ data: logs });
  } catch (error) {
    console.error("Get event attendance logs error:", error);
    res.status(500).json({ message: "Failed to fetch attendance logs" });
  }
};

/**
 * Get attendance statistics for an event (Organizer only)
 */
export const getEventAttendanceStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    // Verify event ownership
    const event = await Event.findById(id);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (event.organizerId.toString() !== userId) {
      res.status(403).json({ message: "Unauthorized: You do not own this event" });
      return;
    }

    const { getEventAttendanceStats: fetchStats } = await import("../services/attendance.service");
    const stats = await fetchStats(id);

    res.status(200).json({ data: stats });
  } catch (error) {
    console.error("Get event attendance stats error:", error);
    res.status(500).json({ message: "Failed to fetch attendance statistics" });
  }
};

/**
 * Send session link to all attendees (Organizer only)
 */
export const sendSessionLinkToAttendees = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const { sessionLink, sessionCode } = req.body;

    if (!sessionLink || !sessionCode) {
      res.status(400).json({ message: "Session link and code are required" });
      return;
    }

    // Verify event ownership
    const event = await Event.findById(id).populate("attendees", "name email");
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (event.organizerId.toString() !== userId) {
      res.status(403).json({ message: "Unauthorized: You do not own this event" });
      return;
    }

    // Prepare attendee list
    const attendees = (event.attendees || []).map((a: any) => ({
      email: a.email,
      name: a.name,
    }));

    // Send emails
    const { bulkSendSessionLinks } = await import("../services/mail.service");
    const results = await bulkSendSessionLinks(
      attendees,
      event.title,
      sessionLink,
      sessionCode,
      event.startTime,
      event.timezone || "UTC"
    );

    res.status(200).json({
      message: "Session links sent successfully",
      data: results,
    });
  } catch (error) {
    console.error("Send session link error:", error);
    res.status(500).json({ message: "Failed to send session links" });
  }
};

/**
 * Send event reminder to all attendees (Organizer only)
 */
export const sendEventReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    // Verify event ownership
    const event = await Event.findById(id).populate("attendees", "name email");
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (event.organizerId.toString() !== userId) {
      res.status(403).json({ message: "Unauthorized: You do not own this event" });
      return;
    }

    const eventLink = `${process.env.FRONTEND_URL}/events/${event._id}`;
    const { sendEventReminderEmail } = await import("../services/mail.service");

    let sent = 0;
    let failed = 0;

    for (const attendee of (event.attendees || []) as any[]) {
      try {
        await sendEventReminderEmail(
          attendee.email,
          attendee.name,
          event.title,
          eventLink,
          event.startTime,
          event.timezone || "UTC"
        );
        sent++;
        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        console.error(`Failed to send reminder to ${(attendee.userId as any).email}:`, error);
      }
    }

    res.status(200).json({
      message: "Event reminders sent",
      data: { sent, failed },
    });
  } catch (error) {
    console.error("Send event reminder error:", error);
    res.status(500).json({ message: "Failed to send event reminders" });
  }
};

/**
 * Send custom email to attendees (Organizer only)
 */
export const sendCustomEmailToAttendees = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const { subject, message, attendeeEmails } = req.body;

    if (!subject || !message) {
      res.status(400).json({ message: "Subject and message are required" });
      return;
    }

    // Verify event ownership
    const event = await Event.findById(id).populate("attendees", "name email");
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (event.organizerId.toString() !== userId) {
      res.status(403).json({ message: "Unauthorized: You do not own this event" });
      return;
    }

    // Filter attendees if specific emails provided
    let recipients = (event.attendees || []).map((a: any) => ({
      email: a.email,
      name: a.name,
    }));

    if (attendeeEmails && attendeeEmails.length > 0) {
      recipients = recipients.filter((r: any) => attendeeEmails.includes(r.email));
    }

    // Send custom emails (using mail service for consistency)
    const { sendAttendeeEmail } = await import("../services/mail.service");

    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        const emailContent = `Hello ${recipient.name},\n\n${message}`;
        await sendAttendeeEmail(
          recipient.email,
          subject,
          emailContent
        );
        sent++;
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        console.error(`Failed to send custom email to ${recipient.email}:`, error);
      }
    }

    res.status(200).json({
      message: "Custom emails sent",
      data: { sent, failed, total: recipients.length },
    });
  } catch (error) {
    console.error("Send custom email error:", error);
    res.status(500).json({ message: "Failed to send custom emails" });
  }
};

