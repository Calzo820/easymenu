import prisma from "../lib/prisma.js";
import { writeAudit } from "../lib/audit.js";

function parseNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePaymentMethod(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  if (["contanti", "cash"].includes(raw)) return "cash";
  if (["carta", "card", "pos"].includes(raw)) return "card";
  if (["online", "stripe", "paypal"].includes(raw)) return "online";
  if (["satispay"].includes(raw)) return "satispay";
  return "other";
}

function normalizedPaymentRows(rows = []) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row, index) => ({
      method: normalizePaymentMethod(row?.method),
      amount: Math.round(parseNumber(row?.amount) * 100) / 100,
      splitLabel: String(row?.label || `Quota ${index + 1}`).trim().slice(0, 80),
    }))
    .filter((row) => row.method && row.amount > 0);
}

function paidPaymentsTotal(payments = []) {
  return payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + parseNumber(payment.amount), 0);
}

function emitSocket(req, eventName, payload = {}) {
  const io = req.app.get("io");
  if (!io) return;
  if (payload.restaurantId) {
    io.to(`restaurant:${payload.restaurantId}`).emit(eventName, payload);
    return;
  }
  io.emit(eventName, payload);
}

function canTransitionStatus(currentStatus, nextStatus) {
  const allowedTransitions = {
    pending: ["in_progress", "cancelled", "served"],
    in_progress: ["pending", "ready", "cancelled", "served"],
    ready: ["in_progress", "served"],
    served: [],
    cancelled: [],
  };
  return (allowedTransitions[currentStatus] || []).includes(nextStatus);
}

function publicOrderNumber(orderNumber) {
  return `ORD-${String(orderNumber || 1).padStart(4, "0")}`;
}

function orderItemsTotal(items = []) {
  return items.reduce((sum, item) => {
    if (item.status === "voided" || item.isComplimentary) return sum;
    return sum + parseNumber(item.priceSnapshot) * parseNumber(item.quantity, 1);
  }, 0);
}

function buildIdempotencyKey({ restaurantId, tableId, tableSessionId, clientRequestId }) {
  const safe = clientRequestId ? String(clientRequestId).trim().slice(0, 120) : null;
  if (!safe || !restaurantId || !tableId) return null;
  return [restaurantId, tableId, tableSessionId || "no-session", safe].join(":");
}

async function nextOrderNumber(tx, restaurantId) {
  const counter = await tx.orderCounter.upsert({
    where: { restaurantId },
    create: { restaurantId, nextNumber: 2 },
    update: { nextNumber: { increment: 1 } },
  });
  return counter.nextNumber - 1;
}

