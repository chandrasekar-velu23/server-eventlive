import { Request, Response } from 'express';
import crypto from 'crypto';
import Session, { ISession, IParticipantSession } from '../models/session.model';
import ChatMessage from '../models/chatMessage.model';
import Poll from '../models/poll.model';
import Question from '../models/question.model';
import { uploadFile } from '../services/s3.service';
import Event from '../models/event.model';
import { sendSessionStartedEmail } from '../services/mail.service';
import { logActivity } from '../services/activityLog.service';

/**
 * Create a new session for an event
 */
export const createSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, title, description, scheduledStartTime, duration, settings } = req.body;
    const userId = req.user?.userId;

    if (!eventId || !title || !scheduledStartTime || !duration) {
      res.status(400).json({
        message: 'Missing required fields: eventId, title, scheduledStartTime, duration',
      });
      return;
    }

    const sessionCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const session = new Session({
      eventId,
      sessionCode,
      organizerId: userId,
      title,
      description,
      scheduledStartTime,
      duration,
      requireApproval: settings?.requireApproval || false,
      allowRecording: settings?.allowRecording !== false,
      chatEnabled: settings?.chatEnabled !== false,
      pollsEnabled: settings?.pollsEnabled !== false,
      qaEnabled: settings?.qaEnabled !== false,
      participants: [
        {
          userId,
          role: 'organizer',
          joinedAt: new Date(),
          isMuted: false,
          videoEnabled: false,
          screenshareActive: false,
          reactions: [],
          handRaised: false,
          questionsAsked: 0,
        },
      ],
    });

    await session.save();

    await logActivity(userId as string, "Session Created", { sessionId: session._id, title: session.title }, req);

    res.status(201).json({
      message: 'Session created successfully',
      data: session,
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ message: 'Failed to create session', error });
  }
};

/**
 * Get session details
 */
export const getSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId)
      .populate('organizerId', 'name email avatar')
      .populate('participants.userId', 'name email avatar');

    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    res.status(200).json({
      message: 'Session retrieved successfully',
      data: session,
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ message: 'Failed to retrieve session', error });
  }
};

/**
 * Update session details
 */
export const updateSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { title, description, scheduledStartTime, duration, settings } = req.body;

    const session = await Session.findByIdAndUpdate(
      sessionId,
      {
        title,
        description,
        scheduledStartTime,
        duration,
        requireApproval: settings?.requireApproval,
        allowRecording: settings?.allowRecording,
        chatEnabled: settings?.chatEnabled,
        pollsEnabled: settings?.pollsEnabled,
        qaEnabled: settings?.qaEnabled,
      },
      { new: true }
    );

    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    res.status(200).json({
      message: 'Session updated successfully',
      data: session,
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ message: 'Failed to update session', error });
  }
};

/**
 * Delete session
 */
export const deleteSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    // Delete all related data
    await Promise.all([
      Session.findByIdAndDelete(sessionId),
      ChatMessage.deleteMany({ sessionId }),
      Poll.deleteMany({ sessionId }),
      Question.deleteMany({ sessionId }),
    ]);

    res.status(200).json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ message: 'Failed to delete session', error });
  }
};

/**
 * Join a session
 */
export const joinSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;
    const userName = req.user?.name || "Unknown User";
    const userEmail = req.user?.email || "unknown@email.com";
    const { role = 'attendee' } = req.body;

    const session = await Session.findById(sessionId);
    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    // Check if user already joined
    const existingParticipant = session.participants.find(
      (p) => p.userId.toString() === userId
    );

    if (existingParticipant) {
      res.status(400).json({ message: 'User already joined this session' });
      return;
    }

    // Check participant limit
    if (session.maxParticipants && session.participants.length >= session.maxParticipants) {
      res.status(400).json({ message: 'Session is at maximum capacity' });
      return;
    }

    // Add participant
    const newParticipant: IParticipantSession = {
      userId,
      joinedAt: new Date(),
      role: role as any,
      isMuted: true,
      videoEnabled: false,
      screenshareActive: false,
      reactions: [],
      handRaised: false,
      questionsAsked: 0,
    };

    session.participants.push(newParticipant);
    await session.save();

    // Log attendance check-in
    try {
      const { logCheckIn } = await import("../services/attendance.service");
      await logCheckIn({
        eventId: session.eventId.toString(),
        sessionId: sessionId,
        userId,
        userEmail,
        userName,
        req
      });
    } catch (logError) {
      console.error("Failed to log check-in:", logError);
      // Don't fail the join if logging fails
    }

    await logActivity(userId as string, "Session Joined", { sessionId, title: session.title }, req);

    res.status(200).json({
      message: 'Successfully joined session',
      data: session,
    });
  } catch (error) {
    console.error('Join session error:', error);
    res.status(500).json({ message: 'Failed to join session', error });
  }
};

