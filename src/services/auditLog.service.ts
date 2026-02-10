import EventChangeLog from "../models/eventChangeLog.model";
import { Request } from "express";

interface LogChangeOptions {
    eventId: string;
    userId: string;
    userName: string;
    userEmail: string;
    changeType: "created" | "updated" | "deleted";
    field: string;
    oldValue?: any;
    newValue?: any;
    req?: Request;
}

/**
 * Log a change to an event for admin audit trail
 */
export const logEventChange = async (options: LogChangeOptions): Promise<void> => {
    try {
        const {
            eventId,
            userId,
            userName,
            userEmail,
            changeType,
            field,
            oldValue,
            newValue,
            req
        } = options;

        // Get IP address and user agent from request if available
        const ipAddress = req?.ip || req?.socket?.remoteAddress;
        const userAgent = req?.get("user-agent");

        await EventChangeLog.create({
            eventId,
            userId,
            userName,
            userEmail,
            changeType,
            field,
            oldValue,
            newValue,
            ipAddress,
            userAgent,
            timestamp: new Date()
        });

        console.log(`[AUDIT] Event ${eventId} - ${changeType} - ${field} by ${userName}`);
    } catch (error) {
        console.error("Failed to log event change:", error);
        // Don't throw error to prevent blocking the main operation
    }
};

/**
 * Log multiple changes at once (for bulk updates)
 */
export const logEventChanges = async (
    eventId: string,
    userId: string,
    userName: string,
    userEmail: string,
    changes: Array<{ field: string; oldValue: any; newValue: any }>,
    req?: Request
): Promise<void> => {
    try {
        const logs = changes.map(change => ({
            eventId,
            userId,
            userName,
            userEmail,
            changeType: "updated" as const,
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
            ipAddress: req?.ip || req?.socket?.remoteAddress,
            userAgent: req?.get("user-agent"),
            timestamp: new Date()
        }));

        await EventChangeLog.insertMany(logs);
        console.log(`[AUDIT] Event ${eventId} - ${changes.length} changes by ${userName}`);
    } catch (error) {
        console.error("Failed to log event changes:", error);
    }
};

/**
 * Get change logs for a specific event (admin only)
 */
export const getEventChangeLogs = async (eventId: string, limit: number = 100) => {
    try {
        const logs = await EventChangeLog.find({ eventId })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();
        return logs;
    } catch (error) {
        console.error("Failed to fetch event change logs:", error);
        return [];
    }
};

/**
 * Get all change logs (admin only)
 */
export const getAllChangeLogs = async (limit: number = 500) => {
    try {
        const logs = await EventChangeLog.find()
            .sort({ timestamp: -1 })
            .limit(limit)
            .populate("eventId", "title")
            .lean();
        return logs;
    } catch (error) {
        console.error("Failed to fetch all change logs:", error);
        return [];
    }
};

/**
 * Detect changes between old and new event data
 */
export const detectEventChanges = (oldData: any, newData: any): Array<{ field: string; oldValue: any; newValue: any }> => {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    // Fields to track
    const fieldsToTrack = [
        "title",
        "description",
        "shortSummary",
        "startTime",
        "endTime",
        "timezone",
        "coverImage",
        "organizerDisplayName",
        "organizerLogo",
        "brandAccentColor",
        "category",
        "visibility",
        "accessType",
        "capacity",
        "agenda",
        "speakers"
    ];

    fieldsToTrack.forEach(field => {
        const oldValue = oldData[field];
        const newValue = newData[field];

        // Simple comparison (stringify for objects/arrays)
        const oldStr = JSON.stringify(oldValue);
        const newStr = JSON.stringify(newValue);

        if (oldStr !== newStr) {
            changes.push({
                field,
                oldValue,
                newValue
            });
        }
    });

    return changes;
};
