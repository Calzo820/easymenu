import prisma from "../lib/prisma.js";
import { collectSystemHealth } from "../services/healthMonitor.service.js";

export async function getDetailedSystemHealth(req, res) {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ message: "Accesso riservato al SuperAdmin" });
  }
  const health = await collectSystemHealth();
  health.realtimeClients = Number(req.app.get("io")?.engine?.clientsCount || 0);
  return res.status(health.ok ? 200 : 503).json(health);
}

export async function getSystemOverview(req, res) {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ message: "Accesso riservato al SuperAdmin" });
  }

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [health, logs] = await Promise.all([
      collectSystemHealth(),
      prisma.errorLog.findMany({
        where: {
          createdAt: { gte: since },
          resolvedAt: null,
          level: { in: ["error", "payment", "warning"] },
        },
        select: {
          id: true,
          restaurantId: true,
          level: true,
          source: true,
          message: true,
          createdAt: true,
          restaurant: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const byRestaurant = new Map();
    logs.forEach((log) => {
      if (!log.restaurantId || !log.restaurant) return;
      const current = byRestaurant.get(log.restaurantId) || {
        restaurantId: log.restaurantId,
        name: log.restaurant.name,
        slug: log.restaurant.slug,
        errors: 0,
        paymentAlerts: 0,
        lastAlertAt: log.createdAt,
        lastSource: log.source,
      };
      current.errors += 1;
      if (log.level === "payment" || /stripe|webhook|payment/i.test(log.source)) current.paymentAlerts += 1;
      byRestaurant.set(log.restaurantId, current);
    });

    const safeAlerts = logs.slice(0, 20).map((log) => ({
      id: log.id,
      restaurantId: log.restaurantId,
      restaurantName: log.restaurant?.name || "Piattaforma",
      level: log.level,
      source: log.source,
      message: String(log.message || "Errore tecnico").slice(0, 220),
      createdAt: log.createdAt,
    }));

    return res.json({
      health: {
        ...health,
        realtimeClients: Number(req.app.get("io")?.engine?.clientsCount || 0),
      },
      technical: {
        unresolved24h: logs.length,
        paymentAlerts24h: logs.filter((log) => log.level === "payment" || /stripe|webhook|payment/i.test(log.source)).length,
        affectedRestaurants24h: byRestaurant.size,
        restaurants: [...byRestaurant.values()]
          .sort((a, b) => b.errors - a.errors)
          .slice(0, 12),
        alerts: safeAlerts,
      },
      privacy: {
        economicDataIncluded: false,
        customerDataIncluded: false,
        orderDetailsIncluded: false,
      },
    });
  } catch (error) {
    console.error("getSystemOverview error:", error);
    return res.status(500).json({ message: "Monitoraggio tecnico non disponibile" });
  }
}
