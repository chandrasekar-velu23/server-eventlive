import { Request, Response } from "express";
import { getChatReply, ChatMessage } from "../services/chatbot.service";

export const handleChat = async (req: Request, res: Response): Promise<void> => {
    try {
        const { message, role, page, history } = req.body as {
            message?: string;
            role?: string;
            page?: string;
            history?: ChatMessage[];
        };

        // ── Input validation ──────────────────────────────────────────────────────
        if (!message || typeof message !== "string" || !message.trim()) {
            res.status(400).json({ error: "Message is required." });
            return;
        }

        const userRole = (typeof role === "string" && role.trim()) ? role.trim() : "Guest";
        const userPage = (typeof page === "string" && page.trim()) ? page.trim() : "/";
        const chatHistory: ChatMessage[] = Array.isArray(history)
            ? history.filter(
                (m) =>
                    m &&
                    (m.role === "user" || m.role === "assistant") &&
                    typeof m.content === "string" &&
                    m.content.trim().length > 0
            )
            : [];

        const { reply, suggestions } = await getChatReply(message.trim(), userRole, userPage, chatHistory);
        // Must match the standard ApiResponse<T> shape: { message, data }
        // that apiFetch in api.ts parses — otherwise result.data is undefined
        res.json({ message: "ok", data: { reply, suggestions } });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[ChatBot Error]", msg);

        // Map prefixed error codes (set by chatbot.service.ts) to HTTP responses
        if (msg.startsWith("OPENROUTER_API_KEY") || msg.startsWith("OPENROUTER_UNAUTHORIZED")) {
            res.status(503).json({
                error: "The chatbot is not configured. Please contact the admin to add the OpenRouter API key.",
            });
            return;
        }

        if (msg.startsWith("OPENROUTER_RATE_LIMIT")) {
            res.status(429).json({
                error: "The AI service is busy right now. Please wait a moment and try again.",
            });
            return;
        }

        if (msg.startsWith("OPENROUTER_MODEL_NOT_FOUND")) {
            res.status(503).json({
                error: "The selected AI model is unavailable. Please try again or contact support.",
            });
            return;
        }

        if (msg.startsWith("OPENROUTER_NETWORK")) {
            res.status(503).json({
                error: "Could not reach the AI service. Please check your internet connection and try again.",
            });
            return;
        }

        if (msg.startsWith("OPENROUTER_ERROR")) {
            res.status(502).json({
                error: "The AI service returned an unexpected error. Please try again shortly.",
            });
            return;
        }

        // Generic fallback
        res.status(500).json({ error: "Something went wrong. Please try again." });
    }
};
