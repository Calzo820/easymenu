import dotenv from 'dotenv';
dotenv.config();

const API = (process.env.API_URL || process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
const EMAIL = process.env.DEMO_OWNER_EMAIL || 'owner@demo.it';
const PASSWORD = process.env.DEMO_OWNER_PASSWORD || 'password123';

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${options.method || 'GET'} ${path} -> ${res.status}: ${data?.message || res.statusText}`);
  return data;
}

function assert(value, label) {
  if (!value) throw new Error(`Test fallito: ${label}`);
  console.log(`✓ ${label}`);
}

async function main() {
  console.log(`Smoke test EasyMenu su ${API}`);
  const health = await request('/health');
  assert(health.ok, 'backend online');

  const login = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
  const token = login.token;
  assert(token, 'login owner');
  const auth = { Authorization: `Bearer ${token}` };
  const slug = login.restaurant?.slug || process.env.DEMO_RESTAURANT_SLUG || 'demo';

  const tables = await request('/tables', { headers: auth });
  const table = Array.isArray(tables) ? tables[0] : tables?.tables?.[0];
  assert(table?.qrToken, 'tavolo demo con QR/token');

  const menuPublic = await request(`/tables/public/${encodeURIComponent(slug)}/${encodeURIComponent(table.qrToken)}`);
  assert(Array.isArray(menuPublic.items) && menuPublic.items.length > 0, 'menu demo pubblico');
  const item = menuPublic.items[0];

  const created = await request('/orders/public', { method: 'POST', body: JSON.stringify({ restaurantSlug: slug, tableToken: table.qrToken, customerName: 'Cliente test', notes: 'Smoke test', items: [{ menuItemId: item.id, quantity: 1, notes: 'test' }] }) });
  const order = created.order;
  assert(order?.publicToken, 'ordine cliente creato');

  const kitchen = await request('/orders/kitchen/list', { headers: auth });
  assert(Array.isArray(kitchen) && kitchen.some((o) => o.id === order.id), 'ordine arrivato in cucina/bar/cassa');

  const inProgress = await request(`/orders/${order.id}/status`, { method: 'PATCH', headers: auth, body: JSON.stringify({ status: 'in_progress' }) });
  assert(inProgress.order?.status === 'in_progress', 'cambio stato ordine');

  if (process.env.STRIPE_SECRET_KEY) {
    const checkout = await request(`/payments/public/${order.publicToken}/checkout`, { method: 'POST', body: JSON.stringify({ splitCount: 1, payerIndex: 1 }) });
    assert(checkout.checkoutUrl && checkout.sessionId, 'Stripe checkout test creato');
  } else {
    console.log('ℹ Stripe saltato: STRIPE_SECRET_KEY non configurata');
  }

  console.log('Smoke test completato.');
}

main().catch((error) => { console.error(error.message); process.exit(1); });
