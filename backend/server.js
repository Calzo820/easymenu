import crypto from "node:crypto";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import authRoutes from "./routes/auth.routes.js";
import restaurantRoutes from "./routes/restaurant.routes.js";
import menuRoutes from "./routes/menu.routes.js";
import tableRoutes from "./routes/table.routes.js";
import reservationRoutes from "./routes/reservation.routes.js";
import orderRoutes from "./routes/order.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import onboardingRoutes from "./routes/onboarding.routes.js";
import userRoutes from "./routes/user.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import logRoutes from "./routes/log.routes.js";
import demoRoutes from "./routes/demo.routes.js";
import { handleStripeWebhook } from "./controllers/payment.controller.js";
import prisma from "./lib/prisma.js";
import { validateEnvironment } from "./lib/env.js";
import { logError } from "./lib/logger.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envStatus = validateEnvironment();
const isProduction = process.env.NODE_ENV === "production";

function devLog(...args) {
  if (!isProduction) console.log(...args);
}

const app = express();
const server = http.createServer(app);

const allowedOrigins = String(
  process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:4173"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin non consentita"));
    },
    credentials: true,
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  devLog(`Socket connesso: ${socket.id}`);

  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (token) {
    try {
      const decoded = jwt.verify(String(token), process.env.JWT_SECRET);
      if (decoded?.restaurantId) {
        socket.join(`restaurant:${decoded.restaurantId}`);
        socket.data.restaurantId = decoded.restaurantId;
        socket.data.role = decoded.role;
      }
    } catch {
      socket.emit("auth-warning", { message: "Socket connesso senza autenticazione valida" });
    }
  }

  socket.on("join-public-restaurant", () => {
    socket.emit("auth-required", { message: "Canale riservato agli utenti autenticati" });
  });

  socket.on("disconnect", () => {
    devLog(`Socket disconnesso: ${socket.id}`);
  });
});

const rateStore = new Map();

function createRateLimiter({ windowMs, maxRequests }) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const entry = rateStore.get(key);

    if (!entry || now > entry.resetAt) {
      rateStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      return res.status(429).json({ message: "Troppe richieste, riprova tra poco" });
    }

    entry.count += 1;
    return next();
  };
}

app.disable("x-powered-by");

app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Request-Id", requestId);
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin non consentita"));
    },
    credentials: true,
  })
);

app.post("/payments/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

app.use(express.json({ limit: "5mb" }));

app.use((req, _res, next) => {
  devLog(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.use("/auth/login", createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 20 }));
app.use("/auth/register", createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 10 }));
app.use("/demo/ensure", createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 5 }));
app.use("/orders/public", createRateLimiter({ windowMs: 5 * 60 * 1000, maxRequests: 40 }));

app.get("/", (_req, res) => {
  res.json({
    message: "Backend EasyMenu attivo",
    environment: envStatus.nodeEnv,
    paymentsEnabled: envStatus.paymentsEnabled,
    webhookEnabled: envStatus.webhookEnabled,
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "easymenu-backend", timestamp: new Date().toISOString() });
});

app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, database: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ ok: false, database: "unavailable" });
  }
});

app.use("/auth", authRoutes);
app.use("/restaurants", restaurantRoutes);
app.use("/menu", menuRoutes);
app.use("/tables", tableRoutes);
app.use("/reservations", reservationRoutes);
app.use("/orders", orderRoutes);
app.use("/payments", paymentRoutes);
app.use("/subscriptions", subscriptionRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/onboarding", onboardingRoutes);
app.use("/users", userRoutes);
app.use("/logs", logRoutes);
app.use("/demo", demoRoutes);

if (process.env.NODE_ENV === "production") {
  const staticDir = path.resolve(__dirname, "../dist");
  app.use(express.static(staticDir, { index: false, maxAge: "1d" }));
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith("/auth") || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

app.use((req, res) => {
  res.status(404).json({ message: "Rotta non trovata" });
});

app.use(async (error, req, res, _next) => {
  console.error("Unhandled error:", error);

  await logError({
    restaurantId: req.user?.restaurantId || null,
    source: `${req.method} ${req.path}`,
    message: error?.message || "Unhandled backend error",
    error,
    metadata: { requestId: res.getHeader("X-Request-Id"), query: req.query },
  });

  if (error?.message === "Origin non consentita") {
    return res.status(403).json({ message: "Origin non consentita" });
  }

  return res.status(500).json({ message: "Errore interno del server" });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    console.log(`Server attivo su http://localhost:${PORT}`);
  });
}

export { app, server, io };
