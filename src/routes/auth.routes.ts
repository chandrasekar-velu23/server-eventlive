import express from "express";
import { signup, login, googleAuth, forgotPassword, resetPassword } from "../controllers/auth.controller";


const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/google", googleAuth);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;
