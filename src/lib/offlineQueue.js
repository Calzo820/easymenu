import { createClientRequestId, publicApiPostIdempotent } from "./api";

const STORAGE_KEY = "easymenu_pending_orders_v1";
const listeners = new Set();

function readQueue() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function writeQueue(queue) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(-50)));
  listeners.forEach((listener) => listener(getPendingOrders()));
}

export function getPendingOrders() { return readQueue(); }
export function subscribePendingOrders(listener) {
  listeners.add(listener);
  listener(getPendingOrders());
  return () => listeners.delete(listener);
}
export function enqueuePublicOrder(payload) {
  const item = { id: payload.clientRequestId || createClientRequestId("offline-order"), payload, attempts: 0, createdAt: new Date().toISOString(), nextRetryAt: Date.now() };
  writeQueue([...readQueue().filter((row) => row.id !== item.id), item]);
  return item;
}
export function removePendingOrder(id) { writeQueue(readQueue().filter((row) => row.id !== id)); }

export async function flushPendingOrders({ endpoint = "/orders/public", onSuccess, onError } = {}) {
  if (!navigator.onLine) return { flushed: 0, remaining: readQueue().length };
  const queue = readQueue();
  let flushed = 0;
  for (const item of queue) {
    if (item.nextRetryAt && item.nextRetryAt > Date.now()) continue;
    try {
      const result = await publicApiPostIdempotent(endpoint, item.payload, {}, item.id);
      removePendingOrder(item.id);
      flushed += 1;
      onSuccess?.(result, item);
    } catch (error) {
      const attempts = Number(item.attempts || 0) + 1;
      const nextRetryAt = Date.now() + Math.min(60000, 1000 * 2 ** attempts);
      writeQueue(readQueue().map((row) => row.id === item.id ? { ...row, attempts, nextRetryAt, lastError: error.message } : row));
      onError?.(error, item);
    }
  }
  return { flushed, remaining: readQueue().length };
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { flushPendingOrders().catch(() => {}); });
}
