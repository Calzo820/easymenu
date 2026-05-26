router.get("/owner", async (req, res) => {
  const todayOrders = await prisma.order.findMany({
    where: { createdAt: { gte: new Date().setHours(0,0,0,0) } }
  });

  const revenue = todayOrders.reduce((s, o) => s + o.total, 0);

  res.json({
    revenue,
    orders: todayOrders.length,
    avgTicket: revenue / (todayOrders.length || 1)
  });
});