async function ensureRestaurantAccess(req, orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      table: true,
      items: { include: { menuItem: true } },
      payments: { orderBy: { createdAt: "asc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) return null;
  if (req.user?.restaurantId && order.restaurantId !== req.user.restaurantId) return "FORBIDDEN";
  return order;
}

async function recalcOrderTotal(tx, orderId) {
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return null;
  const totalAmount = Math.max(0, orderItemsTotal(order.items) + parseNumber(order.extraAmount) - parseNumber(order.discountAmount));
  return tx.order.update({ where: { id: orderId }, data: { totalAmount }, include: { table: true, items: true } });
}

async function recalcSessionTotal(tx, tableSessionId) {
  if (!tableSessionId) return;
  const orders = await tx.order.findMany({ where: { tableSessionId, status: { not: "cancelled" } }, include: { items: true } });
  const totalAmount = orders.reduce((sum, order) => sum + Math.max(0, orderItemsTotal(order.items) + parseNumber(order.extraAmount) - parseNumber(order.discountAmount)), 0);
  await tx.tableSession.update({ where: { id: tableSessionId }, data: { totalAmount } });
}

export const createPublicOrder = async (req, res) => {
  try {
    const { restaurantSlug, tableToken, restaurantId, tableId, customerName, notes, items, clientRequestId } = req.body || {};

    const hasQrIdentity = Boolean(restaurantSlug && tableToken);
    const hasIdIdentity = Boolean(restaurantId && tableId);

    if (!hasQrIdentity && !hasIdIdentity) {
      return res.status(400).json({
        message: "restaurantSlug/tableToken oppure restaurantId/tableId sono obbligatori",
      });
    }

    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "L'ordine deve contenere almeno un articolo" });

    const safeClientRequestId = clientRequestId ? String(clientRequestId).trim().slice(0, 120) : null;

    let table = null;

    if (hasQrIdentity) {
      table = await prisma.table.findFirst({
        where: { qrToken: String(tableToken), isActive: true, restaurant: { slug: String(restaurantSlug), isActive: true } },
        include: { restaurant: true },
      });
    }

    if (!table && hasIdIdentity) {
      table = await prisma.table.findFirst({
        where: { id: String(tableId), restaurantId: String(restaurantId), isActive: true, restaurant: { isActive: true } },
        include: { restaurant: true },
      });
    }

    if (!table) return res.status(404).json({ message: "Tavolo o ristorante non trovato" });

    let openSession = await prisma.tableSession.findFirst({
      where: { restaurantId: table.restaurantId, tableId: table.id, status: "open" },
      orderBy: { openedAt: "desc" },
    });
    const idempotencyKey = buildIdempotencyKey({ restaurantId: table.restaurantId, tableId: table.id, tableSessionId: openSession?.id, clientRequestId: safeClientRequestId });
    if (idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey },
        include: { restaurant: true, table: true, items: { include: { menuItem: true } } },
      });
      if (existing) {
        return res.status(200).json({
          message: "Ordine già ricevuto",
          order: {
            id: existing.id,
            publicToken: existing.publicToken,
            status: existing.status,
            notes: existing.notes,
            orderNumber: publicOrderNumber(existing.orderNumber),
            restaurantName: existing.restaurant?.name,
            tableName: existing.table?.name,
            table: existing.table ? { id: existing.table.id, name: existing.table.name, code: existing.table.code } : null,
            items: existing.items,
            totalAmount: existing.totalAmount,
            createdAt: existing.createdAt,
          },
        });
      }
    }

    const validItems = items.filter((item) => item?.menuItemId && parseNumber(item.quantity) > 0);
    if (!validItems.length) return res.status(400).json({ message: "Nessun articolo valido nell'ordine" });

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: validItems.map((item) => item.menuItemId) }, restaurantId: table.restaurantId, isAvailable: true, isDeleted: false },
    });
    const menuById = new Map(menuItems.map((item) => [item.id, item]));
    const orderItemsData = validItems.map((item) => {
      const menuItem = menuById.get(item.menuItemId);
      if (!menuItem) return null;
      return {
        menuItemId: menuItem.id,
        quantity: Math.max(1, Math.trunc(parseNumber(item.quantity, 1))),
        notes: String(item.notes || "").slice(0, 300) || null,
        nameSnapshot: menuItem.name,
        priceSnapshot: menuItem.price,
        costSnapshot: menuItem.costPrice,
        categorySnapshot: menuItem.category || "Altro",
        preparationArea: menuItem.preparationArea,
      };
    }).filter(Boolean);
    if (!orderItemsData.length) return res.status(400).json({ message: "Gli articoli selezionati non sono validi o disponibili" });

    const order = await prisma.$transaction(async (tx) => {
      let session = await tx.tableSession.findFirst({ where: { restaurantId: table.restaurantId, tableId: table.id, status: "open" }, orderBy: { openedAt: "desc" } });
      if (!session) {
        session = await tx.tableSession.create({ data: { restaurantId: table.restaurantId, tableId: table.id, status: "open", guestName: customerName ? String(customerName).slice(0, 100) : null, notes: notes ? String(notes).slice(0, 500) : null } });
      }
      const scopedIdempotencyKey = buildIdempotencyKey({ restaurantId: table.restaurantId, tableId: table.id, tableSessionId: session.id, clientRequestId: safeClientRequestId });
      if (scopedIdempotencyKey) {
        const existingInTx = await tx.order.findUnique({
          where: { idempotencyKey: scopedIdempotencyKey },
          include: { restaurant: true, table: true, items: { include: { menuItem: true } } },
        });
        if (existingInTx) return existingInTx;
      }
      const orderNumber = await nextOrderNumber(tx, table.restaurantId);
      for (const item of orderItemsData) {
        const source = menuById.get(item.menuItemId);
        if (!source?.trackStock) continue;
        const changed = await tx.menuItem.updateMany({
          where: {
            id: source.id,
            restaurantId: table.restaurantId,
            trackStock: true,
            stockQuantity: { gte: item.quantity },
          },
          data: { stockQuantity: { decrement: item.quantity } },
        });
        if (changed.count !== 1) {
          const stockError = new Error(`${source.name} non ha scorte sufficienti`);
          stockError.code = "INSUFFICIENT_STOCK";
          throw stockError;
        }
      }
      const created = await tx.order.create({
        data: {
          restaurantId: table.restaurantId,
          tableId: table.id,
          tableSessionId: session.id,
          customerName: customerName ? String(customerName).slice(0, 100) : null,
          notes: notes ? String(notes).slice(0, 500) : null,
          status: "pending",
          orderNumber,
          source: "qr",
          clientRequestId: safeClientRequestId,
          idempotencyKey: scopedIdempotencyKey,
          paymentStatus: "unpaid",
          totalAmount: orderItemsData.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0),
          items: { create: orderItemsData },
        },
        include: { restaurant: true, table: true, items: { include: { menuItem: true } } },
      });
      for (const createdItem of created.items) {
        const source = menuById.get(createdItem.menuItemId);
        if (!source?.trackStock) continue;
        const updatedStock = await tx.menuItem.findUnique({ where: { id: source.id } });
        await tx.stockMovement.create({
          data: {
            restaurantId: table.restaurantId,
            menuItemId: source.id,
            orderItemId: createdItem.id,
            type: "sale",
            quantityBefore: parseNumber(updatedStock.stockQuantity) + createdItem.quantity,
            quantityChange: -createdItem.quantity,
            quantityAfter: updatedStock.stockQuantity,
            reason: `Ordine ${publicOrderNumber(orderNumber)}`,
          },
        });
        if (parseNumber(updatedStock.stockQuantity) <= 0) {
          await tx.menuItem.update({ where: { id: source.id }, data: { isAvailable: false } });
        }
      }
      await recalcSessionTotal(tx, session.id);
      return created;
    });

    emitSocket(req, "new-order", { orderId: order.id, publicToken: order.publicToken, orderNumber: publicOrderNumber(order.orderNumber), tableName: order.table.name, tableId: order.table.id, restaurantId: order.restaurantId, restaurantName: order.restaurant.name, status: order.status, createdAt: order.createdAt });
    emitSocket(req, "table-updated", { tableName: order.table.name, tableId: order.table.id, restaurantId: order.restaurantId, reason: "new-order" });

    return res.status(201).json({ message: "Ordine creato correttamente", order: { id: order.id, publicToken: order.publicToken, status: order.status, notes: order.notes, orderNumber: publicOrderNumber(order.orderNumber), restaurantName: order.restaurant.name, tableName: order.table.name, table: { id: order.table.id, name: order.table.name, code: order.table.code }, items: order.items, totalAmount: order.totalAmount, createdAt: order.createdAt } });
  } catch (error) {
    console.error("createPublicOrder error:", error);
    if (error?.code === "INSUFFICIENT_STOCK") {
      return res.status(409).json({ message: error.message });
    }
    return res.status(500).json({ message: "Errore durante la creazione dell'ordine" });
  }
};

