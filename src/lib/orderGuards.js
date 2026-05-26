const memoryLocks = new Map();

export function createOrderFingerprint(payload = {}) {
  const items = [...(payload.items || [])]
    .map((item) => ({ menuItemId: item.menuItemId, quantity: Number(item.quantity || 1), notes: String(item.notes || "").trim() }))
    .sort((a, b) => `${a.menuItemId}:${a.notes}`.localeCompare(`${b.menuItemId}:${b.notes}`));
  return JSON.stringify({ restaurantSlug: payload.restaurantSlug, tableToken: payload.tableToken, items });
}

export function guardDoubleSubmit(key, ttlMs = 12000) {
  const now = Date.now();
  const existing = memoryLocks.get(key);
  if (existing && existing > now) return false;
  memoryLocks.set(key, now + ttlMs);
  window.setTimeout(() => memoryLocks.delete(key), ttlMs + 250);
  return true;
}

export function releaseSubmitGuard(key) {
  memoryLocks.delete(key);
}

export function dedupeByEventId(list = [], event) {
  const eventId = event?.eventId || event?.id || `${event?.orderId || "unknown"}:${event?.updatedAt || event?.createdAt || ""}`;
  if (!eventId) return { duplicate: false, next: list };
  if (list.includes(eventId)) return { duplicate: true, next: list };
  return { duplicate: false, next: [...list.slice(-199), eventId] };
}
