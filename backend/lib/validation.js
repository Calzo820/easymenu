const ORDER_STATUSES = new Set(["pending", "in_progress", "ready", "served", "cancelled"]);

export function normalizeString(value, fallback = "", maxLength = 500) {
  if (value === null || value === undefined) return fallback;
  return String(value).trim().slice(0, maxLength);
}

export function asString(value, fallback = "") {
  return normalizeString(value, fallback);
}

export function normalizeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function asNumber(value, fallback = 0) {
  return normalizeNumber(value, fallback);
}

export function normalizePositiveInt(value, fallback = 1, { min = 1, max = 999 } = {}) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function normalizeMoney(value, fallback = 0) {
  const n = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return fallback;
  return Math.round(Math.max(0, n) * 100) / 100;
}

export function normalizeStatus(status) {
  return normalizeString(status).toLowerCase().replaceAll(" ", "_");
}

export function validateOrderStatus(status, fallback = "pending") {
  const normalized = normalizeStatus(status || fallback);
  if (!ORDER_STATUSES.has(normalized)) {
    const error = new Error(`Stato ordine non valido: ${status}`);
    error.statusCode = 400;
    error.code = "INVALID_ORDER_STATUS";
    throw error;
  }
  return normalized;
}

export function requireFields(body = {}, fields = []) {
  const missing = fields.filter((field) => {
    const value = body?.[field];
    return value === undefined || value === null || String(value).trim() === "";
  });
  return { ok: missing.length === 0, missing };
}

export function assertRequiredFields(body = {}, fields = []) {
  const result = requireFields(body, fields);
  if (!result.ok) {
    const error = new Error(`Campi obbligatori mancanti: ${result.missing.join(", ")}`);
    error.statusCode = 400;
    error.code = "MISSING_FIELDS";
    error.missing = result.missing;
    throw error;
  }
  return true;
}

export function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(normalizeString(email).toLowerCase());
}

export function validatePublicOrderPayload(payload = {}) {
  const restaurantId = normalizeString(payload.restaurantId, "", 120);
  const tableId = normalizeString(payload.tableId, "", 120);
  const tableSessionId = normalizeString(payload.tableSessionId || payload.sessionId, "", 120) || null;
  const clientRequestId = normalizeString(payload.clientRequestId || payload.idempotencyKey, "", 160) || null;
  const notes = normalizeString(payload.notes, "", 1000);

  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const items = rawItems
    .map((item) => ({
      menuItemId: normalizeString(item.menuItemId || item.id, "", 120),
      quantity: normalizePositiveInt(item.quantity, 1, { min: 1, max: 99 }),
      notes: normalizeString(item.notes, "", 500),
      priceSnapshot: item.priceSnapshot === undefined ? undefined : normalizeMoney(item.priceSnapshot, 0),
    }))
    .filter((item) => item.menuItemId);

  if (!restaurantId) {
    const error = new Error("restaurantId obbligatorio");
    error.statusCode = 400;
    throw error;
  }
  if (!tableId) {
    const error = new Error("tableId obbligatorio");
    error.statusCode = 400;
    throw error;
  }
  if (items.length === 0) {
    const error = new Error("Aggiungi almeno un prodotto all'ordine");
    error.statusCode = 400;
    throw error;
  }

  return {
    restaurantId,
    tableId,
    tableSessionId,
    clientRequestId,
    notes,
    items,
  };
}

export default {
  normalizeString,
  asString,
  normalizeNumber,
  asNumber,
  normalizePositiveInt,
  normalizeMoney,
  normalizeStatus,
  validateOrderStatus,
  validatePublicOrderPayload,
  requireFields,
  assertRequiredFields,
  isValidEmail,
};