export const getPublicOrderByTokenOrId = async (req, res) => {
  try {
    const { token } = req.params;
    const order = await prisma.order.findFirst({ where: { OR: [{ publicToken: token }, { id: token }] }, include: { restaurant: true, table: true, items: { include: { menuItem: true } } } });
    if (!order) return res.status(404).json({ message: "Ordine non trovato" });
    return res.json({
      id: order.id,
      publicToken: order.publicToken,
      orderNumber: publicOrderNumber(order.orderNumber),
      status: order.status,
      notes: order.notes,
      restaurantName: order.restaurant?.name || null,
      tableName: order.table?.name || null,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      acceptedAt: order.acceptedAt,
      readyAt: order.readyAt,
      servedAt: order.servedAt,
      closedAt: order.closedAt,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      items: order.items.map((item) => ({ id: item.id, menuItemId: item.menuItemId, quantity: item.quantity, notes: item.notes, nameSnapshot: item.nameSnapshot, priceSnapshot: item.priceSnapshot, categorySnapshot: item.categorySnapshot, preparationArea: item.preparationArea || item.menuItem?.preparationArea || null })),
      table: order.table ? { id: order.table.id, name: order.table.name, code: order.table.code } : null,
    });
  } catch (error) {
    console.error("getPublicOrderByTokenOrId error:", error);
    return res.status(500).json({ message: "Errore durante il recupero dell'ordine" });
  }
};

export const getOrders = async (req, res) => {
  try {
    const { status, history, activeOnly, from, to } = req.query || {};
    const where = { restaurantId: req.user.restaurantId };

    if (status) {
      const statuses = String(status)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (statuses.length === 1) where.status = statuses[0];
      if (statuses.length > 1) where.status = { in: statuses };
    }

    if (history === "true") {
      where.OR = [
        { closedAt: { not: null } },
        { status: { in: ["served", "cancelled"] } },
        { paymentStatus: "paid" },
      ];
    }

    if (activeOnly === "true") {
      where.closedAt = null;
      where.status = { notIn: ["served", "cancelled"] };
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to));
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        table: true,
        items: { include: { menuItem: true } },
        payments: { orderBy: { createdAt: "asc" } },
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(orders.map((order) => ({ ...order, orderNumberLabel: publicOrderNumber(order.orderNumber) })));
  } catch (error) {
    console.error("getOrders error:", error);
    return res.status(500).json({ message: "Errore durante il recupero ordini" });
  }
};

