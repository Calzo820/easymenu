import prisma from "../lib/prisma.js";

const ACTIVE_STATUSES = ["booked", "seated"];
const VALID_STATUSES = new Set(["booked", "seated", "cancelled", "no_show"]);

function emitSocket(req, eventName, payload = {}) {
  const io = req.app.get("io");
  if (!io) return;
  if (payload.restaurantId) {
    io.to(`restaurant:${payload.restaurantId}`).emit(eventName, payload);
    return;
  }
  io.emit(eventName, payload);
}

function dateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(value) {
  const raw = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseGuests(value, fallback = 2) {
  const guests = Number(value);
  if (!Number.isInteger(guests)) return fallback;
  return Math.min(300, Math.max(1, guests));
}

function normalizePhone(value) {
  const phone = String(value || "").trim().slice(0, 40);
  return phone || null;
}

function normalizeNotes(value) {
  const notes = String(value || "").trim().slice(0, 500);
  return notes || null;
}

function normalizeStatus(value, fallback = "booked") {
  const status = String(value || fallback).trim();
  return VALID_STATUSES.has(status) ? status : fallback;
}

function parseStatuses(raw) {
  const values = String(raw || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => VALID_STATUSES.has(item));
  return values.length ? values : ACTIVE_STATUSES;
}

function serializeReservation(reservation, privateMode = false) {
  return {
    id: reservation.id,
    restaurantId: reservation.restaurantId,
    tableId: reservation.tableId,
    tableCode: reservation.table?.code || null,
    tableName: reservation.table?.name || null,
    customerName: privateMode ? "Prenotazione riservata" : reservation.customerName,
    name: privateMode ? "Prenotazione riservata" : reservation.customerName,
    phone: privateMode ? "" : reservation.phone || "",
    date: dateKey(reservation.date),
    time: reservation.time,
    guests: reservation.guests,
    notes: privateMode ? "" : reservation.notes || "",
    status: reservation.status,
    createdAt: reservation.createdAt,
    updatedAt: reservation.updatedAt,
  };
}

async function hasTableConflict({ restaurantId, tableId, date, time, excludeId = null }) {
  if (!tableId || !date || !time) return false;

  const conflict = await prisma.reservation.findFirst({
    where: {
      restaurantId,
      tableId,
      date,
      time,
      status: { in: ACTIVE_STATUSES },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  return Boolean(conflict);
}

async function resolveTable(restaurantId, payload = {}, fallbackTableId) {
  if (payload.tableId === null) return null;

  const explicitTableId = payload.tableId === undefined ? fallbackTableId : payload.tableId;
  if (explicitTableId) {
    const table = await prisma.table.findFirst({
      where: { id: String(explicitTableId), restaurantId },
    });
    if (!table) return "NOT_FOUND";
    return table;
  }

  if (payload.tableCode !== undefined || payload.code !== undefined) {
    const tableCode = String(payload.tableCode || payload.code || "").trim().toUpperCase();
    if (!tableCode) return null;
    const table = await prisma.table.findFirst({
      where: { restaurantId, code: tableCode },
    });
    if (!table) return "NOT_FOUND";
    return table;
  }

  return null;
}

export const listReservations = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const date = parseDateOnly(req.query.date);
    const from = date || parseDateOnly(req.query.from) || parseDateOnly(dateKey());
    const to = date ? addDays(date, 1) : parseDateOnly(req.query.to);
    const statuses = parseStatuses(req.query.statuses || req.query.status);

    const where = {
      restaurantId,
      status: { in: statuses },
    };

    if (from && to) where.date = { gte: from, lt: date ? to : addDays(to, 1) };
    else if (from) where.date = { gte: from };

    const reservations = await prisma.reservation.findMany({
      where,
      include: { table: true },
      orderBy: [{ date: "asc" }, { time: "asc" }, { createdAt: "asc" }],
      take: Math.min(200, Math.max(1, Number(req.query.limit) || 80)),
    });

    return res.json({ reservations: reservations.map((reservation) => serializeReservation(reservation, req.user?.impersonating)) });
  } catch (error) {
    console.error("listReservations error:", error);
    return res.status(500).json({ message: "Errore durante recupero prenotazioni" });
  }
};

export const createReservation = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const payload = req.body || {};
    const customerName = String(payload.customerName || payload.name || "").trim().slice(0, 120);
    const date = parseDateOnly(payload.date);
    const time = String(payload.time || "").trim().slice(0, 12);

    if (!customerName) return res.status(400).json({ message: "Nome cliente obbligatorio" });
    if (!date) return res.status(400).json({ message: "Data prenotazione obbligatoria" });
    if (!time) return res.status(400).json({ message: "Ora prenotazione obbligatoria" });

    const table = await resolveTable(restaurantId, payload);
    if (table === "NOT_FOUND") return res.status(404).json({ message: "Tavolo non trovato" });

    if (await hasTableConflict({ restaurantId, tableId: table?.id, date, time })) {
      return res.status(409).json({ message: "Questo tavolo ha già una prenotazione alla stessa ora" });
    }

    const reservation = await prisma.reservation.create({
      data: {
        restaurantId,
        tableId: table?.id || null,
        customerName,
        phone: normalizePhone(payload.phone),
        date,
        time,
        guests: parseGuests(payload.guests),
        notes: normalizeNotes(payload.notes),
        status: normalizeStatus(payload.status),
      },
      include: { table: true },
    });

    const serialized = serializeReservation(reservation);
    emitSocket(req, "reservation-updated", { restaurantId, reservation: serialized });
    return res.status(201).json({ reservation: serialized });
  } catch (error) {
    console.error("createReservation error:", error);
    return res.status(500).json({ message: "Errore durante creazione prenotazione" });
  }
};

