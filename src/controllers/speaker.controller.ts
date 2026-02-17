import { Request, Response } from "express";
import Speaker from "../models/speaker.model";

export const createSpeaker = async (req: Request, res: Response): Promise<void> => {
    try {
        const speaker = await Speaker.create(req.body);
        res.status(201).json({ message: "Speaker created successfully", data: speaker });
    } catch (error) {
        console.error("Create speaker error:", error);
        res.status(500).json({ message: "Failed to create speaker" });
    }
};

export const getSpeakers = async (req: Request, res: Response): Promise<void> => {
    try {
        const speakers = await Speaker.find();
        res.status(200).json({ data: speakers });
    } catch (error: any) {
        console.error("Get speakers error:", error);
        res.status(500).json({ message: "Failed to fetch speakers" });
    }
};

export const getSpeakerById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const speaker = await Speaker.findById(id);
        if (!speaker) {
            res.status(404).json({ message: "Speaker not found" });
            return;
        }
        res.status(200).json({ data: speaker });
    } catch (error: any) {
        console.error("Get speaker error:", error);
        res.status(500).json({ message: "Failed to fetch speaker" });
    }
};

export const uploadSpeakerImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const file = (req as any).file;
        if (!file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }

        const { getPublicUrl } = await import("../services/s3.service");
        let imageUrl: string;

        if (file.key) {
            imageUrl = getPublicUrl(file.key);
        } else if (file.location) {
            imageUrl = file.location;
        } else {
            const protocol = req.protocol;
            const host = req.get('host');
            const baseUrl = process.env.BACKEND_URL || `${protocol}://${host}`;
            imageUrl = `${baseUrl}/public/uploads/speakers/${file.filename}`;
        }

        res.status(200).json({
            url: imageUrl,
            filename: file.filename || file.key,
            message: "Speaker image uploaded successfully"
        });
    } catch (error) {
        console.error("Upload speaker image error:", error);
        res.status(500).json({ message: "Failed to upload image" });
    }
};
