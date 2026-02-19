import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import path from "path";
import { config } from "./config";
import routes from "./routes";
import errorHandler from "./middleware/error-handler";

import helmet from "helmet";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://eventliveclient.netlify.app",
];

// Security Headers
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/public", express.static(path.join(__dirname, "../public")));

app.use("/api", routes);

app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({
    status: "OK",
    message: "EventLive API is running",
  });
});

app.use((_req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
  });
});

app.use(errorHandler);

app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Global Error:", err.message);

    res.status(err.status || 500).json({
      status: "error",
      message: err.message || "Internal Server Error",
    });
  }
);

export default app;
