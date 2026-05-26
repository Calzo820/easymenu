import crypto from "node:crypto";
import { logError } from "./logger.js";

export function enrichEvent(eventName, payload = {}) {
  return {
    ...payload,
    eventName,
    eventId: payload.eventId || crypto.randomUUID(),
    emittedAt: new Date().toISOString(),
  };
}

export function safeEmit(io, room, eventName, payload = {}) {
  if (!io) return false;
  const eventPayload = enrichEvent(eventName, payload);
  try {
    if (room) io.to(room).emit(eventName, eventPayload);
    else io.emit(eventName, eventPayload);
    return true;
  } catch (error) {
    logError({ source: "socket:emit", message: error?.message || "Errore emissione socket", error, metadata: { room, eventName, payload } }).catch(() => {});
    return false;
  }
}