export const getServiceOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        restaurantId: req.user.restaurantId,
        closedAt: null,
        status: { in: ["pending", "in_progress", "ready"] },
      },
      include: {
        table: true,
        items: { include: { menuItem: true } },
        payments: { orderBy: { createdAt: "asc" } },
      },
      orderBy: [{ createdAt: "asc" }],
    });

    return res.json(
      orders.map((order) => ({
        ...order,
        orderNumberLabel: publicOrderNumber(order.orderNumber),
      }))
    );
  } catch (error) {
    console.error("getServiceOrders error:", error);
    return res.status(500).json({ message: "Errore durante il recupero ordini servizio" });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ message: "Status obbligatorio" });
    const order = await ensureRestaurantAccess(req, id);
    if (!order) return res.status(404).json({ message: "Ordine non trovato" });
    if (order === "FORBIDDEN") return res.status(403).json({ message: "Accesso negato" });
    if (!canTransitionStatus(order.status, status)) return res.status(400).json({ message: `Transizione non consentita da ${order.status} a ${status}` });

    const data = { status };
    if (status === "pending") {
      data.acceptedAt = null;
      data.readyAt = null;
    }
    if (status === "in_progress" && !order.acceptedAt) data.acceptedAt = new Date();
    if (status === "in_progress") data.readyAt = null;
    if (status === "ready") data.readyAt = new Date();
    if (status === "served") data.servedAt = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      if (status === "cancelled") {
        for (const item of order.items) {
          if (!item.menuItem?.trackStock || item.status === "voided") continue;
          const current = await tx.menuItem.findUnique({ where: { id: item.menuItemId } });
          const before = parseNumber(current?.stockQuantity);
          const after = before + item.quantity;
          await tx.menuItem.update({ where: { id: item.menuItemId }, data: { stockQuantity: after } });
          await tx.stockMovement.create({
            data: {
              restaurantId: order.restaurantId,
              menuItemId: item.menuItemId,
              userId: req.user?.userId || null,
              orderItemId: item.id,
              type: "restore",
              quantityBefore: before,
              quantityChange: item.quantity,
              quantityAfter: after,
              reason: "Ordine annullato",
            },
          });
        }
      }
      const result = await tx.order.update({ where: { id }, data, include: { table: true, items: true } });
      await tx.orderStatusHistory.create({ data: { orderId: id, fromStatus: order.status, toStatus: status, changedByUserId: req.user?.userId || null, changedByRole: req.user?.role || null } });
      await writeAudit(tx, req, {
        action: "order.status_updated",
        entityType: "order",
        entityId: id,
        metadata: { from: order.status, to: status },
      });
      return result;
    });

    emitSocket(req, "order-updated", { orderId: updated.id, tableName: updated.table?.name, tableId: updated.table?.id, restaurantId: updated.restaurantId, status: updated.status, updatedAt: updated.updatedAt });
    emitSocket(req, "table-updated", { tableName: updated.table?.name, tableId: updated.table?.id, restaurantId: updated.restaurantId, reason: "order-status" });
    return res.json({ message: "Stato ordine aggiornato", order: updated });
  } catch (error) {
    console.error("updateOrderStatus error:", error);
    return res.status(500).json({ message: "Errore durante aggiornamento stato ordine" });
  }
};

export const addOrderExtra = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, quantity } = req.body || {};
    if (!name || parseNumber(price) < 0) return res.status(400).json({ message: "Nome e prezzo extra sono obbligatori" });
    const order = await ensureRestaurantAccess(req, id);
    if (!order) return res.status(404).json({ message: "Ordine non trovato" });
    if (order === "FORBIDDEN") return res.status(403).json({ message: "Accesso negato" });
    if (["served", "cancelled"].includes(order.status)) return res.status(400).json({ message: "Non puoi aggiungere extra a un ordine chiuso" });

    const result = await prisma.$transaction(async (tx) => {
      const extraItem = await tx.orderItem.create({ data: { orderId: order.id, menuItemId: null, quantity: Math.max(1, Math.trunc(parseNumber(quantity, 1))), notes: "extra cassa", nameSnapshot: String(name).slice(0, 120), priceSnapshot: parseNumber(price), categorySnapshot: "Extra", preparationArea: null } });
      const updated = await recalcOrderTotal(tx, order.id);
      if (order.tableSessionId) await recalcSessionTotal(tx, order.tableSessionId);
      return { extraItem, updated };
    });

    emitSocket(req, "order-updated", { orderId: order.id, tableName: order.table?.name, tableId: order.table?.id, restaurantId: order.restaurantId, status: order.status, reason: "extra-added" });
    emitSocket(req, "table-updated", { tableName: order.table?.name, tableId: order.table?.id, restaurantId: order.restaurantId, reason: "extra-added" });
    return res.status(201).json({ message: "Extra aggiunto", item: result.extraItem, order: result.updated });
  } catch (error) {
    console.error("addOrderExtra error:", error);
    return res.status(500).json({ message: "Errore durante aggiunta extra" });
  }
};

