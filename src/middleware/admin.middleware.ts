import { Request, Response, NextFunction } from "express";
import User from "../models/user.model";

/**
 * Middleware to check if user is an admin
 */
export const adminGuard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = (req as any).user?.id;

        if (!userId) {
            res.status(401).json({ message: "Authentication required" });
            return;
        }

        const user = await User.findById(userId);

        if (!user) {
            res.status(401).json({ message: "User not found" });
            return;
        }

        // Check if user has admin role
        if (user.role !== "admin") {
            res.status(403).json({ message: "Admin access required" });
            return;
        }

        next();
    } catch (error) {
        console.error("Admin guard error:", error);
        res.status(500).json({ message: "Authorization check failed" });
    }
};
