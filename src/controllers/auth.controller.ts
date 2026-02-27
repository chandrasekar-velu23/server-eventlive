import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from 'crypto';
import jwt from "jsonwebtoken";
import User from "../models/user.model";
import { OAuth2Client } from "google-auth-library";
import { sendWelcomeEmail, sendPasswordResetEmail } from "../services/mail.service";
import { createSession } from "../services/session.service";
import { logActivity } from "../services/activityLog.service";

/* ---------------------------------------------------
 * JWT helpers
 * ---------------------------------------------------*/
const signToken = (payload: { id: string; role: string }, sessionId: string) =>
  jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: "30d", // Long-lived token for persistent login
    jwtid: sessionId, // Link token to session in DB
  });

const sendAuthResponse = async (req: Request, res: Response, user: any) => {
  const ip = req.ip || req.socket.remoteAddress || "Unknown";
  const userAgent = req.get("User-Agent") || "Unknown";

  // Create Session (Handles notifications)
  const sessionId = await createSession(
    user._id.toString(),
    ip.toString(),
    userAgent,
    user.name,
    user.email
  );

  const token = signToken({
    id: user._id.toString(),
    role: user.role,
  }, sessionId);

  res.json({
    message: "Authentication successful",
    data: {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
      }
    },
  });
};

/* ---------------------------------------------------
 * LOCAL SIGNUP (Email + Password)
 * ---------------------------------------------------*/
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      authProvider: "local",
      onboardingCompleted: false,
    });

    // Send Welcome Email (Fire & Forget)
    sendWelcomeEmail(user.email, user.name);

    await logActivity(user._id.toString(), "User Signup", { method: "Email" }, req);

    await sendAuthResponse(req, res, user);
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Signup failed" });
  }
};

/* ---------------------------------------------------
 * LOCAL LOGIN (Email + Password)
 * ---------------------------------------------------*/
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find by email only (allow Google users who have set a password to login)
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Check if user has a password set
    if (!user.password) {
      res.status(400).json({ message: "Account exists via Google. Please login with Google or reset password." });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    await logActivity(user._id.toString(), "User Login", { method: "Email" }, req);

    await sendAuthResponse(req, res, user);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
};

/* ---------------------------------------------------
 * GOOGLE OAUTH LOGIN / SIGNUP
 * ---------------------------------------------------*/
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

export const googleAuth = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.body; // token can be ID Token (credential) or Access Token

    let payload: { name: string; email: string; picture?: string;[key: string]: any } | undefined;

    // 1. Try treating it as an ID Token (credential) first
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const p = ticket.getPayload();
      if (p?.email && p?.name) {
        payload = { name: p.name, email: p.email, picture: p.picture };
      }
    } catch (idTokenError) {
      // 2. If ID Token fails, try treating as Access Token (UserInfo endpoint)
      try {
        const userInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await userInfoResponse.json();
        if (data.email && data.name) {
          payload = { name: data.name, email: data.email, picture: data.picture };
        }
      } catch (accessTokenError) {
        console.error("Token verification failed:", idTokenError, accessTokenError);
      }
    }

    if (!payload?.email) {
      res.status(401).json({ message: "Invalid Google token" });
      return;
    }

    // Find by email (Link accounts automatically)
    let user = await User.findOne({ email: payload.email });

    // First-time Google signup
    if (!user) {
      user = await User.create({
        name: payload.name,
        email: payload.email,
        avatar: payload.picture, // Save Google Picture
        role: "User",
        authProvider: "google",
        onboardingCompleted: false,
      });
      // Send Welcome Email
      sendWelcomeEmail(user.email, user.name);
    } else {
      // User exists
      if (user.authProvider === "local" && !user.password) {
        user.authProvider = "google";
      }

      // Optional: Update avatar if not set
      if (!user.avatar && payload.picture) {
        user.avatar = payload.picture;
        await user.save();
      } else if (user.authProvider === "local" && !user.password) {
        // If we just converted them, maybe update avatar too? 
        // Better to respect existing avatar if present, which the above check does.
        await user.save();
      }
    }

    await logActivity(user._id.toString(), user.isNew ? "User Signup" : "User Login", { method: "Google" }, req);

    await sendAuthResponse(req, res, user);
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(401).json({ message: "Google authentication failed" });
  }
};

/* ---------------------------------------------------
 * FORGOT PASSWORD
 * ---------------------------------------------------*/
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Security: Don't reveal user existence
      res.status(200).json({ message: "If that email exists, we've sent a reset link." });
      return;
    }

    // Generate Reset Token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash it for DB storage
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Expire in 1 hour
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);

    await user.save();

    // Send Email with Unhashed Token
    await sendPasswordResetEmail(user.email, resetToken);

    res.status(200).json({ message: "Password reset prompt sent to email." });

  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Error sending email." });
  }
};

/* ---------------------------------------------------
 * RESET PASSWORD
 * ---------------------------------------------------*/
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const resetToken = req.params.token;

    // Hash the token from URL to compare with DB
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }, // Not expired
    });

    if (!user) {
      res.status(400).json({ message: "Token is invalid or has expired." });
      return;
    }

    // Set New Password
    user.password = await bcrypt.hash(req.body.password, 12);

    // Clear Reset Field
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    // Log user in automatically
    await sendAuthResponse(req, res, user);

  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Password reset failed." });
  }
};
