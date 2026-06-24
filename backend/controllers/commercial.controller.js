import prisma from "../lib/prisma.js";

const MONEY = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function hourLabel(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function paidOrServed(order) {
  return order.paymentStatus === "paid" || order.status === "served";
}

function getItemRevenue(item) {
  return toNumber(item.quantity) * toNumber(item.priceSnapshot);
}

function pushAction(actions, action) {
  actions.push({
    priority: actions.length + 1,
    impact: action.impact || "medio",
    effort: action.effort || "basso",
    ...action,
  });
}

function buildProductMap(orders) {
  const map = new Map();

  for (const order of orders) {
    for (const item of order.items || []) {
      const key = item.menuItemId || item.nameSnapshot || "prodotto";
      const current = map.get(key) || {
        id: key,
        name: item.nameSnapshot || "Prodotto",
        category: item.categorySnapshot || "Senza categoria",
        area: item.preparationArea || "kitchen",
        quantity: 0,
        revenue: 0,
        orders: new Set(),
      };

      current.quantity += toNumber(item.quantity);
      current.revenue += getItemRevenue(item);
      current.orders.add(order.id);
      map.set(key, current);
    }
  }

  return [...map.values()].map((item) => ({
    ...item,
    orders: item.orders.size,
    averagePrice: item.quantity ? item.revenue / item.quantity : 0,
  }));
}

function buildTableMap(orders) {
  const map = new Map();

  for (const order of orders) {
    const key = order.tableId || "asporto";
    const label = order.table?.name || order.table?.code || "Asporto / senza tavolo";
    const current = map.get(key) || { id: key, label, orders: 0, revenue: 0, averageTicket: 0 };
    current.orders += 1;
    current.revenue += toNumber(order.totalAmount);
    map.set(key, current);
  }

  return [...map.values()]
    .map((table) => ({ ...table, averageTicket: table.orders ? table.revenue / table.orders : 0 }))
    .sort((a, b) => b.revenue - a.revenue);
}

function buildHourlyMap(orders) {
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: hourLabel(hour),
    orders: 0,
    revenue: 0,
    averageTicket: 0,
  }));

  for (const order of orders) {
    const h = new Date(order.createdAt).getHours();
    hours[h].orders += 1;
    hours[h].revenue += toNumber(order.totalAmount);
  }

  return hours
    .map((row) => ({ ...row, averageTicket: row.orders ? row.revenue / row.orders : 0 }))
    .filter((row) => row.orders > 0)
    .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);
}