export const closeOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { discount, extra, paymentMethod, payments } = req.body || {};
    const order = await ensureRestaurantAccess(req, id);
    if (!order) return res.status(404).json({ message: "Ordine non trovato" });
    if (order === "FORBIDDEN") return res.status(403).json({ message: "Accesso negato" });

    const outcome = await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          discountAmount: Math.max(0, parseNumber(discount)),
          extraAmount: Math.max(0, parseNumber(extra)),
        },
      });
      let result = await recalcOrderTotal(tx, id);
      const existingPayments = await tx.paymentTransaction.findMany({
        where: { orderId: id, status: "paid" },
      });
      const rows = normalizedPaymentRows(payments);
      const alreadyPaid = paidPaymentsTotal(existingPayments);
      const remainingBeforeNew = Math.max(0, parseNumber(result.totalAmount) - alreadyPaid);

      if (!rows.length && paymentMethod && remainingBeforeNew > 0.009) {
        rows.push({
          method: normalizePaymentMethod(paymentMethod),
          amount: remainingBeforeNew,
          splitLabel: "Saldo conto",
        });
      }
      const newPaymentsTotal = rows.reduce((sum, row) => sum + row.amount, 0);
      if (newPaymentsTotal > remainingBeforeNew + 0.009) {
        const overpaymentError = new Error("L'importo inserito supera il saldo del conto");
        overpaymentError.code = "OVERPAYMENT";
        throw overpaymentError;
      }

      for (const row of rows) {
        await tx.paymentTransaction.create({
          data: {
            restaurantId: order.restaurantId,
            orderId: id,
            provider: "manual",
            amount: row.amount,
            currency: "EUR",
            status: "paid",
            method: row.method,
            splitLabel: row.splitLabel,
            paidAt: new Date(),
            createdByUserId: req.user?.userId || null,
          },
        });
      }

      const allPayments = await tx.paymentTransaction.findMany({
        where: { orderId: id, status: "paid" },
        orderBy: { createdAt: "asc" },
      });
      const paidTotal = paidPaymentsTotal(allPayments);
      const total = parseNumber(result.totalAmount);
      const methods = [...new Set(allPayments.map((payment) => payment.method).filter(Boolean))];

      if (paidTotal + 0.009 < total) {
        result = await tx.order.update({
          where: { id },
          data: {
            paymentStatus: paidTotal > 0 ? "pending" : "unpaid",
            paymentMethod: methods.length === 1 ? methods[0] : methods.length > 1 ? "other" : null,
          },
          include: { table: true, items: true, payments: { orderBy: { createdAt: "asc" } } },
        });
        await writeAudit(tx, req, {
          action: "order.partial_payment",
          entityType: "order",
          entityId: id,
          metadata: { paidTotal, remaining: total - paidTotal },
        });
        return { order: result, incomplete: true, paidTotal, remaining: total - paidTotal };
      }

      result = await tx.order.update({
        where: { id },
        data: {
          status: order.status === "cancelled" ? "cancelled" : "served",
          servedAt: order.servedAt || new Date(),
          closedAt: new Date(),
          paymentStatus: "paid",
          paymentMethod: methods.length === 1 ? methods[0] : "other",
          reopenedAt: null,
          reopenedByUserId: null,
        },
        include: { table: true, items: true, payments: { orderBy: { createdAt: "asc" } } },
      });
      if (order.status !== result.status) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: id,
            fromStatus: order.status,
            toStatus: result.status,
            changedByUserId: req.user?.userId || null,
            changedByRole: req.user?.role || null,
            note: "Conto chiuso",
          },
        });
      }
      if (result.tableSessionId) {
        await recalcSessionTotal(tx, result.tableSessionId);
        const openOrdersCount = await tx.order.count({
          where: { tableSessionId: result.tableSessionId, closedAt: null, status: { notIn: ["cancelled"] } },
        });
        if (openOrdersCount === 0) {
          await tx.tableSession.update({
            where: { id: result.tableSessionId },
            data: { status: "closed", closedAt: new Date() },
          });
        }
      }
      await writeAudit(tx, req, {
        action: "order.closed",
        entityType: "order",
        entityId: id,
        metadata: { total, paidTotal, methods },
      });
      return { order: result, incomplete: false, paidTotal, remaining: 0 };
    });

    if (outcome.incomplete) {
      emitSocket(req, "order-updated", {
        orderId: outcome.order.id,
        tableId: outcome.order.table?.id,
        restaurantId: outcome.order.restaurantId,
        reason: "partial-payment",
      });
      return res.status(409).json({
        message: `Pagamento registrato. Mancano ${outcome.remaining.toFixed(2)} EUR per chiudere il conto.`,
        ...outcome,
      });
    }

    const updated = outcome.order;
    emitSocket(req, "order-closed", { orderId: updated.id, tableName: updated.table?.name, tableId: updated.table?.id, restaurantId: updated.restaurantId, status: updated.status, closedAt: updated.closedAt });
    emitSocket(req, "table-updated", { tableName: updated.table?.name, tableId: updated.table?.id, restaurantId: updated.restaurantId, reason: "order-closed" });
    return res.json({ message: "Conto chiuso correttamente", order: updated, paidTotal: outcome.paidTotal });
  } catch (error) {
    console.error("closeOrder error:", error);
    if (error?.code === "OVERPAYMENT") return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: "Errore durante chiusura conto" });
  }
};