/**
 * Leave session
 */
export const leaveSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    const session = await Session.findById(sessionId);
    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    // Find and update participant
    const participantIndex = session.participants.findIndex(
      (p) => p.userId.toString() === userId
    );

    if (participantIndex === -1) {
      res.status(400).json({ message: 'User is not in this session' });
      return;
    }

    session.participants[participantIndex].leftAt = new Date();
    await session.save();

    // Log attendance check-out
    try {
      const { logCheckOut } = await import("../services/attendance.service");
      await logCheckOut({
        sessionId,
        userId
      });
    } catch (logError) {
      console.error("Failed to log check-out:", logError);
      // Don't fail the leave if logging fails
    }

    await logActivity(userId as string, "Session Left", { sessionId, title: session.title }, req);

    res.status(200).json({ message: 'Successfully left session' });
  } catch (error) {
    console.error('Leave session error:', error);
    res.status(500).json({ message: 'Failed to leave session', error });
  }
};

/**
 * Get session participants
 */
export const getParticipants = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId)
      .populate('participants.userId', 'name email avatar');

    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    res.status(200).json({
      message: 'Participants retrieved successfully',
      data: session.participants,
    });
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ message: 'Failed to retrieve participants', error });
  }
};

/**
 * Start session (change status to live)
 */
export const startSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findByIdAndUpdate(
      sessionId,
      {
        status: 'live',
        actualStartTime: new Date(),
      },
      { new: true }
    );

    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    // Send email notifications to all attendees
    try {
      const event = await Event.findById(session.eventId).populate('attendees');
      if (event && event.attendees && event.attendees.length > 0) {
        const joinLink = `${process.env.FRONTEND_URL}/join/${session.sessionCode}`;

        // Send asynchronously
        event.attendees.forEach(async (attendee: any) => {
          if (attendee.email) {
            await sendSessionStartedEmail(attendee.email, attendee.name || 'Attendee', session.title, joinLink);
          }
        });
      }
    } catch (emailError) {
      console.error("Failed to send session started emails:", emailError);
    }

    await logActivity(req.user?.userId as string, "Session Started", { sessionId, title: session.title }, req);

    res.status(200).json({
      message: 'Session started successfully',
      data: session,
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ message: 'Failed to start session', error });
  }
};

/**
 * End session
 */
export const endSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findByIdAndUpdate(
      sessionId,
      {
        status: 'ended',
        actualEndTime: new Date(),
      },
      { new: true }
    );

    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    await logActivity(req.user?.userId as string, "Session Ended", { sessionId, title: session.title }, req);

    res.status(200).json({
      message: 'Session ended successfully',
      data: session,
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ message: 'Failed to end session', error });
  }
};

/**
 * Mute participant
 */
export const muteParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, userId } = req.params;

    const session = await Session.findById(sessionId);
    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    const participant = session.participants.find((p) => p.userId.toString() === userId);
    if (!participant) {
      res.status(404).json({ message: 'Participant not found' });
      return;
    }

    participant.isMuted = true;
    await session.save();

    res.status(200).json({
      message: 'Participant muted successfully',
      data: participant,
    });
  } catch (error) {
    console.error('Mute participant error:', error);
    res.status(500).json({ message: 'Failed to mute participant', error });
  }
};

/**
 * Unmute participant
 */
export const unmuteParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, userId } = req.params;

    const session = await Session.findById(sessionId);
    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    const participant = session.participants.find((p) => p.userId.toString() === userId);
    if (!participant) {
      res.status(404).json({ message: 'Participant not found' });
      return;
    }

    participant.isMuted = false;
    await session.save();

    res.status(200).json({
      message: 'Participant unmuted successfully',
      data: participant,
    });
  } catch (error) {
    console.error('Unmute participant error:', error);
    res.status(500).json({ message: 'Failed to unmute participant', error });
  }
};

