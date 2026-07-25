const apiUrl = String(process.env.E2E_API_URL || "http://localhost:5000").replace(/\/$/, "");
const password = process.env.E2E_PASSWORD || "EasyMenu2026!";
const ownerEmail = process.env.E2E_OWNER_EMAIL || "owner@demo.test";
const kitchenEmail = process.env.E2E_KITCHEN_EMAIL || "cucina@demo.test";
const cashierEmail = process.env.E2E_CASHIER_EMAIL || "cassa@demo.test";

if (String(process.env.E2E_ALLOW_WRITE || "").toLowerCase() !== "true") {
  console.error("Test annullato: imposta E2E_ALLOW_WRITE=true solo su un ambiente demo.");
  process.exit(2);
}

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${path}: ${data?.message || response.status}`);
  return data;
}

async function login(email) {
  const result = await request("/auth/login", { method: "POST", body: { email, password } });
  if (!result?.token) throw new Error(`Login incompleto per ${email}`);
  return result;
}

let ownerToken = "";
let createdOrderId = "";

try {
  await request("/ready");
  if (String(process.env.E2E_PREPARE_DEMO || "").toLowerCase() === "true") {
    await request("/demo/ensure", { method: "POST", body: {} });
  }

  const owner = await login(ownerEmail);
  ownerToken = owner.token;
  const [tablesResult, menuResult] = await Promise.all([
    request("/tables", { token: ownerToken }),
    request("/menu", { token: ownerToken }),
  ]);
  const tables = Array.isArray(tablesResult) ? tablesResult : tablesResult?.tables || [];
  const menu = Array.isArray(menuResult) ? menuResult : menuResult?.items || [];
  const table = tables.find((item) => item.isActive !== false && item.qrToken);
  const product = menu.find((item) => item.isAvailable !== false && item.isDeleted !== true);
  if (!table || !product || !owner.restaurant?.slug) throw new Error("Demo incompleta: servono ristorante, tavolo e prodotto disponibile.");

  const created = await request("/orders/public", {
    method: "POST",
    body: {
      restaurantSlug: owner.restaurant.slug,
      tableToken: table.qrToken,
      customerName: "Test automatico EasyMenu",
      notes: "Ordine temporaneo, eliminato a fine verifica",
      clientRequestId: `e2e-${Date.now()}`,
      items: [{ menuItemId: product.id, quantity: 1 }],
    },
  });
  createdOrderId = created?.order?.id;
  if (!createdOrderId) throw new Error("Ordine di test non creato.");

  const kitchen = await login(kitchenEmail);
  await request(`/orders/${createdOrderId}/status`, { method: "PATCH", token: kitchen.token, body: { status: "in_progress" } });
  await request(`/orders/${createdOrderId}/status`, { method: "PATCH", token: kitchen.token, body: { status: "ready" } });

  const cashier = await login(cashierEmail);
  await request(`/orders/${createdOrderId}/close`, {
    method: "POST",
    token: cashier.token,
    body: { paymentMethod: "cash", discount: 0, extra: 0 },
  });

  const history = await request("/orders?history=true", { token: ownerToken });
  const historyRows = Array.isArray(history) ? history : history?.orders || [];
  const completed = historyRows.find((order) => order.id === createdOrderId);
  if (!completed || completed.status !== "served" || completed.paymentStatus !== "paid") {
    throw new Error("Chiusura in cassa non confermata nello storico.");
  }

  await request("/analytics/summary?days=7", { token: ownerToken });
  console.log(JSON.stringify({
    ok: true,
    steps: ["backend", "login", "menu e tavolo", "ordine cliente", "cucina", "cassa", "storico", "statistiche"],
    orderId: createdOrderId,
  }, null, 2));
} catch (error) {
  console.error(`TEST SERVIZIO FALLITO: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (createdOrderId && ownerToken) {
    await request(`/orders/${createdOrderId}`, { method: "DELETE", token: ownerToken }).catch((error) => {
      console.error(`Pulizia ordine non riuscita: ${error.message}`);
      process.exitCode = 1;
    });
  }
}
