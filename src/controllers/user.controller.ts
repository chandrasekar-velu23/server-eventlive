import { Request, Response } from 'express';
import User from '../models/user.model';
import ActivityLog from '../models/activityLog.model';
import { sendProfileUpdateNotificationToUser, sendProfileUpdateNotificationToAdmin } from '../services/mail.service';

export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;
        const user = await User.findById(userId).select('-password');

        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        res.status(200).json({ data: user });
    } catch (error) {
        console.error("Get user profile error:", error);
        res.status(500).json({ message: "Failed to fetch profile" });
    }
};

export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;
        const updateData = req.body;

        // Prevent Role escalation or sensitive data update if not allowed
        // Allowing updating new profile fields
        const allowedUpdates = [
            'name', 'bio', 'avatar', 'socialLinks',
            'role', 'onboardingCompleted',
            // Organizer specific
            'organizationName', 'eventTypes'
        ];

        const filteredUpdate: any = {};
        const changes: string[] = [];

        // Check if user exists first to compare
        const currentUser = await User.findById(userId);
        if (!currentUser) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        Object.keys(updateData).forEach(key => {
            if (allowedUpdates.includes(key)) {
                // Check if value actually changed
                const newValue = updateData[key];
                const oldValue = (currentUser as any)[key];

                // Simple comparison (could be improved for deep objects like socialLinks)
                if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
                    filteredUpdate[key] = newValue;
                    if (key === 'socialLinks') {
                        changes.push(`Updated Social Links`);
                    } else {
                        changes.push(`Updated ${key}`);
                    }
                }
            }
        });

        if (Object.keys(filteredUpdate).length === 0) {
            res.status(200).json({ message: "No changes detected", data: currentUser });
            return;
        }

        const user = await User.findByIdAndUpdate(userId, filteredUpdate, { new: true }).select('-password');

        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        // Log Activity
        await ActivityLog.create({
            user: userId,
            action: "Profile Update",
            details: { fields: Object.keys(filteredUpdate) },
            ip: req.ip
        });

        // Notifications (Async/Fire & Forget)
        if (user) {
            sendProfileUpdateNotificationToUser(user.email, user.name, changes);
            sendProfileUpdateNotificationToAdmin(user.name, user.email, changes);
        }

        res.status(200).json({
            message: "Profile updated successfully",
            data: user
        });
    } catch (error) {
        console.error("Update user profile error:", error);
        res.status(500).json({ message: "Failed to update profile" });
    }
};

export const getUserActivityLogs = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;
        const logs = await ActivityLog.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(20); // Limit to recent 20 logs

        res.status(200).json({ data: logs });
    } catch (error) {
        console.error("Get logs error:", error);
        res.status(500).json({ message: "Failed to fetch activity logs" });
    }
};

export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
    try {
        const file = (req as any).file;
        if (!file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }

        const userId = (req as any).user?.id;
        // Construct public URL pointing to backend
        const protocol = req.protocol;
        const host = req.get('host');
        const avatarUrl = `${protocol}://${host}/public/uploads/avatars/${file.filename}`;

        const user = await User.findByIdAndUpdate(userId, { avatar: avatarUrl }, { new: true }).select('-password');

        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        await ActivityLog.create({
            user: userId,
            action: "Avatar Update",
            details: { filename: file.filename },
            ip: req.ip
        });

        // Notifications
        const changes = ["Updated Profile Picture"];
        sendProfileUpdateNotificationToUser(user.email, user.name, changes);
        sendProfileUpdateNotificationToAdmin(user.name, user.email, changes);

        res.status(200).json({
            message: "Avatar updated successfully",
            data: { avatar: avatarUrl, user }
        });

    } catch (error) {
        console.error("Upload avatar error:", error);
        res.status(500).json({ message: "Failed to upload avatar" });
    }
};

export const toggleFavorite = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;
        const { eventId } = req.body;

        if (!eventId) {
            res.status(400).json({ message: "Event ID is required" });
            return;
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const index = user.favorites.indexOf(eventId);
        let action = "";

        if (index === -1) {
            user.favorites.push(eventId);
            action = "added";
        } else {
            user.favorites.splice(index, 1);
            action = "removed";
        }

        await user.save();

        res.status(200).json({
            message: `Event ${action} to favorites`,
            favorites: user.favorites
        });

    } catch (error) {
        console.error("Toggle favorite error:", error);
        res.status(500).json({ message: "Failed to update favorites" });
    }
};

export const getFavorites = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;

        const user = await User.findById(userId).populate('favorites');
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        res.status(200).json({ data: user.favorites });
    } catch (error) {
        console.error("Get favorites error:", error);
        res.status(500).json({ message: "Failed to fetch favorites" });
    }
};
