export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 12000);

export function getAuthToken() {
  return localStorage.getItem("auth_token") || "";
}

export function setAuthToken(token) {
  if (!token) return;
  localStorage.setItem("auth_token", token);
}

export function removeAuthToken() {
  localStorage.removeItem("auth_token");
}

export function getAuthHeaders(extraHeaders = {}) {
  const token = getAuthToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

export function clearAuthSession() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  localStorage.removeItem("auth_restaurant");
  localStorage.removeItem("ristorante_attivo");
  localStorage.removeItem("restaurant_slug");
  localStorage.removeItem("restaurant_id");
}

async function parseResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function buildUrl(endpoint) {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  return `${API_URL}${endpoint}`;
}

async function performFetch(endpoint, options = {}, withAuth = true) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(endpoint), {
      ...options,
      signal: options.signal || controller.signal,
      credentials: "include",
      headers: withAuth
        ? getAuthHeaders(options.headers || {})
        : {
            "Content-Type": "application/json",
            ...(options.headers || {}),
          },
    });

    const data = await parseResponse(response);

    if (!response.ok) {
      if (response.status === 401 && withAuth && !options.skipRefresh) {
        try {
          const refresh = await fetch(buildUrl("/auth/refresh"), {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          const refreshData = await parseResponse(refresh);
          if (refresh.ok && refreshData?.token) {
            setAuthToken(refreshData.token);
            return performFetch(endpoint, { ...options, skipRefresh: true }, true);
          }
        } catch {
          // Fall through to local logout.
        }
        clearAuthSession();
      }
      throw new Error(data?.message || `Errore API (${response.status})`);
    }

    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Connessione lenta o server non raggiungibile. Riprova tra poco.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function apiFetch(endpoint, options = {}) {
  return performFetch(endpoint, options, options.withAuth ?? true);
}

export async function publicApiFetch(endpoint, options = {}) {
  return performFetch(endpoint, options, false);
}

export async function apiGet(endpoint, extraHeaders = {}) {
  return apiFetch(endpoint, { method: "GET", headers: extraHeaders });
}

export async function apiPost(endpoint, body = {}, extraHeaders = {}, options = {}) {
  return apiFetch(endpoint, {
    ...options,
    method: "POST",
    headers: extraHeaders,
    body: JSON.stringify(body),
  });
}

export async function apiPatch(endpoint, body = {}, extraHeaders = {}) {
  return apiFetch(endpoint, {
    method: "PATCH",
    headers: extraHeaders,
    body: JSON.stringify(body),
  });
}

export async function apiDelete(endpoint, extraHeaders = {}) {
  return apiFetch(endpoint, { method: "DELETE", headers: extraHeaders });
}

export async function publicApiGet(endpoint, extraHeaders = {}) {
  return publicApiFetch(endpoint, { method: "GET", headers: extraHeaders });
}

export async function publicApiPost(endpoint, body = {}, extraHeaders = {}) {
  return publicApiFetch(endpoint, {
    method: "POST",
    headers: extraHeaders,
    body: JSON.stringify(body),
  });
}


export async function getBillingStatus() {
  return apiGet("/subscriptions/status");
}

export async function createSubscriptionCheckout(plan) {
  return apiPost("/subscriptions/checkout", { plan });
}

export async function openBillingPortal() {
  return apiPost("/subscriptions/portal", {});
}
