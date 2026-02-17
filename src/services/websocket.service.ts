import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import Session, { ISession, IParticipant } from '../models/session.model';
import ChatMessage from '../models/chatMessage.model';
import Poll from '../models/poll.model';
import Question from '../models/question.model';
import { hasPermission } from '../middleware/rbac.middleware';
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

        // Join Socket.io room
        socket.join(sessionId);

        // Add participant to database
        const session = await Session.findById(sessionId);
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        const existingParticipant = session.participants.find(
          (p: IParticipant) => p.userId.toString() === userId
        );

        if (!existingParticipant) {
          session.participants.push({
            userId,
            joinedAt: new Date(),
            role: 'attendee',
            isMuted: true,
            videoEnabled: false,
            screenshareActive: false,
            reactions: [],
            handRaised: false,
            questionsAsked: 0,
          });

          await session.save();
        }

        // Broadcast to room
        sessionNamespace.to(sessionId).emit('participant-joined', {
          userId,
          userName: socket.data.user?.name,
          participantCount: session.participants.length,
          timestamp: new Date(),
        });

        // Trigger Analytics Update for Organizer
        if (session.organizerId) {
          sendStatsUpdate(session.organizerId.toString(), {
            type: 'attendance',
            eventId: session.eventId,
            sessionId: session._id,
            delta: 1,
            total: session.participants.length
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
            // req object is not available here, but we can pass IP/UserAgent from handshake if needed
            // For now, we'll let service handle missing req
          });
        } catch (logError) {
          console.error("Failed to log check-in in WS:", logError);
        }

        socket.emit('session-joined', {
          message: 'Successfully joined session',
          participants: session.participants.length,
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

        // Validate permission
        const hasPermissions = await hasPermission(userId, sessionId, 'send_chat_message');
        if (!hasPermissions) {
          socket.emit('error', { message: 'Permission denied' });
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
        await message.populate('senderId', 'name avatar');

        // Broadcast to room
        sessionNamespace.to(sessionId).emit('new-message', {
          _id: message._id,
          senderId: userId,
          senderName: socket.data.user?.name,
          content: message.content,
          timestamp: message.createdAt,
        });

        // Log Activity
        await ActivityLog.create({
          user: userId,
          action: "CHAT_MESSAGE",
          details: {
            sessionId,
            messageId: message._id,
            contentLength: message.content.length
          },
          ip: socket.handshake.address
        });

        socket.emit('message-sent', { messageId: message._id });
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

    socket.on('vote-poll', async (data) => {
      try {
        const { sessionId, pollId, answers } = data;
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
      console.log(`❌ User disconnected: ${socket.data.user?.userId}`);

      // Clean up participant state
      const rooms = socket.rooms;
      rooms.forEach(async (room) => {
        const session = await Session.findById(room);
        if (session) {
          const participant = session.participants.find(
            (p: IParticipant) => p.userId.toString() === socket.data.user?.userId
          );
          if (participant) {
            participant.leftAt = new Date();
            await session.save();

            // Notify others
            sessionNamespace.to(room).emit('participant-left', {
              userId: socket.data.user?.userId,
              participantCount: session.participants.length,
            });

            // Trigger Analytics Update for Organizer
            if (session.organizerId) {
              sendStatsUpdate(session.organizerId.toString(), {
                type: 'attendance',
                eventId: session.eventId,
                sessionId: session._id,
                delta: -1,
                total: session.participants.length
              });
            }

            // Log Check-out on disconnect
            try {
              // We need the sessionId here, which is the room id
              await logCheckOut({
                sessionId: room,
                userId: socket.data.user?.userId,
              });
            } catch (logError) {
              // Ignore error if check-out already happened or session invalid
            }
          }
        }
      });
    });
  });

  return sessionNamespace;
};

export default initializeWebSocket;
