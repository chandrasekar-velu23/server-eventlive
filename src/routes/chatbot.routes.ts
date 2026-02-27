import { Router } from "express";
import { handleChat } from "../controllers/chatbot.controller";

const router = Router();

// POST /api/chat
// Public route — no auth required (guests can use it too)
router.post("/", handleChat);

export default router;
