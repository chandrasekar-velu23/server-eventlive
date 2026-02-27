import User, { IUser } from "../models/user.model";
import { sendLoginNotification } from "./mail.service";
import mongoose from "mongoose";

// Constants
const IDLE_TIMEOUT = 60 * 60 * 1000; // 1 hour in ms
const MAX_SESSION_LIFETIME = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

export interface IValidatedSession {
    _id: mongoose.Types.ObjectId;
    userId: string;
    ipAddress: string;
    userAgent: string;
    lastActive: Date;
}

export const createSession = async (
    userId: string,
    ipAddress: string,
    userAgent: string,
    userName: string,
    userEmail: string
): Promise<string> => {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    // 1. Check for suspicious login (Device Context)
    // Get the most recent session
    const lastSession = user.activeSessions && user.activeSessions.length > 0
        ? user.activeSessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
        : null;

    let notify = true;
    if (lastSession) {
        if (lastSession.ipAddress === ipAddress && lastSession.userAgent === userAgent) {
            notify = false;
        }
    }

    // 2. Create New Session
    const expiresAt = new Date(Date.now() + MAX_SESSION_LIFETIME);

    // Clean up expired sessions first (Self-healing)
    if (user.activeSessions) {
        user.activeSessions = user.activeSessions.filter(s => s.expiresAt.getTime() > Date.now());
    } else {
        user.activeSessions = [];
    }

    user.activeSessions.push({
        _id: new mongoose.Types.ObjectId(),
        tokenHash: "jti_linkage",
        ipAddress,
        userAgent,
        lastActive: new Date(),
        expiresAt,
        createdAt: new Date()
    });

    await user.save();

    // Get the ID of the newly created session
    const newSession = user.activeSessions[user.activeSessions.length - 1];

    // 3. Send Notification if needed
    if (notify) {
        const time = new Date().toLocaleString();
        sendLoginNotification(userEmail, userName, userAgent, time).catch(err =>
            console.error("Failed to send login alert:", err)
        );
    }

    return newSession._id.toString();
};

export const validateSession = async (sessionId: string): Promise<IValidatedSession | null> => {
    if (!mongoose.Types.ObjectId.isValid(sessionId)) return null;

    // Find user interacting with this session
    // We use dot notation to query subdocuments
    const user = await User.findOne({ "activeSessions._id": sessionId });

    if (!user || !user.activeSessions) return null;

    const session = user.activeSessions.find(s => s._id.toString() === sessionId);
    if (!session) return null;

    // 1. Check Absolute Expiry
    if (session.expiresAt.getTime() < Date.now()) {
        // Remove expired session
        await User.updateOne({ _id: user._id }, { $pull: { activeSessions: { _id: sessionId } } });
        return null;
    }

    // 2. Check Idle Timeout
    const timeSinceLastActive = Date.now() - session.lastActive.getTime();
    if (timeSinceLastActive > IDLE_TIMEOUT) {
        // Remove idle session
        await User.updateOne({ _id: user._id }, { $pull: { activeSessions: { _id: sessionId } } });
        return null;
    }

    // 3. Touch Session (Extend Idle Window)
    // We use atomic update to minimize race conditions
    await User.updateOne(
        { "activeSessions._id": sessionId },
        { $set: { "activeSessions.$.lastActive": new Date() } }
    );

    return {
        _id: session._id,
        userId: user._id.toString(),
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        lastActive: new Date()
    };
};

export const invalidateSession = async (sessionId: string): Promise<void> => {
    if (!mongoose.Types.ObjectId.isValid(sessionId)) return;
    await User.updateOne(
        { "activeSessions._id": sessionId },
        { $pull: { activeSessions: { _id: sessionId } } }
    );
};
