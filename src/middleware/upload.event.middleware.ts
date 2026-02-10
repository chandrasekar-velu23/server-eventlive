import { Request } from "express";
import path from "path";
import multer from "multer";
import fs from "fs";

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "public/uploads/events");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

type DestinationCallback = (error: Error | null, destination: string) => void;
type FileNameCallback = (error: Error | null, filename: string) => void;

const storage = multer.diskStorage({
    destination: (req: Request, file: any, cb: DestinationCallback) => {
        cb(null, uploadDir);
    },
    filename: (req: Request, file: any, cb: FileNameCallback) => {
        // Sanitize filename and use timestamp for uniqueness
        const filename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, "-")}`;
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

export const uploadEvent = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB limit
    },
});
