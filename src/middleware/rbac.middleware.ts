import { Request, Response, NextFunction } from 'express';
import Session from '../models/session.model';

// Extend Express Request to include user and permissions
declare global {
  namespace Express {
    interface Request {
      user?: any;
      permissions?: string[];
    }
  }
}

/**
 * Role-based permission matrix
 * Defines what actions each role can perform in a session
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  organizer: [
    'start_session',
    'end_session',
    'start_recording',
    'end_recording',
    'mute_participant',
    'unmute_participant',
    'remove_participant',
    'start_broadcast',
    'end_broadcast',
    'manage_speakers',
    'manage_polls',
    'manage_qa',
    'view_analytics',
  ],
  speaker: [
    'broadcast_video',
    'broadcast_audio',
    'answer_question',
    'respond_to_poll',
    'send_chat_message',
    'raise_hand',
    'share_screen',
  ],
  moderator: [
    'mute_participant',
    'unmute_participant',
    'remove_participant',
    'manage_qa',
    'manage_polls',
    'manage_speakers',
    'send_chat_message',
    'pin_message',
    'delete_message',
  ],
  attendee: [
    'send_chat_message',
    'respond_to_poll',
    'ask_question',
    'raise_hand',
    'react_to_stream',
  ],
};

/**
 * Verify that user has specific permission in session
 */
export const hasPermission = async (
  userId: string,
  sessionId: string,
  permission: string
): Promise<boolean> => {
  try {
    const session = await Session.findById(sessionId);
    if (!session) return false;

    // Find participant in session
    const participant = session.participants.find(
      (p) => p.userId.toString() === userId
    );

    if (!participant) return false;

    // Organizer has all permissions
    if (participant.role === 'organizer') return true;

    // Check if role has this permission
    const rolePermissions = ROLE_PERMISSIONS[participant.role] || [];
    return rolePermissions.includes(permission);
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
};

/**
 * Middleware: Check if user is authenticated
 */
import jwt from 'jsonwebtoken';
import { validateSession } from '../services/session.service';

/**
 * Middleware: Check if user is authenticated
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

      // Validate session if jti is present (consistent with auth.middleware)
      if (decoded.jti) {
        const session = await validateSession(decoded.jti);
        if (!session) {
          res.status(401).json({ message: 'Session expired or invalid' });
          return;
        }
      }

      req.user = decoded;
      req.permissions = ROLE_PERMISSIONS[decoded.role] || [];
      next();
    } catch (err) {
      res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Authentication error' });
  }
};

/**
 * Middleware: Check if user is session organizer
 */
export const isSessionOrganizer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!sessionId || !userId) {
      res.status(400).json({ message: 'Missing sessionId or userId' });
      return;
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    if (session.organizerId.toString() !== userId) {
      res.status(403).json({ message: 'Only session organizer can perform this action' });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

/**
 * Middleware: Check if user is session participant
 */
export const isSessionParticipant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!sessionId || !userId) {
      res.status(400).json({ message: 'Missing sessionId or userId' });
      return;
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    const participant = session.participants.find(
      (p) => p.userId.toString() === userId
    );

    if (!participant) {
      res.status(403).json({ message: 'User is not a participant in this session' });
      return;
    }

    // Store participant info in request
    req.user.participant = participant;
    req.permissions = ROLE_PERMISSIONS[participant.role] || [];

    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

/**
 * Middleware: Check if user has required permission in session
 */
export const requirePermission = (permission: string) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.userId;

      if (!sessionId || !userId) {
        res.status(400).json({ message: 'Missing sessionId or userId' });
        return;
      }

      const hasAccess = await hasPermission(userId, sessionId, permission);

      if (!hasAccess) {
        res.status(403).json({
          message: `User does not have permission to ${permission}`,
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  };
};

/**
 * Middleware: Rate limiting for session operations
 */
export const rateLimit = (maxRequests: number = 60, windowMs: number = 60000) => {
  const store: Map<string, number[]> = new Map();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.user?.userId}:${req.params.sessionId}`;
    const now = Date.now();
    const requests = store.get(key) || [];

    // Remove old requests outside the window
    const recentRequests = requests.filter((time) => time > now - windowMs);

    if (recentRequests.length >= maxRequests) {
      res.status(429).json({ message: 'Too many requests' });
      return;
    }

    recentRequests.push(now);
    store.set(key, recentRequests);

    next();
  };
};

export default {
  authenticate,
  isSessionOrganizer,
  isSessionParticipant,
  requirePermission,
  rateLimit,
  hasPermission,
  ROLE_PERMISSIONS,
};