export const addOrderPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = normalizedPaymentRows(req.body?.payments || [req.body]);
    if (!rows.length) return res.status(400).json({ message: "Inserisci almeno un pagamento valido" });

    const order = await ensureRestaurantAccess(req, id);
    if (!order) return res.status(404).json({ message: "Ordine non trovato" });
    if (order === "FORBIDDEN") return res.status(403).json({ message: "Accesso negato" });
    if (order.closedAt) return res.status(400).json({ message: "Il conto è già chiuso" });
    const existingPaid = paidPaymentsTotal(order.payments || []);
    const rowsTotal = rows.reduce((sum, row) => sum + row.amount, 0);
    if (existingPaid + rowsTotal > parseNumber(order.totalAmount) + 0.009) {
      return res.status(400).json({ message: "L'importo inserito supera il saldo del conto" });
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        await tx.paymentTransaction.create({
          data: {
            restaurantId: order.restaurantId,
            orderId: id,
            provider: "manual",
            amount: row.amount,
            currency: "EUR",
            status: "paid",
            method: row.method,
            splitLabel: row.splitLabel,
            paidAt: new Date(),
            createdByUserId: req.user?.userId || null,
          },
        });
      }
      const allPayments = await tx.paymentTransaction.findMany({
        where: { orderId: id, status: "paid" },
        orderBy: { createdAt: "asc" },
      });
      const paidTotal = paidPaymentsTotal(allPayments);
      const remaining = Math.max(0, parseNumber(order.totalAmount) - paidTotal);
      const updated = await tx.order.update({
        where: { id },
        data: { paymentStatus: remaining <= 0.009 ? "paid" : "pending" },
        include: { table: true, items: true, payments: { orderBy: { createdAt: "asc" } } },
      });
      await writeAudit(tx, req, {
        action: "order.payment_added",
        entityType: "order",
        entityId: id,
        metadata: { paidTotal, remaining, rows },
      });
      return { order: updated, paidTotal, remaining };
    });

    emitSocket(req, "order-updated", {
      orderId: id,
      tableId: result.order.tableId,
      restaurantId: result.order.restaurantId,
      reason: "payment-added",
    });
    return res.status(201).json({ message: "Pagamento registrato", ...result });
  } catch (error) {
    console.error("addOrderPayment error:", error);
    return res.status(500).json({ message: "Errore durante la registrazione del pagamento" });
  }
};

