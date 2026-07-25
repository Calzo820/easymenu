import prisma from "../lib/prisma.js";

let monitorTimer = null;
let lastHealthy = null;

export async function collectSystemHealth() {
  const startedAt = Date.now();
  const checks = {
    database: { ok: false },
    stripe: { ok: Boolean(process.env.STRIPE_SECRET_KEY), configured: Boolean(process.env.STRIPE_SECRET_KEY) },
    email: { ok: Boolean(process.env.BREVO_API_KEY), configured: Boolean(process.env.BREVO_API_KEY) },
    backups: {
      ok: String(process.env.BACKUP_ENABLED || "").toLowerCase() === "true",
      configured: Boolean(process.env.BACKUP_ENCRYPTION_KEY),
    },
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true };
  } catch (error) {
    checks.database = { ok: false, code: error?.code || "database_unavailable" };
  }

  const healthy = checks.database.ok;
  return {
    ok: healthy,
    service: "easymenu-backend",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    responseTimeMs: Date.now() - startedAt,
    uptimeSeconds: Math.round(process.uptime()),
    checks,
  };
}

async function notifyMonitor(payload) {
  const url = String(process.env.MONITOR_WEBHOOK_URL || "").trim();
  if (!url) return;
  const token = String(process.env.MONITOR_WEBHOOK_TOKEN || "").trim();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Monitor webhook HTTP ${response.status}`);
}

async function runMonitorCheck() {
  try {
    const health = await collectSystemHealth();
    if (lastHealthy === null) {
      lastHealthy = health.ok;
      if (!health.ok) {
        await notifyMonitor({
          event: "service_unhealthy",
          service: health.service,
          timestamp: health.timestamp,
          checks: health.checks,
        });
      }
      return;
    }
    if (health.ok !== lastHealthy) {
      await notifyMonitor({
        event: health.ok ? "service_recovered" : "service_unhealthy",
        service: health.service,
        timestamp: health.timestamp,
        checks: health.checks,
      });
      lastHealthy = health.ok;
    }
  } catch (error) {
    console.error("health monitor error:", error.message);
  }
}

export function startHealthMonitor() {
  if (monitorTimer || !process.env.MONITOR_WEBHOOK_URL) return;
  const configured = Number(process.env.MONITOR_INTERVAL_MS || 300000);
  const intervalMs = Math.max(60000, Number.isFinite(configured) ? configured : 300000);
  monitorTimer = setInterval(runMonitorCheck, intervalMs);
  monitorTimer.unref?.();
  setTimeout(runMonitorCheck, 10000).unref?.();
}

export function stopHealthMonitor() {
  if (monitorTimer) clearInterval(monitorTimer);
  monitorTimer = null;
}