/**
 * Remove participant from session
 */
export const removeParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, userId } = req.params;

    const session = await Session.findById(sessionId);
    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    session.participants = session.participants.filter(
      (p) => p.userId.toString() !== userId
    );

    await session.save();

    res.status(200).json({ message: 'Participant removed successfully' });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ message: 'Failed to remove participant', error });
  }
};

/**
 * Get session chat history
 */
export const getChatHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const messages = await ChatMessage.find({ sessionId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'name avatar')
      .populate('mentions', 'name');

    const total = await ChatMessage.countDocuments({ sessionId });

    res.status(200).json({
      message: 'Chat history retrieved successfully',
      data: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ message: 'Failed to retrieve chat history', error });
  }
};

/**
 * Get attendance logs for a session
 */
export const getSessionAttendanceLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const { getSessionAttendanceLogs: fetchLogs } = await import("../services/attendance.service");
    const logs = await fetchLogs(sessionId);

    res.status(200).json({
      message: 'Attendance logs retrieved successfully',
      data: logs
    });
  } catch (error) {
    console.error('Get session attendance logs error:', error);
    res.status(500).json({ message: 'Failed to retrieve attendance logs', error });
  }
};

/**
 * Get attendance statistics for a session
 */
export const getSessionAttendanceStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId);
    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    const { getEventAttendanceStats } = await import("../services/attendance.service");
    const stats = await getEventAttendanceStats(session.eventId.toString());

    res.status(200).json({
      message: 'Attendance statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('Get session attendance stats error:', error);
    res.status(500).json({ message: 'Failed to retrieve attendance statistics', error });
  }
};

/**
 * Manual check-in (for organizer to mark attendance)
 */
export const manualCheckIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { userId, userName, userEmail } = req.body;

    if (!userId || !userName || !userEmail) {
      res.status(400).json({ message: 'Missing required fields: userId, userName, userEmail' });
      return;
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    const { logCheckIn } = await import("../services/attendance.service");
    const log = await logCheckIn({
      eventId: session.eventId.toString(),
      sessionId,
      userId,
      userEmail,
      userName,
      req
    });

    res.status(200).json({
      message: 'Check-in logged successfully',
      data: log
    });
  } catch (error) {
    console.error('Manual check-in error:', error);
    res.status(500).json({ message: 'Failed to log check-in', error });
  }
};

/**
 * Manual check-out (for organizer to mark attendance)
 */
export const manualCheckOut = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ message: 'Missing required field: userId' });
      return;
    }

    const { logCheckOut } = await import("../services/attendance.service");
    const log = await logCheckOut({
      sessionId,
      userId
    });

    res.status(200).json({
      message: 'Check-out logged successfully',
      data: log
    });
  } catch (error) {
    console.error('Manual check-out error:', error);
    res.status(500).json({ message: 'Failed to log check-out', error });
  }
};

/**
 * Upload session recording
 */
export const uploadRecording = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!req.file) {
      res.status(400).json({ message: 'No recording file provided' });
      return;
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    // Upload to R2
    const fileKey = `recordings/${sessionId}/${Date.now()}-${req.file.originalname}`;
    // Assuming mimetype is correct
    const fileUrl = await uploadFile(req.file, fileKey, req.file.mimetype);

    // Update session with recording URL
    session.recordingUrl = fileUrl;
    session.recordingStatus = 'processed';
    await session.save();

    // Log the action
    try {
      const { logAction } = await import("../services/auditLog.service");
      await logAction({
        userId: req.user?.userId || 'system',
        action: 'RECORDING_UPLOAD',
        resourceId: sessionId,
        resourceType: 'SESSION',
        details: { fileUrl }
      });
    } catch (e) {
      console.error("Failed to audit log recording upload", e);
    }

    res.status(200).json({
      message: 'Recording uploaded successfully',
      data: { url: fileUrl }
    });
  } catch (error) {
    console.error('Upload recording error:', error);
    res.status(500).json({ message: 'Failed to upload recording', error });
  }
};

