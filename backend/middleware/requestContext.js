import crypto from "node:crypto";
import { logInfo } from "../lib/structuredLogger.js";

export function requestContext(req, res, next) {
  req.requestId = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  const startedAt = Date.now();
  res.on("finish", () => {
    logInfo("http", `${req.method} ${req.path}`, { requestId: req.requestId, statusCode: res.statusCode, durationMs: Date.now() - startedAt });
  });
  next();
}
