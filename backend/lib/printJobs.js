export function preparationAreas(items = []) {
  return [...new Set(
    items
      .filter((item) => item?.status !== "voided")
      .map((item) => item?.preparationArea)
      .filter((area) => area === "kitchen" || area === "bar")
  )];
}

export async function createOrderPrintJobs(tx, order, { kind = "order", eventKeySuffix = "initial" } = {}) {
  const areas = preparationAreas(order?.items || []);
  if (!order?.id || !order?.restaurantId || areas.length === 0) return [];

  await tx.printJob.createMany({
    data: areas.map((area) => ({
      restaurantId: order.restaurantId,
      orderId: order.id,
      area,
      kind,
      eventKey: `${order.id}:${area}:${eventKeySuffix}`,
    })),
    skipDuplicates: true,
  });

  return areas;
}
