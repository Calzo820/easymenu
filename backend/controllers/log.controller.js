import prisma from "../lib/prisma.js";

export async function getErrorLogs(req, res) {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const logs = await prisma.errorLog.findMany({
      where: { restaurantId: req.user.restaurantId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return res.json(logs);
  } catch (error) {
    console.error("getErrorLogs error:", error);
    return res.status(500).json({ message: "Errore durante recupero log" });
  }
}

export async function markErrorResolved(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.errorLog.findFirst({ where: { id, restaurantId: req.user.restaurantId } });
    if (!existing) return res.status(404).json({ message: "Log non trovato" });
    const log = await prisma.errorLog.update({ where: { id }, data: { resolvedAt: new Date() } });
    return res.json({ message: "Log segnato come risolto", log });
  } catch (error) {
    console.error("markErrorResolved error:", error);
    return res.status(500).json({ message: "Errore durante aggiornamento log" });
  }
}
