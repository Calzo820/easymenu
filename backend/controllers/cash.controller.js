import prisma from "../lib/prisma.js";
import { writeAudit } from "../lib/audit.js";

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseRange(query = {}) {
  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(String(query.date || ""))
    ? String(query.date)
    : new Date().toISOString().slice(0, 10);
  const from = query.from ? new Date(String(query.from)) : new Date(`${dateKey}T00:00:00.000Z`);
  const to = query.to ? new Date(String(query.to)) : new Date(`${dateKey}T23:59:59.999Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return { dateKey, from, to, businessDate: new Date(`${dateKey}T00:00:00.000Z`) };
}

function paymentMethod(payment) {
  return payment.method || (payment.provider === "stripe" ? "online" : "other");
}

async function buildSummary(restaurantId, range) {
  const [orders, payments, openOrders, closure] = await Promise.all([
    prisma.order.findMany({
      where: {
        restaurantId,
        closedAt: { gte: range.from, lte: range.to },
        status: { not: "cancelled" },
      },
      include: {
        table: true,
        items: true,
        payments: { where: { status: "paid" }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { closedAt: "desc" },
    }),
    prisma.paymentTransaction.findMany({
      where: {
        restaurantId,
        status: "paid",
        OR: [
          { paidAt: { gte: range.from, lte: range.to } },
          { paidAt: null, createdAt: { gte: range.from, lte: range.to } },
        ],
      },
      include: { order: { include: { table: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.findMany({
      where: {
        restaurantId,
        closedAt: null,
        status: { notIn: ["served", "cancelled"] },
      },
      include: { table: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.cashClosure.findUnique({
      where: {
        restaurantId_businessDate: {
          restaurantId,
          businessDate: range.businessDate,
        },
      },
      include: { closedBy: { select: { id: true, name: true, role: true } } },
    }),
  ]);

  const totals = { cash: 0, card: 0, online: 0, satispay: 0, other: 0 };
  for (const payment of payments) {
    const method = paymentMethod(payment);
    totals[method] = (totals[method] || 0) + number(payment.amount);
  }

  const ordersWithRecordedPayments = new Set(payments.map((payment) => payment.orderId));
  for (const order of orders) {
    if (ordersWithRecordedPayments.has(order.id)) continue;
    const method = order.paymentMethod || "other";
    totals[method] = (totals[method] || 0) + number(order.totalAmount);
  }

  const grossTotal = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const voidedItems = orders.reduce(
    (sum, order) => sum + order.items.filter((item) => item.status === "voided").length,
    0
  );
  const complimentaryItems = orders.reduce(
    (sum, order) => sum + order.items.filter((item) => item.isComplimentary).length,
    0
  );

  return {
    date: range.dateKey,
    from: range.from,
    to: range.to,
    grossTotal,
    expectedCash: totals.cash,
    totals,
    orderCount: orders.length,
    paymentCount: payments.length,
    voidedItems,
    complimentaryItems,
    openOrders: openOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      table: order.table?.name || order.table?.code || "Tavolo",
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
    })),
    recentOrders: orders.slice(0, 30).map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      table: order.table?.name || order.table?.code || "Tavolo",
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      payments: order.payments,
      closedAt: order.closedAt,
    })),
    closure,
  };
}

export const getCashSummary = async (req, res) => {
  try {
    const range = parseRange(req.query);
    if (!range) return res.status(400).json({ message: "Data non valida" });
    return res.json(await buildSummary(req.user.restaurantId, range));
  } catch (error) {
    console.error("getCashSummary error:", error);
    return res.status(500).json({ message: "Riepilogo cassa non disponibile" });
  }
};

export const closeCashDay = async (req, res) => {
  try {
    const range = parseRange(req.body || {});
    if (!range) return res.status(400).json({ message: "Data non valida" });
    const declaredCash = number(req.body?.declaredCash);
    if (declaredCash < 0) return res.status(400).json({ message: "Il contante dichiarato non può essere negativo" });

    const summary = await buildSummary(req.user.restaurantId, range);
    if (summary.openOrders.length) {
      return res.status(409).json({
        message: `Ci sono ancora ${summary.openOrders.length} conti aperti. Chiudili prima della chiusura giornaliera.`,
        openOrders: summary.openOrders,
      });
    }

    const notes = String(req.body?.notes || "").trim().slice(0, 1000) || null;
    const difference = declaredCash - summary.expectedCash;
    const closure = await prisma.$transaction(async (tx) => {
      const row = await tx.cashClosure.upsert({
        where: {
          restaurantId_businessDate: {
            restaurantId: req.user.restaurantId,
            businessDate: range.businessDate,
          },
        },
        create: {
          restaurantId: req.user.restaurantId,
          businessDate: range.businessDate,
          grossTotal: summary.grossTotal,
          expectedCash: summary.expectedCash,
          declaredCash,
          difference,
          cardTotal: summary.totals.card,
          onlineTotal: summary.totals.online,
          otherTotal: summary.totals.satispay + summary.totals.other,
          orderCount: summary.orderCount,
          paymentCount: summary.paymentCount,
          notes,
          status: "closed",
          closedByUserId: req.user?.userId || null,
          closedAt: new Date(),
          reopenedAt: null,
        },
        update: {
          grossTotal: summary.grossTotal,
          expectedCash: summary.expectedCash,
          declaredCash,
          difference,
          cardTotal: summary.totals.card,
          onlineTotal: summary.totals.online,
          otherTotal: summary.totals.satispay + summary.totals.other,
          orderCount: summary.orderCount,
          paymentCount: summary.paymentCount,
          notes,
          status: "closed",
          closedByUserId: req.user?.userId || null,
          closedAt: new Date(),
          reopenedAt: null,
        },
        include: { closedBy: { select: { id: true, name: true, role: true } } },
      });
      await writeAudit(tx, req, {
        action: "cash_day.closed",
        entityType: "cash_closure",
        entityId: row.id,
        metadata: {
          date: range.dateKey,
          grossTotal: summary.grossTotal,
          expectedCash: summary.expectedCash,
          declaredCash,
          difference,
        },
      });
      return row;
    });

    return res.status(201).json({ message: "Giornata chiusa correttamente", closure, summary });
  } catch (error) {
    console.error("closeCashDay error:", error);
    return res.status(500).json({ message: "Errore durante la chiusura giornaliera" });
  }
};

export const listCashClosures = async (req, res) => {
  try {
    const rows = await prisma.cashClosure.findMany({
      where: { restaurantId: req.user.restaurantId },
      include: { closedBy: { select: { id: true, name: true, role: true } } },
      orderBy: { businessDate: "desc" },
      take: 120,
    });
    return res.json(rows);
  } catch (error) {
    console.error("listCashClosures error:", error);
    return res.status(500).json({ message: "Storico chiusure non disponibile" });
  }
};

export const reopenCashDay = async (req, res) => {
  try {
    const row = await prisma.cashClosure.findFirst({
      where: { id: req.params.id, restaurantId: req.user.restaurantId },
    });
    if (!row) return res.status(404).json({ message: "Chiusura non trovata" });
    const reason = String(req.body?.reason || "").trim().slice(0, 300);
    if (!reason) return res.status(400).json({ message: "Indica il motivo della riapertura" });

    const closure = await prisma.$transaction(async (tx) => {
      const updated = await tx.cashClosure.update({
        where: { id: row.id },
        data: { status: "reopened", reopenedAt: new Date() },
      });
      await writeAudit(tx, req, {
        action: "cash_day.reopened",
        entityType: "cash_closure",
        entityId: row.id,
        reason,
      });
      return updated;
    });
    return res.json({ message: "Chiusura riaperta", closure });
  } catch (error) {
    console.error("reopenCashDay error:", error);
    return res.status(500).json({ message: "Errore durante la riapertura della giornata" });
  }
};
