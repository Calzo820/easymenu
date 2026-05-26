const pendingOrders = [];

export function queuePendingOrder(order) {
  pendingOrders.push({
    ...order,
    createdAt: Date.now(),
  });
}

export function getPendingOrders() {
  return pendingOrders;
}

export async function retryPendingOrders(sendFn) {
  const cloned = [...pendingOrders];

  for (const order of cloned) {
    try {
      await sendFn(order);

      const index = pendingOrders.findIndex((o) => o.createdAt === order.createdAt);

      if (index !== -1) {
        pendingOrders.splice(index, 1);
      }
    } catch (err) {
      console.error("Retry ordine fallito:", err.message);
    }
  }
}