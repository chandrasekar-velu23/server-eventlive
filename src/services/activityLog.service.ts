import { Request } from "express";
import ActivityLog from "../models/activityLog.model";

/**
 * Standardized activity logging service
 */
export const logActivity = async (
    userId: string,
    action: string,
    details: Record<string, any> = {},
    req?: Request
) => {
    try {
        const log = await ActivityLog.create({
            user: userId,
            action,
            details
        });

        console.log(`[ACTIVITY LOG] User: ${userId} | Action: ${action}`);
        return log;
    } catch (error) {
        console.error(`[ACTIVITY LOG ERROR] Failed to log ${action}:`, error);
        // We don't throw here as logging should not break the main flow
        return null;
    }
};
