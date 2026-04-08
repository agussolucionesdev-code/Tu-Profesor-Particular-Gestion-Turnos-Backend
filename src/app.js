import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import bookingRoutes from "./routes/bookingRoutes.js";
import authRoutes from "./routes/authRoutes.js";

if (process.env.NODE_ENV !== "test") {
  dotenv.config();
}

const app = express();

const normalizeOrigin = (value) => String(value || "").trim().replace(/\/$/, "");
const parseTrustProxy = (value) => {
  if (value === undefined || value === null || value === "") {
    return process.env.NODE_ENV === "production" ? 1 : false;
  }

  if (value === "true") return true;
  if (value === "false") return false;

  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? value : numericValue;
};
const getDbHealth = () => {
  const stateMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  const readyState = mongoose.connection.readyState;

  return {
    readyState,
    state: stateMap[readyState] || "unknown",
    isConnected: readyState === 1,
  };
};
const configuredOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);
const defaultDevOrigins = [
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:4174",
  "http://127.0.0.1:4174",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
const allowedOrigins = [...new Set([...configuredOrigins, ...defaultDevOrigins])];
const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);

if (trustProxy !== false) {
  app.set("trust proxy", trustProxy);
}

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      const normalizedOrigin = normalizeOrigin(origin);

      if (
        !origin ||
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(normalizedOrigin)
      ) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_MAX || 200),
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(express.json({ limit: "50kb" }));

app.get("/health", (req, res) => {
  const dbHealth = getDbHealth();

  res.status(dbHealth.isConnected ? 200 : 503).json({
    status: dbHealth.isConnected ? "success" : "error",
    message: "Agustin Sosa Pro-API is operational",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    database: dbHealth,
  });
});

app.use("/api/bookings", bookingRoutes);
app.use("/api/auth", authRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "The requested resource was not found on this server.",
  });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  console.error(`[SYSTEM ERROR]: ${err.message}`);

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

export default app;
