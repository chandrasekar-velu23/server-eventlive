import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import Session, { ISession, IParticipant } from '../models/session.model';
import ChatMessage from '../models/chatMessage.model';
import Poll from '../models/poll.model';
import Question from '../models/question.model';
import { hasPermission, ROLE_PERMISSIONS } from '../middleware/rbac.middleware';
import { logCheckIn, logCheckOut } from './attendance.service';
import ActivityLog from '../models/activityLog.model';

/**
 * Real-Time Event Handlers for WebSocket
 * Manages all live session communication
 */

// Global reference for external use
let notificationNamespace: any;

export const sendNotification = (userId: string, type: string, payload: any) => {
  if (notificationNamespace) {
    notificationNamespace.to(userId).emit('notification', {
      type,
      ...payload,
      timestamp: new Date(),
    });
  }
};

// Helper to send stats update
export const sendStatsUpdate = (userId: string, payload: any) => {
  if (notificationNamespace) {
    notificationNamespace.to(userId).emit('stats-update', {
      ...payload,
      timestamp: new Date(),
    });
  }
};

export const initializeWebSocket = (io: Server) => {
  // Notification Namespace (Scoped to User ID rooms)
  notificationNamespace = io.of('/notifications');

  notificationNamespace.use(async (socket: Socket, next: any) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication token required'));

      const decoded = jwt.verify(token, config.jwtSecret) as any;
      socket.data.user = decoded;
      next();
    } catch (e) {
      console.error("WS Auth Error:", e);
      // Allow connection for dev if token is present but invalid/expired to prevent crash loop, 
      // OR better, just return error. Returning error is compliant.
      // But to be safe let's check if it's a "live" request.
      next(new Error('Auth failed'));
    }
  });

  notificationNamespace.on('connection', (socket: Socket) => {
    const userId = socket.data.user?.userId || socket.data.user?.id;
    if (userId) {
      socket.join(userId); // Join personal room
      console.log(`🔔 User joined notification stream: ${userId}`);
    }
  });


  // Namespace for sessions
  const sessionNamespace = io.of('/session');

  sessionNamespace.use(async (socket: Socket, next: (err?: any) => void) => {
    try {
      // Validate user token
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, config.jwtSecret) as any;
      socket.data.user = decoded;

      next();
    } catch (error) {
      console.error("Session WS Auth Error:", error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  sessionNamespace.on('connection', (socket: Socket) => {
    const userId = socket.data.user?.userId || socket.data.user?.id;
    if (userId) {
      socket.join(userId);
    }
    console.log(`✅ User connected to session NS: ${userId}`);

    /**
     * SESSION EVENTS
     */

    socket.on('join-session', async (data: any) => {
      try {
        const { sessionId } = data;
        const userId = socket.data.user?.userId;

        if (!sessionId || !userId) {
          socket.emit('error', { message: 'Missing sessionId or userId' });
          return;
        }

        // Join Socket.io room
        socket.join(sessionId);

        // Track which sessions this socket has joined (for clean disconnect)
        if (!socket.data.joinedSessions) socket.data.joinedSessions = [];
        if (!socket.data.joinedSessions.includes(sessionId)) {
          socket.data.joinedSessions.push(sessionId);
        }

        // Add participant to database
        const session = await Session.findById(sessionId);
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        // Check session is not ended
        if (session.status === 'ended' || session.status === 'cancelled') {
          socket.emit('error', { message: 'Session has already ended' });
          return;
        }

        let role: string = 'attendee';
        const existingParticipant = session.participants.find(
          (p: IParticipant) => p.userId.toString() === userId
        );

        if (existingParticipant) {
          // Update leftAt to null in case they re-joined
          existingParticipant.leftAt = undefined;
          role = existingParticipant.role;
          await session.save();
        } else {
          // Check if organizer
          role = session.organizerId.toString() === userId ? 'organizer' : 'attendee';

          session.participants.push({
            userId,
            joinedAt: new Date(),
            role: role as any,
            isMuted: true,
            videoEnabled: false,
            screenshareActive: false,
            reactions: [],
            handRaised: false,
            questionsAsked: 0,
          });

          await session.save();
        }

        // Cache role + permissions in socket.data to avoid DB lookup on every event
        socket.data.sessionRole = role;
        socket.data.sessionPermissions = role === 'organizer'
          ? '*'  // all
          : (ROLE_PERMISSIONS[role] || []);
        socket.data.currentSessionId = sessionId;

        // Broadcast to room
        sessionNamespace.to(sessionId).emit('participant-joined', {
          userId,
          userName: socket.data.user?.name,
          userAvatar: socket.data.user?.avatar,
          role,
          participantCount: session.participants.filter((p: IParticipant) => !p.leftAt).length,
          timestamp: new Date(),
        });

        // Trigger Analytics Update for Organizer
        if (session.organizerId) {
          sendStatsUpdate(session.organizerId.toString(), {
            type: 'attendance',
            eventId: session.eventId,
            sessionId: session._id,
            delta: 1,
            total: session.participants.filter((p: IParticipant) => !p.leftAt).length
          });
        }

        // Log Check-in
        try {
          await logCheckIn({
            eventId: session.eventId.toString(),
            sessionId,
            userId,
            userEmail: socket.data.user?.email || "",
            userName: socket.data.user?.name || "Unknown",
          });
        } catch (logError) {
          console.error("Failed to log check-in in WS:", logError);
        }

        socket.emit('session-joined', {
          message: 'Successfully joined session',
          participants: session.participants.filter((p: IParticipant) => !p.leftAt).length,
          role,
          sessionCode: session.sessionCode,
          sessionSettings: {
            chatEnabled: session.chatEnabled,
            pollsEnabled: session.pollsEnabled,
            qaEnabled: session.qaEnabled,
            allowRecording: session.allowRecording,
          }
        });
      } catch (error) {
        console.error('Join session error:', error);
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    socket.on('leave-session', async (data) => {
      try {
        const { sessionId } = data;
        const userId = socket.data.user?.userId;

        // Leave Socket.io room
        socket.leave(sessionId);

        // Update participant in database
        const session = await Session.findById(sessionId);
        if (session) {
          const participant = session.participants.find(
            (p: IParticipant) => p.userId.toString() === userId
          );
          if (participant) {
            participant.leftAt = new Date();
            await session.save();
          }
        }

        // Broadcast to room
        sessionNamespace.to(sessionId).emit('participant-left', {
          userId,
          userName: socket.data.user?.name,
          participantCount: session?.participants.length || 0,
          timestamp: new Date(),
        });

        // Trigger Analytics Update for Organizer
        if (session && session.organizerId) {
          sendStatsUpdate(session.organizerId.toString(), {
            type: 'attendance',
            eventId: session.eventId,
            sessionId: session._id,
            delta: -1,
            total: session.participants.length
          });
        }

        // Log Check-out
        try {
          await logCheckOut({
            sessionId,
            userId,
          });
        } catch (logError) {
          console.error("Failed to log check-out in WS:", logError);
        }
      } catch (error) {
        console.error('Leave session error:', error);
      }
    });

    socket.on('end-session', async (data) => {
      try {
        const { sessionId } = data;
        const userId = socket.data.user?.userId;

        // Validate Moderator/Host permission
        // For now assuming only specific roles or if user is organizer check. 
        // Better to use RBAC middleware function if available or check session ownership.
        // Let's check session ownership for safety first.
        const session = await Session.findById(sessionId);
        if (!session) return;

        if (session.organizerId.toString() !== userId) {
          socket.emit('error', { message: 'Only the organizer can end the session' });
          return;
        }

        // Update Session
        session.status = 'ended';
        session.actualEndTime = new Date();
        // Mark all active participants as left
        session.participants.forEach(p => {
          if (!p.leftAt) p.leftAt = new Date();
        });
        await session.save();

        // Broadcast to room
        sessionNamespace.to(sessionId).emit('session-ended', {
          endedBy: userId,
          timestamp: new Date()
        });

        // Stats update for organizer (redundant since they ended it, but for consistency)
        sendStatsUpdate(userId, {
          type: 'session_ended',
          eventId: session.eventId,
          sessionId: session._id
        });

        // Log Activity
        await ActivityLog.create({
          user: userId,
          action: "SESSION_ENDED",
          details: { sessionId },
          ip: socket.handshake.address
        });

      } catch (error) {
        console.error('End session error:', error);
        socket.emit('error', { message: 'Failed to end session' });
      }
    });

    /**
     * CHAT EVENTS
     */

    socket.on('send-message', async (data) => {
      try {
        const { sessionId, content } = data;
        const userId = socket.data.user?.userId;

        if (!content || !content.trim()) {
          socket.emit('error', { message: 'Message content cannot be empty' });
          return;
        }

        if (content.length > 2000) {
          socket.emit('error', { message: 'Message too long (max 2000 chars)' });
          return;
        }

        // Use cached permissions first, fall back to DB check
        const canSend = socket.data.sessionPermissions === '*' ||
          (Array.isArray(socket.data.sessionPermissions) && socket.data.sessionPermissions.includes('send_chat_message')) ||
          await hasPermission(userId, sessionId, 'send_chat_message');

        if (!canSend) {
          socket.emit('error', { message: 'Permission denied: cannot send messages' });
          return;
        }

        // Create message
        const message = new ChatMessage({
          sessionId,
          senderId: userId,
          senderName: socket.data.user?.name,
          content: content.trim(),
          messageType: 'text',
        });

        await message.save();

        // Broadcast to room
        sessionNamespace.to(sessionId).emit('new-message', {
          _id: message._id.toString(),
          senderId: userId,
          senderName: socket.data.user?.name,
          senderAvatar: socket.data.user?.avatar,
          content: message.content,
          messageType: 'text',
          timestamp: message.createdAt,
        });

        socket.emit('message-sent', { messageId: message._id.toString() });
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('delete-message', async (data) => {
      try {
        const { sessionId, messageId } = data;
        const userId = socket.data.user?.userId;

        // Check if user is message sender or moderator
        const message = await ChatMessage.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        const isSender = message.senderId.toString() === userId;
        const isModerator = await hasPermission(userId, sessionId, 'delete_message');

        if (!isSender && !isModerator) {
          socket.emit('error', { message: 'Permission denied' });
          return;
        }

        await ChatMessage.findByIdAndDelete(messageId);

        // Broadcast deletion
        sessionNamespace.to(sessionId).emit('message-deleted', { messageId });
      } catch (error) {
        console.error('Delete message error:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    /**
     * POLL EVENTS
     */

    // Host creates a new poll
    socket.on('create-poll', async (data) => {
      try {
        const { sessionId, question, options } = data;
        const userId = socket.data.user?.userId;

        // Only organizer/moderator can create polls
        const canCreate = socket.data.sessionPermissions === '*' ||
          await hasPermission(userId, sessionId, 'manage_polls');

        if (!canCreate) {
          socket.emit('error', { message: 'Only the host can create polls' });
          return;
        }

        if (!question || !question.trim()) {
          socket.emit('error', { message: 'Poll question is required' });
          return;
        }

        const validOptions = (options as string[]).filter(o => o && o.trim());
        if (validOptions.length < 2) {
          socket.emit('error', { message: 'At least 2 options are required' });
          return;
        }

        const poll = new Poll({
          sessionId,
          createdBy: userId,
          question: question.trim(),
          options: validOptions.map((text, index) => ({ id: index, text: text.trim(), votes: 0 })),
          isActive: true,
          totalVotes: 0,
          respondents: [],
        });

        await poll.save();

        // Broadcast new poll to all in session
        sessionNamespace.to(sessionId).emit('new-poll', {
          _id: poll._id.toString(),
          question: poll.question,
          options: poll.options,
          isActive: true,
          totalVotes: 0,
          createdBy: userId,
        });

        socket.emit('poll-created', { pollId: poll._id.toString() });

        await ActivityLog.create({
          user: userId,
          action: 'POLL_CREATED',
          details: { sessionId, pollId: poll._id },
          ip: socket.handshake.address
        }).catch(() => { });

      } catch (error) {
        console.error('Create poll error:', error);
        socket.emit('error', { message: 'Failed to create poll' });
      }
    });

    socket.on('vote-poll', async (data) => {
      try {
        // Support both 'answer' (single int) and 'answers' (array) for compatibility
        const { sessionId, pollId, answers: rawAnswers, answer } = data;
        const answers: number[] = Array.isArray(rawAnswers) ? rawAnswers : [answer];
        const userId = socket.data.user?.userId;

        // Validate permission
        const hasPermissions = await hasPermission(userId, sessionId, 'respond_to_poll');
        if (!hasPermissions) {
          socket.emit('error', { message: 'Permission denied' });
          return;
        }

        const poll = await Poll.findById(pollId);
        if (!poll) {
          socket.emit('error', { message: 'Poll not found' });
          return;
        }

        // Check if already voted
        const existingVote = poll.respondents.find(
          (r) => r.userId.toString() === userId
        );

        if (existingVote) {
          // Update existing vote
          existingVote.answers = answers;
          existingVote.votedAt = new Date();
        } else {
          // Add new vote
          poll.respondents.push({
            userId,
            answers,
            votedAt: new Date(),
          });
        }

        await poll.save();

        // Calculate results
        const results = poll.options.map((option, index) => ({
          id: option.id,
          text: option.text,
          votes: poll.respondents.filter((r) =>
            r.answers.includes(index)
          ).length,
        }));

        // Broadcast poll update
        sessionNamespace.to(sessionId).emit('poll-updated', {
          pollId,
          results,
          respondentCount: poll.respondents.length,
        });

        // Analytics Update for Poll Response
        const session = await Session.findById(sessionId);
        if (session && session.organizerId) {
          sendStatsUpdate(session.organizerId.toString(), {
            type: 'poll_response',
            eventId: session.eventId,
            sessionId: sessionId,
            pollId
          });
        }

        // Log Activity
        await ActivityLog.create({
          user: userId,
          action: "POLL_RESPONSE",
          details: {
            sessionId,
            pollId,
            answersCount: answers.length
          },
          ip: socket.handshake.address
        });

        socket.emit('poll-voted', { pollId });
      } catch (error) {
        console.error('Vote poll error:', error);
        socket.emit('error', { message: 'Failed to vote' });
      }
    });

    /**
     * QUESTION/Q&A EVENTS
     */

    /**
     * Q&A UPVOTE (was missing)
     */
    socket.on('upvote-question', async (data) => {
      try {
        const { sessionId, questionId } = data;
        const userId = socket.data.user?.userId;

        const question = await Question.findById(questionId);
        if (!question) {
          socket.emit('error', { message: 'Question not found' });
          return;
        }

        // Toggle upvote
        const upvotes: string[] = (question as any).upvotes || [];
        const idx = upvotes.indexOf(userId);
        if (idx === -1) {
          upvotes.push(userId);
        } else {
          upvotes.splice(idx, 1);
        }
        (question as any).upvotes = upvotes;
        await question.save();

        // Broadcast updated upvote list
        sessionNamespace.to(sessionId).emit('question-upvoted', {
          questionId: question._id.toString(),
          upvotes,
        });

        socket.emit('question-upvoted', { questionId: question._id.toString(), upvotes });

      } catch (error) {
        console.error('Upvote question error:', error);
        socket.emit('error', { message: 'Failed to upvote question' });
      }
    });

    socket.on('ask-question', async (data) => {
      try {
        const { sessionId, content } = data;
        const userId = socket.data.user?.userId;

        // Validate permission
        const hasPermissions = await hasPermission(userId, sessionId, 'ask_question');
        if (!hasPermissions) {
          socket.emit('error', { message: 'Permission denied' });
          return;
        }

        // Create question
        const question = new Question({
          sessionId,
          askedBy: userId,
          content: content.trim(),
        });

        await question.save();

        // Broadcast new question
        sessionNamespace.to(sessionId).emit('new-question', {
          _id: question._id,
          askedBy: userId,
          askedByName: socket.data.user?.name,
          content: question.content,
          timestamp: question.createdAt,
        });

        // Log Activity
        await ActivityLog.create({
          user: userId,
          action: "QUESTION_ASKED",
          details: {
            sessionId,
            questionId: question._id,
            contentLength: question.content.length
          },
          ip: socket.handshake.address
        });

        socket.emit('question-asked', { questionId: question._id });
      } catch (error) {
        console.error('Ask question error:', error);
        socket.emit('error', { message: 'Failed to ask question' });
      }
    });

    socket.on('answer-question', async (data) => {
      try {
        const { sessionId, questionId, answer } = data;
        const userId = socket.data.user?.userId;

        // Validate permission
        const hasPermissions = await hasPermission(userId, sessionId, 'answer_question');
        if (!hasPermissions) {
          socket.emit('error', { message: 'Permission denied' });
          return;
        }

        const question = await Question.findByIdAndUpdate(
          questionId,
          {
            isAnswered: true,
            answeredBy: userId,
            answer,
          },
          { new: true }
        );

        if (!question) {
          socket.emit('error', { message: 'Question not found' });
          return;
        }

        // Broadcast question answered
        sessionNamespace.to(sessionId).emit('question-answered', {
          questionId,
          answer,
          answeredBy: socket.data.user?.name,
        });

        socket.emit('answer-submitted', { questionId });
      } catch (error) {
        console.error('Answer question error:', error);
        socket.emit('error', { message: 'Failed to answer question' });
      }
    });

    /**
     * REACTION EVENTS
     */

    socket.on('send-reaction', (data) => {
      try {
        const { sessionId, emoji } = data;
        const userId = socket.data.user?.userId;

        // Broadcast reaction to room
        sessionNamespace.to(sessionId).emit('participant-reaction', {
          userId,
          userName: socket.data.user?.name,
          emoji,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Send reaction error:', error);
        socket.emit('error', { message: 'Failed to send reaction' });
      }
    });

    /**
     * MEDIA CONTROL EVENTS
     */

    socket.on('update-media-state', async (data) => {
      try {
        const { sessionId, isMuted, videoEnabled } = data;
        const userId = socket.data.user?.userId;

        // Update participant state
        const session = await Session.findById(sessionId);
        if (session) {
          const participant = session.participants.find(
            (p: IParticipant) => p.userId.toString() === userId
          );
          if (participant) {
            if (isMuted !== undefined) participant.isMuted = isMuted;
            if (videoEnabled !== undefined) participant.videoEnabled = videoEnabled;
            await session.save();
          }
        }

        // Broadcast media state change
        sessionNamespace.to(sessionId).emit('participant-media-changed', {
          userId,
          isMuted,
          videoEnabled,
        });
      } catch (error) {
        console.error('Update media state error:', error);
      }
    });

    /**
     * WEBRTC SIGNALING EVENTS
     */

    socket.on('webrtc-offer', (data) => {
      const { sessionId, to, offer } = data;
      // If 'to' is specified, send to that user, otherwise broadcast (legacy/mesh fallback)
      const target = to ? sessionNamespace.to(to) : sessionNamespace.to(sessionId);
      target.emit('webrtc-offer', {
        from: socket.data.user?.userId,
        offer,
      });
    });

    socket.on('webrtc-answer', (data) => {
      const { sessionId, to, answer } = data;
      const target = to ? sessionNamespace.to(to) : sessionNamespace.to(sessionId);
      target.emit('webrtc-answer', {
        from: socket.data.user?.userId,
        answer,
      });
    });

    socket.on('ice-candidate', (data) => {
      const { sessionId, to, candidate } = data;
      const target = to ? sessionNamespace.to(to) : sessionNamespace.to(sessionId);
      target.emit('ice-candidate', {
        from: socket.data.user?.userId,
        candidate,
      });
    });

    /**
     * FILE TRANSFER EVENTS
     */
    socket.on('file-transfer', (data) => {
      const { sessionId, transferData } = data;
      const userId = socket.data.user?.userId;
      // Broadcast to all other participants in the session
      socket.to(sessionId).emit('file-transfer', { transferData, fromUserId: userId });
    });

    /**
     * DISCONNECT HANDLER
     */

    socket.on('disconnect', async () => {
      const userId = socket.data.user?.userId;
      console.log(`❌ User disconnected: ${userId}`);

      // Only clean up sessions this socket explicitly joined (tracked in joinedSessions)
      const joinedSessions: string[] = socket.data.joinedSessions || [];

      for (const sessionId of joinedSessions) {
        try {
          const session = await Session.findById(sessionId);
          if (!session || session.status === 'ended') continue;

          const participant = session.participants.find(
            (p: IParticipant) => p.userId.toString() === userId
          );
          if (!participant || participant.leftAt) continue;

          participant.leftAt = new Date();
          await session.save();

          const activeCount = session.participants.filter((p: IParticipant) => !p.leftAt).length;

          // Notify others
          sessionNamespace.to(sessionId).emit('participant-left', {
            userId,
            userName: socket.data.user?.name,
            participantCount: activeCount,
            timestamp: new Date(),
          });

          // Trigger Analytics Update for Organizer
          if (session.organizerId) {
            sendStatsUpdate(session.organizerId.toString(), {
              type: 'attendance',
              eventId: session.eventId,
              sessionId: session._id,
              delta: -1,
              total: activeCount
            });
          }

          // Log Check-out on disconnect
          await logCheckOut({ sessionId, userId }).catch(() => { });

        } catch (err) {
          console.error(`Disconnect cleanup error for session ${sessionId}:`, err);
        }
      }
    });
  });

  return sessionNamespace;
};

export default initializeWebSocket;
