import { Request } from "express";
import path from "path";
import multer from "multer";
import fs from "fs";

// Define upload directories for different types
const UPLOAD_DIRS = {
    avatars: path.join(process.cwd(), "public/uploads/avatars"),
    events: path.join(process.cwd(), "public/uploads/events/covers"),
    logos: path.join(process.cwd(), "public/uploads/events/logos"),
    speakers: path.join(process.cwd(), "public/uploads/speakers"),
};

// Ensure all upload directories exist
Object.values(UPLOAD_DIRS).forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

type DestinationCallback = (error: Error | null, destination: string) => void;
type FileNameCallback = (error: Error | null, filename: string) => void;

/**
 * Generate a unique filename with context
 */
const generateFilename = (originalName: string, context?: string): string => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, "-");

    const prefix = context ? `${context}-` : "";
    return `${prefix}${timestamp}-${randomStr}-${baseName}${ext}`;
};

/**
 * Create dynamic multer storage based on upload type
 */
export const createUploadMiddleware = (uploadType: keyof typeof UPLOAD_DIRS) => {
    const storage = multer.diskStorage({
        destination: (req: Request, file: any, cb: DestinationCallback) => {
            const uploadDir = UPLOAD_DIRS[uploadType];
            cb(null, uploadDir);
        },
        filename: (req: Request, file: any, cb: FileNameCallback) => {
            // Get context from request body if available
            const context = (req.body?.context || uploadType) as string;
            const filename = generateFilename(file.originalname, context);
            cb(null, filename);
        },
    });

    const fileFilter = (req: Request, file: any, cb: multer.FileFilterCallback) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed!"));
        }
    };

    return multer({
        storage: storage,
        fileFilter: fileFilter,
        limits: {
            fileSize: 5 * 1024 * 1024, // 5 MB limit
        },
    });
};

// Export specific upload middlewares
export const uploadAvatar = createUploadMiddleware("avatars");
export const uploadEventCover = createUploadMiddleware("events");
export const uploadEventLogo = createUploadMiddleware("logos");
export const uploadSpeakerImage = createUploadMiddleware("speakers");

// Legacy export for backward compatibility
export const upload = uploadAvatar;
export const uploadEvent = uploadEventCover;
