export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);
export const API_RETRY_ATTEMPTS = Number(import.meta.env.VITE_API_RETRY_ATTEMPTS || 3);
export const API_RETRY_BASE_DELAY_MS = Number(import.meta.env.VITE_API_RETRY_BASE_DELAY_MS || 450);

export function getAuthToken() {
  return localStorage.getItem("auth_token") || "";
}

export function setAuthToken(token) {
  if (!token) return;
  localStorage.setItem("auth_token", token);
}

export function saveAuthSession(payload = {}) {
  const token = payload.token || payload.accessToken || payload.jwt;
  const user = payload.user || payload.account || null;
  const restaurant = payload.restaurant || user?.restaurant || null;

  if (token) setAuthToken(token);
  if (user) localStorage.setItem("auth_user", JSON.stringify(user));
  if (restaurant) {
    localStorage.setItem("auth_restaurant", JSON.stringify(restaurant));
    if (restaurant.id) localStorage.setItem("restaurant_id", restaurant.id);
    if (restaurant.slug) localStorage.setItem("restaurant_slug", restaurant.slug);
    if (restaurant.slug) localStorage.setItem("ristorante_attivo", restaurant.slug);
  }

  return { token: token || getAuthToken(), user, restaurant };
}

export function removeAuthToken() {
  localStorage.removeItem("auth_token");
}

export function clearAuthSession() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  localStorage.removeItem("auth_restaurant");
  localStorage.removeItem("ristorante_attivo");
  localStorage.removeItem("restaurant_slug");
  localStorage.removeItem("restaurant_id");
}

export function getAuthHeaders(extraHeaders = {}) {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createClientRequestId(prefix = "req") {
  return `${prefix}-${randomId()}`;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  try { return await response.json(); } catch { return null; }
}

function buildUrl(endpoint) {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  return `${API_URL}${endpoint}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(delay) {
  return Math.round(delay * (0.75 + Math.random() * 0.5));
}

function shouldRetry(error, response, method) {
  const safeMethod = ["GET", "HEAD", "OPTIONS"].includes(String(method || "GET").toUpperCase());
  const hasIdempotency = Boolean(error?.idempotentRequest);
  const retriableStatus = response && [408, 409, 425, 429, 500, 502, 503, 504].includes(response.status);
  const networkError = !response && error;
  return safeMethod || hasIdempotency || retriableStatus || networkError;
}

async function performFetch(endpoint, options = {}, withAuth = true) {
  const method = String(options.method || "GET").toUpperCase();
  const maxAttempts = Math.max(1, Number(options.retryAttempts || API_RETRY_ATTEMPTS));
  const idempotentRequest = Boolean(options.idempotencyKey || options.headers?.["Idempotency-Key"]);
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || API_TIMEOUT_MS));

    try {
      const headers = withAuth
        ? getAuthHeaders(options.headers || {})
        : { "Content-Type": "application/json", ...(options.headers || {}) };
      if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

      const response = await fetch(buildUrl(endpoint), {
        ...options,
        signal: options.signal || controller.signal,
        headers,
      });

      const data = await parseResponse(response);
      if (!response.ok) {
        if (response.status === 401) clearAuthSession();
        const error = new Error(data?.message || `Errore API (${response.status})`);
        error.status = response.status;
        error.data = data;
        error.idempotentRequest = idempotentRequest;
        if (attempt < maxAttempts && shouldRetry(error, response, method)) {
          await sleep(jitter(API_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)));
          continue;
        }
        throw error;
      }
      return data;
    } catch (error) {
      lastError = error;
      if (error?.name === "AbortError") {
        lastError = new Error("Connessione lenta o server non raggiungibile. Riprova tra poco.");
        lastError.status = 408;
      }
      lastError.idempotentRequest = idempotentRequest;
      if (attempt < maxAttempts && shouldRetry(lastError, null, method)) {
        await sleep(jitter(API_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)));
        continue;
      }
      throw lastError;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error("Errore API sconosciuto");
}

export async function apiFetch(endpoint, options = {}) { return performFetch(endpoint, options, true); }
export async function publicApiFetch(endpoint, options = {}) { return performFetch(endpoint, options, false); }
export async function apiGet(endpoint, extraHeaders = {}) { return apiFetch(endpoint, { method: "GET", headers: extraHeaders }); }
export async function apiPost(endpoint, body = {}, extraHeaders = {}) { return apiFetch(endpoint, { method: "POST", headers: extraHeaders, body: JSON.stringify(body) }); }
export async function apiPostIdempotent(endpoint, body = {}, extraHeaders = {}, prefix = "post") {
  const clientRequestId = body.clientRequestId || createClientRequestId(prefix);
  return apiFetch(endpoint, {
    method: "POST",
    headers: extraHeaders,
    idempotencyKey: clientRequestId,
    body: JSON.stringify({ ...body, clientRequestId }),
  });
}
export async function publicApiPostIdempotent(endpoint, body = {}, extraHeaders = {}, prefix = "public") {
  const clientRequestId = body.clientRequestId || createClientRequestId(prefix);
  return publicApiFetch(endpoint, {
    method: "POST",
    headers: extraHeaders,
    idempotencyKey: clientRequestId,
    body: JSON.stringify({ ...body, clientRequestId }),
  });
}
export async function apiPatch(endpoint, body = {}, extraHeaders = {}) { return apiFetch(endpoint, { method: "PATCH", headers: extraHeaders, body: JSON.stringify(body) }); }
export async function apiDelete(endpoint, extraHeaders = {}) { return apiFetch(endpoint, { method: "DELETE", headers: extraHeaders }); }
export async function publicApiGet(endpoint, extraHeaders = {}) { return publicApiFetch(endpoint, { method: "GET", headers: extraHeaders }); }
export async function publicApiPost(endpoint, body = {}, extraHeaders = {}) { return publicApiFetch(endpoint, { method: "POST", headers: extraHeaders, body: JSON.stringify(body) }); }
export async function getBillingStatus() { return apiGet("/subscriptions/status"); }
export async function createSubscriptionCheckout(plan) { return apiPost("/subscriptions/checkout", { plan }); }
export async function openBillingPortal() { return apiPost("/subscriptions/portal", {}); }