export const updateOrderItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const action = String(req.body?.action || "").trim().toLowerCase();
    const reason = String(req.body?.reason || "").trim().slice(0, 300);
    if (!["void", "complimentary", "restore"].includes(action)) {
      return res.status(400).json({ message: "Azione articolo non valida" });
    }
    if (action !== "restore" && !reason) {
      return res.status(400).json({ message: "Indica il motivo dell'operazione" });
    }

    const order = await ensureRestaurantAccess(req, id);
    if (!order) return res.status(404).json({ message: "Ordine non trovato" });
    if (order === "FORBIDDEN") return res.status(403).json({ message: "Accesso negato" });
    if (order.closedAt) return res.status(400).json({ message: "Riapri il conto prima di modificarlo" });
    const currentItem = order.items.find((item) => item.id === itemId);
    if (!currentItem) return res.status(404).json({ message: "Articolo non trovato" });

    const result = await prisma.$transaction(async (tx) => {
      if (currentItem.menuItem?.trackStock) {
        if (action === "void" && currentItem.status !== "voided") {
          const before = parseNumber(currentItem.menuItem.stockQuantity);
          const after = before + currentItem.quantity;
          await tx.menuItem.update({
            where: { id: currentItem.menuItemId },
            data: { stockQuantity: after },
          });
          await tx.stockMovement.create({
            data: {
              restaurantId: order.restaurantId,
              menuItemId: currentItem.menuItemId,
              userId: req.user?.userId || null,
              orderItemId: currentItem.id,
              type: "restore",
              quantityBefore: before,
              quantityChange: currentItem.quantity,
              quantityAfter: after,
              reason,
            },
          });
        }
        if (action === "restore" && currentItem.status === "voided") {
          const before = parseNumber(currentItem.menuItem.stockQuantity);
          if (before < currentItem.quantity) {
            const stockError = new Error("Scorte insufficienti per ripristinare l'articolo");
            stockError.code = "INSUFFICIENT_STOCK";
            throw stockError;
          }
          const after = before - currentItem.quantity;
          await tx.menuItem.update({
            where: { id: currentItem.menuItemId },
            data: { stockQuantity: after, isAvailable: after > 0 ? currentItem.menuItem.isAvailable : false },
          });
          await tx.stockMovement.create({
            data: {
              restaurantId: order.restaurantId,
              menuItemId: currentItem.menuItemId,
              userId: req.user?.userId || null,
              orderItemId: currentItem.id,
              type: "sale",
              quantityBefore: before,
              quantityChange: -currentItem.quantity,
              quantityAfter: after,
              reason: "Ripristino articolo sul conto",
            },
          });
        }
      }

      const data = action === "void"
        ? {
            status: "voided",
            voidReason: reason,
            voidedAt: new Date(),
            voidedByUserId: req.user?.userId || null,
            isComplimentary: false,
            complimentaryReason: null,
          }
        : action === "complimentary"
          ? {
              status: "active",
              voidReason: null,
              voidedAt: null,
              voidedByUserId: null,
              isComplimentary: true,
              complimentaryReason: reason,
            }
          : {
              status: "active",
              voidReason: null,
              voidedAt: null,
              voidedByUserId: null,
              isComplimentary: false,
              complimentaryReason: null,
            };

      const item = await tx.orderItem.update({ where: { id: itemId }, data });
      const updated = await recalcOrderTotal(tx, id);
      if (order.tableSessionId) await recalcSessionTotal(tx, order.tableSessionId);
      await writeAudit(tx, req, {
        action: `order_item.${action}`,
        entityType: "order",
        entityId: id,
        reason,
        metadata: { itemId, itemName: currentItem.nameSnapshot, quantity: currentItem.quantity },
      });
      return { item, order: updated };
    });

    emitSocket(req, "order-updated", {
      orderId: id,
      tableId: order.tableId,
      restaurantId: order.restaurantId,
      reason: `item-${action}`,
    });
    return res.json({ message: "Conto aggiornato", ...result });
  } catch (error) {
    console.error("updateOrderItem error:", error);
    if (error?.code === "INSUFFICIENT_STOCK") return res.status(409).json({ message: error.message });
    return res.status(500).json({ message: "Errore durante l'aggiornamento dell'articolo" });
  }
};

export const reopenOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = String(req.body?.reason || "").trim().slice(0, 300);
    if (!reason) return res.status(400).json({ message: "Indica il motivo della riapertura" });
    const order = await ensureRestaurantAccess(req, id);
    if (!order) return res.status(404).json({ message: "Ordine non trovato" });
    if (order === "FORBIDDEN") return res.status(403).json({ message: "Accesso negato" });
    if (!order.closedAt) return res.status(400).json({ message: "Il conto è già aperto" });

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id },
        data: {
          status: "ready",
          closedAt: null,
          servedAt: null,
          reopenedAt: new Date(),
          reopenedByUserId: req.user?.userId || null,
        },
        include: { table: true, items: true, payments: { orderBy: { createdAt: "asc" } } },
      });
      if (order.tableSessionId) {
        await tx.tableSession.update({
          where: { id: order.tableSessionId },
          data: { status: "open", closedAt: null },
        });
      }
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: "ready",
          changedByUserId: req.user?.userId || null,
          changedByRole: req.user?.role || null,
          note: `Conto riaperto: ${reason}`,
        },
      });
      await writeAudit(tx, req, {
        action: "order.reopened",
        entityType: "order",
        entityId: id,
        reason,
      });
      return result;
    });

    emitSocket(req, "order-updated", {
      orderId: id,
      tableId: updated.tableId,
      restaurantId: updated.restaurantId,
      reason: "order-reopened",
    });
    emitSocket(req, "table-updated", {
      tableId: updated.tableId,
      restaurantId: updated.restaurantId,
      reason: "order-reopened",
    });
    return res.json({ message: "Conto riaperto", order: updated });
  } catch (error) {
    console.error("reopenOrder error:", error);
    return res.status(500).json({ message: "Errore durante la riapertura del conto" });
  }
};