export const updateReservation = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { id } = req.params;
    const current = await prisma.reservation.findFirst({ where: { id, restaurantId } });
    if (!current) return res.status(404).json({ message: "Prenotazione non trovata" });

    const payload = req.body || {};
    const data = {};

    if (payload.customerName !== undefined || payload.name !== undefined) {
      const customerName = String(payload.customerName || payload.name || "").trim().slice(0, 120);
      if (!customerName) return res.status(400).json({ message: "Nome cliente obbligatorio" });
      data.customerName = customerName;
    }
    if (payload.phone !== undefined) data.phone = normalizePhone(payload.phone);
    if (payload.date !== undefined) {
      const date = parseDateOnly(payload.date);
      if (!date) return res.status(400).json({ message: "Data prenotazione obbligatoria" });
      data.date = date;
    }
    if (payload.time !== undefined) {
      const time = String(payload.time || "").trim().slice(0, 12);
      if (!time) return res.status(400).json({ message: "Ora prenotazione obbligatoria" });
      data.time = time;
    }
    if (payload.guests !== undefined) data.guests = parseGuests(payload.guests, current.guests);
    if (payload.notes !== undefined) data.notes = normalizeNotes(payload.notes);
    if (payload.status !== undefined) data.status = normalizeStatus(payload.status, current.status);
    if (payload.tableId !== undefined || payload.tableCode !== undefined || payload.code !== undefined) {
      const table = await resolveTable(restaurantId, payload, current.tableId);
      if (table === "NOT_FOUND") return res.status(404).json({ message: "Tavolo non trovato" });
      data.tableId = table?.id || null;
    }

    const nextTableId = data.tableId === undefined ? current.tableId : data.tableId;
    const nextDate = data.date || current.date;
    const nextTime = data.time || current.time;
    const nextStatus = data.status || current.status;
    if (
      ACTIVE_STATUSES.includes(nextStatus) &&
      await hasTableConflict({
        restaurantId,
        tableId: nextTableId,
        date: nextDate,
        time: nextTime,
        excludeId: current.id,
      })
    ) {
      return res.status(409).json({ message: "Questo tavolo ha già una prenotazione alla stessa ora" });
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data,
      include: { table: true },
    });

    const serialized = serializeReservation(reservation);
    emitSocket(req, "reservation-updated", { restaurantId, reservation: serialized });
    return res.json({ reservation: serialized });
  } catch (error) {
    console.error("updateReservation error:", error);
    return res.status(500).json({ message: "Errore durante aggiornamento prenotazione" });
  }
};

export const cancelReservation = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { id } = req.params;
    const current = await prisma.reservation.findFirst({ where: { id, restaurantId } });
    if (!current) return res.status(404).json({ message: "Prenotazione non trovata" });

    const reservation = await prisma.reservation.update({
      where: { id },
      data: { status: "cancelled" },
      include: { table: true },
    });

    const serialized = serializeReservation(reservation);
    emitSocket(req, "reservation-updated", { restaurantId, reservation: serialized });
    return res.json({ reservation: serialized });
  } catch (error) {
    console.error("cancelReservation error:", error);
    return res.status(500).json({ message: "Errore durante cancellazione prenotazione" });
  }
};
