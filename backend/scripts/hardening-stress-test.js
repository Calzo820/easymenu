const API_URL = process.env.API_URL || "http://localhost:5000";

async function postOrder(payload, clientRequestId) {
  const res = await fetch(`${API_URL}/orders/public`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": clientRequestId },
    body: JSON.stringify({ ...payload, clientRequestId }),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function main() {
  const payload = JSON.parse(process.env.ORDER_PAYLOAD_JSON || "{}");
  if (!payload.restaurantSlug || !payload.tableToken || !Array.isArray(payload.items)) {
    console.log("Imposta ORDER_PAYLOAD_JSON con restaurantSlug, tableToken e items per simulare ordini concorrenti.");
    process.exit(0);
  }
  const sameKey = `stress-${Date.now()}`;
  const duplicateResults = await Promise.all(Array.from({ length: 8 }, () => postOrder(payload, sameKey)));
  const uniqueResults = await Promise.all(Array.from({ length: 12 }, (_, index) => postOrder(payload, `${sameKey}-${index}`)));
  console.log(JSON.stringify({ duplicateResults, uniqueResults }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