export const getOrderAudit = async (req, res) => {
  try {
    const order = await ensureRestaurantAccess(req, req.params.id);
    if (!order) return res.status(404).json({ message: "Ordine non trovato" });
    if (order === "FORBIDDEN") return res.status(403).json({ message: "Accesso negato" });
    const rows = await prisma.auditLog.findMany({
      where: { restaurantId: order.restaurantId, entityType: "order", entityId: order.id },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return res.json(rows);
  } catch (error) {
    console.error("getOrderAudit error:", error);
    return res.status(500).json({ message: "Registro attività non disponibile" });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await ensureRestaurantAccess(req, id);
    if (!order) return res.status(404).json({ message: "Ordine non trovato" });
    if (order === "FORBIDDEN") return res.status(403).json({ message: "Accesso negato" });
    if (order.closedAt || order.paymentStatus === "paid") {
      return res.status(400).json({ message: "Un conto chiuso non può essere eliminato. Riaprilo per eventuali correzioni." });
    }

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (!item.menuItem?.trackStock || item.status === "voided") continue;
        const current = await tx.menuItem.findUnique({ where: { id: item.menuItemId } });
        const before = parseNumber(current?.stockQuantity);
        const after = before + item.quantity;
        await tx.menuItem.update({ where: { id: item.menuItemId }, data: { stockQuantity: after } });
        await tx.stockMovement.create({
          data: {
            restaurantId: order.restaurantId,
            menuItemId: item.menuItemId,
            userId: req.user?.userId || null,
            orderItemId: item.id,
            type: "restore",
            quantityBefore: before,
            quantityChange: item.quantity,
            quantityAfter: after,
            reason: "Ordine annullato",
          },
        });
      }
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: "cancelled",
          changedByUserId: req.user?.userId || null,
          changedByRole: req.user?.role || null,
          note: "Ordine annullato",
        },
      });
      await tx.order.update({
        where: { id },
        data: { status: "cancelled", closedAt: new Date() },
      });
      await writeAudit(tx, req, {
        action: "order.cancelled",
        entityType: "order",
        entityId: id,
        reason: "Annullato da amministrazione",
      });
      if (order.tableSessionId) await recalcSessionTotal(tx, order.tableSessionId);
    });

    emitSocket(req, "order-deleted", {
      orderId: order.id,
      tableName: order.table?.name,
      tableId: order.table?.id,
      restaurantId: order.restaurantId,
      deletedAt: new Date().toISOString(),
    });
    emitSocket(req, "table-updated", {
      tableName: order.table?.name,
      tableId: order.table?.id,
      restaurantId: order.restaurantId,
      reason: "order-deleted",
    });

    return res.json({ message: "Ordine annullato e conservato nel registro" });
  } catch (error) {
    console.error("deleteOrder error:", error);
    return res.status(500).json({ message: "Errore durante eliminazione ordine" });
  }
};

export const requestPublicBill = async (req, res) => {
  try {
    const { token } = req.params;
    const order = await prisma.order.findFirst({
      where: { OR: [{ publicToken: token }, { id: token }] },
      include: { table: true, restaurant: true, tableSession: true },
    });
    if (!order) return res.status(404).json({ message: "Ordine non trovato" });
    if (["served", "cancelled"].includes(order.status) || order.closedAt) {
      return res.status(400).json({ message: "Ordine già chiuso" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (order.tableSessionId) {
        await tx.tableSession.update({ where: { id: order.tableSessionId }, data: { status: "closing" } });
      }
      return tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: "pending" },
        include: { table: true, restaurant: true, tableSession: true },
      });
    });

    const payload = {
      orderId: updated.id,
      publicToken: updated.publicToken,
      tableName: updated.table?.name,
      tableId: updated.table?.id,
      restaurantId: updated.restaurantId,
      restaurantName: updated.restaurant?.name,
      paymentStatus: updated.paymentStatus,
      tableSessionStatus: updated.tableSession?.status || "closing",
      requestedAt: new Date().toISOString(),
    };

    emitSocket(req, "call-bill", payload);
    emitSocket(req, "table-updated", { ...payload, reason: "bill-requested" });
    return res.json({ message: "Richiesta conto inviata", ok: true, order: updated });
  } catch (error) {
    console.error("requestPublicBill error:", error);
    return res.status(500).json({ message: "Errore durante richiesta conto" });
  }
};

export const requestPublicStaff = async (req, res) => {
  try {
    const { token } = req.params;
    const rawReason = String(req.body?.reason || "assistenza").trim();
    const reason = rawReason.slice(0, 160) || "assistenza";

    const order = await prisma.order.findFirst({
      where: { OR: [{ publicToken: token }, { id: token }] },
      include: { table: true, restaurant: true, tableSession: true },
    });

    if (!order) return res.status(404).json({ message: "Ordine non trovato" });
    if (["served", "cancelled"].includes(order.status) || order.closedAt) {
      return res.status(400).json({ message: "Ordine già chiuso" });
    }

    const payload = {
      orderId: order.id,
      publicToken: order.publicToken,
      tableName: order.table?.name,
      tableId: order.table?.id,
      restaurantId: order.restaurantId,
      restaurantName: order.restaurant?.name,
      tableSessionStatus: order.tableSession?.status || "open",
      reason,
      requestedAt: new Date().toISOString(),
    };

    emitSocket(req, "call-staff", payload);
    emitSocket(req, "table-updated", { ...payload, reason: "staff-requested" });

    return res.json({ message: "Richiesta cameriere inviata", ok: true });
  } catch (error) {
    console.error("requestPublicStaff error:", error);
    return res.status(500).json({ message: "Errore durante richiesta cameriere" });
  }
};
