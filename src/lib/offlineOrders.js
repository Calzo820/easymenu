import { API_URL } from "./api";

const QUEUE_KEY = "easymenu_pending_public_orders_v2";
const MAX_RETRIES = 8;

function safeJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

export function getPendingPublicOrders() {
  if (typeof window === "undefined") return [];
  return safeJson(localStorage.getItem(QUEUE_KEY) || "[]", []).filter(Boolean);
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-60)));
  window.dispatchEvent(new CustomEvent("easymenu:offline-queue", { detail: { pending: queue.length } }));
}

export function pendingPublicOrdersCount() {
  return getPendingPublicOrders().length;
}

export function enqueuePublicOrder(payload) {
  const queued = {
    id: payload.clientRequestId || `offline:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    payload: { ...payload, clientRequestId: payload.clientRequestId || `offline:${Date.now()}` },
    createdAt: new Date().toISOString(),
    retries: 0,
    lastError: null,
  };
  const queue = getPendingPublicOrders().filter((item) => item.id !== queued.id);
  queue.push(queued);
  saveQueue(queue);
  return queued;
}

async function postPublicOrder(payload) {
  const response = await fetch(`${API_URL}/orders/public`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `Ordine non sincronizzato (${response.status})`);
  return data;
}

export async function sendPublicOrderResilient(payload) {
  try {
    return await postPublicOrder(payload);
  } catch (error) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      const queued = enqueuePublicOrder(payload);
      return { queued: true, order: { id: queued.id, publicToken: null, status: "queued", createdAt: queued.createdAt } };
    }
    throw error;
  }
}

export async function flushPendingPublicOrders() {
  const queue = getPendingPublicOrders();
  if (!queue.length || (typeof navigator !== "undefined" && navigator.onLine === false)) return { sent: 0, pending: queue.length };

  const remaining = [];
  let sent = 0;

  for (const item of queue) {
    try {
      await postPublicOrder(item.payload);
      sent += 1;
    } catch (error) {
      const retries = Number(item.retries || 0) + 1;
      if (retries < MAX_RETRIES) {
        remaining.push({ ...item, retries, lastError: error.message, lastAttemptAt: new Date().toISOString() });
      }
    }
  }

  saveQueue(remaining);
  return { sent, pending: remaining.length };
}

export function startOfflineOrderSync() {
  if (typeof window === "undefined") return () => {};
  const run = () => flushPendingPublicOrders().catch(() => {});
  window.addEventListener("online", run);
  const timer = window.setInterval(run, 20000);
  run();
  return () => {
    window.removeEventListener("online", run);
    window.clearInterval(timer);
  };
}