function buildCategoryMap(products) {
  const map = new Map();

  for (const product of products) {
    const key = product.category || "Senza categoria";
    const current = map.get(key) || { category: key, quantity: 0, revenue: 0, products: 0 };
    current.quantity += product.quantity;
    current.revenue += product.revenue;
    current.products += 1;
    map.set(key, current);
  }

  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

function buildUpsellSuggestions(products) {
  const topFood = products.filter((p) => p.area !== "bar").sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  const topDrinks = products.filter((p) => p.area === "bar").sort((a, b) => b.quantity - a.quantity).slice(0, 5);

  const suggestions = [];
  for (const food of topFood.slice(0, 3)) {
    const drink = topDrinks[suggestions.length % Math.max(1, topDrinks.length)];
    suggestions.push({
      trigger: food.name,
      offer: drink ? `${drink.name} in abbinamento` : "Bibita o contorno consigliato",
      script: `Quando il cliente ordina ${food.name}, proponi subito ${drink?.name || "una bibita o un extra"}.`,
      expectedLift: "+6-12% ticket medio",
    });
  }

  if (!suggestions.length) {
    suggestions.push({
      trigger: "Prodotto principale",
      offer: "Extra o bevanda suggerita",
      script: "Aggiungi un suggerimento automatico al carrello prima della conferma ordine.",
      expectedLift: "+4-8% ticket medio",
    });
  }

  return suggestions;
}

function buildMenuEngineering(products) {
  if (!products.length) return [];

  const avgQty = products.reduce((s, p) => s + p.quantity, 0) / products.length;
  const avgRevenue = products.reduce((s, p) => s + p.revenue, 0) / products.length;

  return products
    .map((p) => {
      const popularity = p.quantity >= avgQty ? "alta" : "bassa";
      const value = p.revenue >= avgRevenue ? "alto" : "basso";
      let quadrant = "Da ottimizzare";
      let action = "Testa foto, nome più chiaro e posizione nel menu.";

      if (popularity === "alta" && value === "alto") {
        quadrant = "Star";
        action = "Mettilo in evidenza e usalo come prodotto civetta premium.";
      } else if (popularity === "alta" && value === "basso") {
        quadrant = "Volume alto, margine basso";
        action = "Aumenta prezzo di poco o abbinalo a un extra ad alto margine.";
      } else if (popularity === "bassa" && value === "alto") {
        quadrant = "Gemma nascosta";
        action = "Sposta più in alto, aggiungi foto e badge consigliato.";
      }

      return { ...p, quadrant, action };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 12);
}

function buildCommercialActions({ orders, products, tables, hours, openOrders }) {
  const actions = [];
  const paidOrders = orders.filter(paidOrServed);
  const avgTicket = paidOrders.length
    ? paidOrders.reduce((sum, order) => sum + toNumber(order.totalAmount), 0) / paidOrders.length
    : 0;

  if (avgTicket < 25) {
    pushAction(actions, {
      title: "Alza il ticket medio con upsell obbligatorio",
      reason: `Ticket medio attuale ${MONEY.format(avgTicket)}: c'è spazio per proporre extra, bevande e dolci prima della conferma ordine.`,
      nextStep: "Mostra 2 suggerimenti automatici nel carrello: bevanda + dolce/contorno.",
      impact: "alto",
      effort: "medio",
    });
  }

  const bestHour = hours[0];
  if (bestHour) {
    pushAction(actions, {
      title: `Proteggi il picco delle ${bestHour.label}`,
      reason: `È la fascia che genera più incassi: ${MONEY.format(bestHour.revenue)} nel periodo analizzato.`,
      nextStep: "Prepara staff, ingredienti e stampanti 30 minuti prima del picco.",
      impact: "alto",
      effort: "basso",
    });
  }

  const topTable = tables[0];
  if (topTable) {
    pushAction(actions, {
      title: `Trasforma ${topTable.label} in tavolo premium`,
      reason: `È il tavolo più profittevole con ${MONEY.format(topTable.revenue)} generati.`,
      nextStep: "Usalo per gruppi grandi o clienti ad alto valore quando possibile.",
      impact: "medio",
      effort: "basso",
    });
  }

  const star = products[0];
  if (star) {
    pushAction(actions, {
      title: `Spingi “${star.name}” come prodotto bandiera`,
      reason: `È il prodotto più forte per quantità/incasso nel periodo analizzato.`,
      nextStep: "Aggiungi badge 'Consigliato', foto migliore e upsell dedicato.",
      impact: "alto",
      effort: "basso",
    });
  }

  if (openOrders.length > 8) {
    pushAction(actions, {
      title: "Riduci stress operativo durante servizio pieno",
      reason: `${openOrders.length} ordini aperti indicano rischio ritardi/errori.`,
      nextStep: "Usa priorità cucina/bar e avvisi automatici sugli ordini fermi.",
      impact: "alto",
      effort: "medio",
    });
  }

  return actions.slice(0, 6);
}

export const getCommercialGrowth = async (req, res) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return res.status(401).json({ message: "Ristorante non autorizzato" });
    if (req.user?.impersonating) {
      return res.status(403).json({ message: "Report commerciali nascosti in modalità assistenza SuperAdmin per privacy." });
    }

    const from = req.query.from ? new Date(req.query.from) : daysAgo(30);
    const to = req.query.to ? new Date(req.query.to) : new Date();
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return res.status(400).json({ message: "Intervallo date non valido" });
    }

    const [orders, openOrders, menuItems] = await Promise.all([
      prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: from, lte: to }, status: { not: "cancelled" } },
        include: { table: true, items: true, payments: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.order.findMany({
        where: { restaurantId, status: { in: ["pending", "in_progress", "ready"] } },
        include: { table: true, items: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.menuItem.findMany({
        where: { restaurantId, isDeleted: false },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      }),
    ]);

    const paidOrders = orders.filter(paidOrServed);
    const revenue = paidOrders.reduce((sum, order) => sum + toNumber(order.totalAmount), 0);
    const avgTicket = paidOrders.length ? revenue / paidOrders.length : 0;
    const products = buildProductMap(paidOrders).sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity);
    const tables = buildTableMap(paidOrders);
    const hours = buildHourlyMap(paidOrders);
    const categories = buildCategoryMap(products);
    const inactiveMenuItems = menuItems.filter((item) => !products.some((p) => p.id === item.id));

    const actions = buildCommercialActions({ orders, products, tables, hours, openOrders });

    return res.json({
      generatedAt: new Date().toISOString(),
      range: { from, to },
      scorecard: {
        revenue,
        orders: orders.length,
        paidOrders: paidOrders.length,
        averageTicket: avgTicket,
        itemsPerPaidOrder: paidOrders.length
          ? products.reduce((sum, p) => sum + p.quantity, 0) / paidOrders.length
          : 0,
        openOrders: openOrders.length,
        menuItems: menuItems.length,
        inactiveMenuItems: inactiveMenuItems.length,
      },
      actions,
      upsell: buildUpsellSuggestions(products),
      menuEngineering: buildMenuEngineering(products),
      bestHours: hours.slice(0, 8),
      bestTables: tables.slice(0, 8),
      categories: categories.slice(0, 8),
      inactiveMenuItems: inactiveMenuItems.slice(0, 12).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        isAvailable: item.isAvailable,
      })),
    });
  } catch (error) {
    console.error("getCommercialGrowth error:", error);
    return res.status(500).json({ message: "Errore durante recupero crescita commerciale" });
  }
};
