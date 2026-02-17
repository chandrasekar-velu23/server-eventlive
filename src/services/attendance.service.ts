import { Request } from "express";
import AttendanceLog from "../models/attendanceLog.model";
import ActivityLog from "../models/activityLog.model";

interface CheckInOptions {
    eventId: string;
    sessionId: string;
    userId: string;
    userEmail: string;
    userName: string;
    req?: Request;
}

interface CheckOutOptions {
    sessionId: string;
    userId: string;
}

/**
 * Log user check-in to a session
 */
export const logCheckIn = async (options: CheckInOptions) => {
    try {
        const { eventId, sessionId, userId, userEmail, userName, req } = options;

        // Check if user already has an active session
        const existingLog = await AttendanceLog.findOne({
            sessionId,
            userId,
            status: "active"
        });

        if (existingLog) {
            console.log(`User ${userEmail} already checked in to session ${sessionId}`);
            return existingLog;
        }

        // Extract metadata from request
        const ipAddress = req?.ip || req?.socket?.remoteAddress;
        const userAgent = req?.get("user-agent");

        // Create new attendance log
        const log = await AttendanceLog.create({
            eventId,
            sessionId,
            userId,
            userEmail,
            userName,
            checkInTime: new Date(),
            ipAddress,
            userAgent,
            status: "active"
        });

        console.log(`[ATTENDANCE] Check-in: ${userName} (${userEmail}) to session ${sessionId}`);
        return log;
    } catch (error) {
        console.error("Failed to log check-in:", error);
        throw error;
    }
};

/**
 * Log user check-out from a session
 */
export const logCheckOut = async (options: CheckOutOptions) => {
    try {
        const { sessionId, userId } = options;

        // Find active attendance log
        const log = await AttendanceLog.findOne({
            sessionId,
            userId,
            status: "active"
        });

        if (!log) {
            throw new Error("No active session found for user");
        }

        // Update with check-out time
        log.checkOutTime = new Date();
        await log.save(); // Pre-save hook will calculate duration and update status

        console.log(`[ATTENDANCE] Check-out: ${log.userName} (${log.userEmail}) from session ${sessionId} - Duration: ${log.durationMinutes} min`);
        return log;
    } catch (error) {
        console.error("Failed to log check-out:", error);
        throw error;
    }
};

/**
 * Get all attendance logs for an event
 */
export const getEventAttendanceLogs = async (eventId: string, limit: number = 500) => {
    try {
        const logs = await AttendanceLog.find({ eventId })
            .sort({ checkInTime: -1 })
            .limit(limit)
            .lean();
        return logs;
    } catch (error) {
        console.error("Failed to fetch attendance logs:", error);
        return [];
    }
};

/**
 * Get attendance logs for a specific session
 */
export const getSessionAttendanceLogs = async (sessionId: string) => {
    try {
        const logs = await AttendanceLog.find({ sessionId })
            .sort({ checkInTime: -1 })
            .lean();
        return logs;
    } catch (error) {
        console.error("Failed to fetch session attendance logs:", error);
        return [];
    }
};

/**
 * Get attendance logs for a specific user
 */
export const getUserAttendanceLogs = async (userId: string, limit: number = 100) => {
    try {
        const logs = await AttendanceLog.find({ userId })
            .sort({ checkInTime: -1 })
            .limit(limit)
            .populate("eventId", "title startTime endTime")
            .lean();
        return logs;
    } catch (error) {
        console.error("Failed to fetch user attendance logs:", error);
        return [];
    }
};

/**
 * Get active sessions for a user
 */
export const getActiveUserSessions = async (userId: string) => {
    try {
        const logs = await AttendanceLog.find({
            userId,
            status: "active"
        })
            .populate("eventId", "title")
            .populate("sessionId", "title")
            .lean();
        return logs;
    } catch (error) {
        console.error("Failed to fetch active sessions:", error);
        return [];
    }
};

/**
 * Calculate total attendance duration for a user in an event
 */
export const getUserEventDuration = async (userId: string, eventId: string) => {
    try {
        const logs = await AttendanceLog.find({
            userId,
            eventId,
            status: "completed"
        });

        const totalMinutes = logs.reduce((sum, log) => sum + (log.durationMinutes || 0), 0);
        return totalMinutes;
    } catch (error) {
        console.error("Failed to calculate user event duration:", error);
        return 0;
    }
};

/**
 * Get attendance statistics for an event
 */
export const getEventAttendanceStats = async (eventId: string) => {
    try {
        const logs = await AttendanceLog.find({ eventId });

        const uniqueAttendees = new Set(logs.map(log => log.userId.toString())).size;
        const totalCheckIns = logs.length;
        const activeNow = logs.filter(log => log.status === "active").length;
        const avgDuration = logs
            .filter(log => log.durationMinutes)
            .reduce((sum, log) => sum + (log.durationMinutes || 0), 0) / (logs.length || 1);

        return {
            uniqueAttendees,
            totalCheckIns,
            activeNow,
            avgDuration: Math.round(avgDuration)
        };
    } catch (error) {
        console.error("Failed to calculate attendance stats:", error);
        return {
            uniqueAttendees: 0,
            totalCheckIns: 0,
            activeNow: 0,
            avgDuration: 0
        };
    }
};

/**
 * Get detailed activity logs for an attendee in an event
 * Aggregates session attendance, chat, and poll activities
 */
export const getAttendeeActivityLogs = async (userId: string, eventId: string) => {
    try {
        // 1. Get Session Attendance Logs
        const attendanceLogs = await AttendanceLog.find({ userId, eventId })
            .sort({ checkInTime: 1 })
            .lean();

        // 2. Get Activity Logs (Chat, Polls, etc.)
        // We filter ActivityLogs by the sessions belonging to this event
        // derived from the attendance logs.
        // Note: If a user did something without checking in (edge case), it might be missed here,
        // but generally activity happens within a session.
        const sessionIds = attendanceLogs.map(log => log.sessionId);

        const activityLogs = await ActivityLog.find({
            user: userId,
            'details.sessionId': { $in: sessionIds }
        }).sort({ createdAt: 1 }).lean();

        // 3. Merge and format
        const combinedLogs = [
            ...attendanceLogs.map(log => ({
                id: log._id,
                type: 'SESSION_JOIN',
                timestamp: log.checkInTime,
                details: { sessionId: log.sessionId }
            })),
            ...attendanceLogs.filter(log => log.checkOutTime).map(log => ({
                id: `${log._id}_leave`,
                type: 'SESSION_LEAVE',
                timestamp: log.checkOutTime,
                details: { sessionId: log.sessionId, duration: log.durationMinutes }
            })),
            ...activityLogs.map(log => ({
                id: log._id,
                type: log.action,
                timestamp: log.createdAt,
                details: log.details
            }))
        ].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        return combinedLogs;
    } catch (error) {
        console.error("Failed to fetch attendee activity logs:", error);
        return [];
    }
};
