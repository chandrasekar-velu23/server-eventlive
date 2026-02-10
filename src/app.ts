import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import { config } from "./config";
import routes from "./routes";
import errorHandler from "./middleware/error-handler";

const app = express();

app.use(morgan("dev"));

// Fix for Google OAuth popup cross-origin communication
app.use((_req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

// CORS must be the first middleware to ensure headers are always present
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      config.frontendUrl || "http://localhost:5173"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased limit for dev
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.json());
app.use(cookieParser());
app.use("/public", express.static(path.join(__dirname, "../public")));

// Mount aggregated routes
app.use("/api", routes);

app.get("/", (_req, res) => {
  res.json({
    status: "OK",
    message: "EventLive API is running",
  });
});

// Health check endpoint for monitoring and deployment verification
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
  });
});

app.use(errorHandler);


// Mongoose connection moved to entry point (server.ts)

export default app;
