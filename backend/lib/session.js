import crypto from "node:crypto";

const DEFAULT_SESSION_DAYS = 14;

export function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export function createRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}

export function getSessionExpiry() {
  const days = Number(process.env.SESSION_DAYS || DEFAULT_SESSION_DAYS);
  return new Date(Date.now() + Math.max(1, days) * 24 * 60 * 60 * 1000);
}

export function getRefreshCookieOptions() {
  const production = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? "none" : "lax",
    path: "/auth",
    maxAge: Math.max(1, Number(process.env.SESSION_DAYS || DEFAULT_SESSION_DAYS)) * 24 * 60 * 60 * 1000,
  };
}

export function readCookie(req, name) {
  const header = req.headers.cookie || "";
  const cookies = Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf("=");
        if (idx === -1) return [part, ""];
        return [part.slice(0, idx), decodeURIComponent(part.slice(idx + 1))];
      })
  );
  return cookies[name] || "";
}
