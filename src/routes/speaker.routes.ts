import express from "express";
import { createSpeaker, getSpeakers, getSpeakerById, uploadSpeakerImage as uploadSpeakerImageController } from "../controllers/speaker.controller";
import { authGuard } from "../middleware/auth.middleware";
import { uploadSpeakerImage } from "../middleware/upload.middleware";

const router = express.Router();

router.post("/", authGuard, createSpeaker) as any;
router.get("/", authGuard, getSpeakers) as any;
router.get("/:id", authGuard, getSpeakerById) as any;
router.post("/upload", authGuard, uploadSpeakerImage.single('file'), uploadSpeakerImageController) as any;

export default router;
