import express from "express";
import { getUserProfile, updateUserProfile, getUserActivityLogs, uploadAvatar, toggleFavorite, getFavorites } from "../controllers/user.controller";
import { authGuard } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = express.Router();

router.get("/profile", authGuard, getUserProfile) as any;
router.put("/profile", authGuard, updateUserProfile) as any;
router.get("/logs", authGuard, getUserActivityLogs) as any;
router.post("/avatar", authGuard, upload.single('file'), uploadAvatar) as any;
router.post("/favorites", authGuard, toggleFavorite) as any;
router.get("/favorites", authGuard, getFavorites) as any;

export default router;
