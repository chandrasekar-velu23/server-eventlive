import { Request } from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import multerS3 from "multer-s3";
import { s3Client } from "../services/s3.service";
import dotenv from "dotenv";

dotenv.config();

// Ensure uploads directory exists (local only)
const uploadDir = path.join(process.cwd(), "public/uploads/events");
if (process.env.STORAGE_PROVIDER !== 'r2') {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
}

type DestinationCallback = (error: Error | null, destination: string) => void;
type FileNameCallback = (error: Error | null, filename: string) => void;

let storage;

if (process.env.STORAGE_PROVIDER === 'r2') {
    storage = multerS3({
        s3: s3Client,
        bucket: process.env.R2_BUCKET_NAME || "",
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req: Request, file: any, cb: any) => {
            const filename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, "-")}`;
            cb(null, `public/uploads/events/${filename}`);
        }
    });
} else {
    storage = multer.diskStorage({
        destination: (req: Request, file: any, cb: DestinationCallback) => {
            cb(null, uploadDir);
        },
        filename: (req: Request, file: any, cb: FileNameCallback) => {
            // Sanitize filename and use timestamp for uniqueness
            const filename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, "-")}`;
            cb(null, filename);
        },
    });
}

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
