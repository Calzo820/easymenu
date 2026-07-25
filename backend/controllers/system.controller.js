import { collectSystemHealth } from "../services/healthMonitor.service.js";

export async function getDetailedSystemHealth(req, res) {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ message: "Accesso riservato al SuperAdmin" });
  }
  const health = await collectSystemHealth();
  return res.status(health.ok ? 200 : 503).json(health);
}
