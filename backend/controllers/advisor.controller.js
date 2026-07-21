import prisma from "../lib/prisma.js";

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getDays(query) {
  const days = Number(query.days || query.periodo || 30);
  if (!Number.isFinite(days)) return 30;
  return Math.min(90, Math.max(7, Math.round(days)));
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildProductStats(orders) {
  const map = new Map();

  for (const order of orders) {
    for (const item of order.items || []) {
      const key = item.menuItemId || item.nameSnapshot || "prodotto";
      const current = map.get(key) || {
        id: key,
        name: item.nameSnapshot || "Prodotto",
        category: item.categorySnapshot || "Menu",
        quantity: 0,
        revenue: 0,
      };

      current.quantity += toNumber(item.quantity);
      current.revenue += toNumber(item.quantity) * toNumber(item.priceSnapshot);
      map.set(key, current);
    }
  }

  return [...map.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
}

function statusCounts(orders) {
  return orders.reduce(
    (acc, order) => {
      acc[order.status] = Number(acc[order.status] || 0) + 1;
      return acc;
    },
    { pending: 0, in_progress: 0, ready: 0 }
  );
}

function makeInsight(priority, title, message, actionLabel, actionHref) {
  return { priority, title, message, actionLabel, actionHref };
}

function buildRuleInsights(facts) {
  const insights = [];

  if (!facts.setup.logoLoaded) {
    insights.push(makeInsight(
      "high",
      "Carica il logo prima della demo",
      "Il menu cliente sembra subito più credibile quando il ristorante vede il proprio brand in alto.",
      "Apri setup",
      "/onboarding"
    ));
  }

  if (facts.setup.tables < 10) {
    insights.push(makeInsight(
      "high",
      "Prepara almeno 10 tavoli demo",
      "Con pochi tavoli la cassa sembra vuota. Crea una sala completa e stampa i QR solo dopo il controllo.",
      "Crea tavoli",
      "/tavoli"
    ));
  }

  if (facts.setup.availableMenuItems < 12 || facts.setup.categories < 4) {
    insights.push(makeInsight(
      "high",
      "Rendi il menu più completo",
      "Per una prova commerciale servono antipasti, primi, secondi, dolci e bevande. Il cliente deve capire il flusso in pochi tocchi.",
      "Apri menu",
      "/admin"
    ));
  }

  if (facts.setup.unavailableItems > 0) {
    insights.push(makeInsight(
      "medium",
      "Controlla i prodotti non disponibili",
      `${facts.setup.unavailableItems} prodotti risultano non disponibili. Tienili visibili solo se vuoi mostrare la gestione reale del servizio.`,
      "Rivedi menu",
      "/admin"
    ));
  }

  if (facts.service.readyOrders >= 2) {
    insights.push(makeInsight(
      "high",
      "Libera subito i piatti pronti",
      "Ci sono piatti pronti in attesa. In servizio reale questa è la cosa che rovina di più la percezione del cliente.",
      "Apri cucina",
      "/cucina"
    ));
  }

  if (facts.service.pendingOrders >= 3) {
    insights.push(makeInsight(
      "medium",
      "Accetta le nuove comande più velocemente",
      "La cucina deve vedere poche decisioni chiare: nuovo, in preparazione, pronto. Tieni la coda pulita.",
      "Apri cucina",
      "/cucina"
    ));
  }

  if (facts.issues.pendingPayments > 0) {
    insights.push(makeInsight(
      "high",
      "Risolvi i pagamenti in sospeso",
      "Prima di far provare il prodotto, la cassa deve mostrare conti chiari e nessun pagamento bloccato.",
      "Apri cassa",
      "/cassa"
    ));
  }

  if (facts.issues.unresolvedErrors > 0) {
    insights.push(makeInsight(
      "medium",
      "Controlla gli errori tecnici aperti",
      "Prima di contattare nuovi ristoranti, sistema gli errori non risolti o mostra un messaggio chiaro.",
      "Contattaci",
      "/contattaci"
    ));
  }

  if (facts.sales.paidOrders === 0) {
    insights.push(makeInsight(
      "medium",
      "Chiudi qualche conto demo",
      "Le statistiche diventano convincenti solo quando hanno incasso, prodotti top e metodi di pagamento.",
      "Apri cassa",
      "/cassa"
    ));
  } else if (facts.sales.averageTicket !== null && facts.sales.averageTicket < 18) {
    insights.push(makeInsight(
      "medium",
      "Alza il ticket medio con bevande e dolci",
      "Il ticket medio e basso: prova a mettere cocktail, calici o dessert tra i consigliati del menu cliente.",
      "Apri menu",
      "/admin"
    ));
  }

  if (facts.sales.topProducts.length > 0) {
    const top = facts.sales.topProducts[0];
    insights.push(makeInsight(
      "low",
      `Metti in evidenza ${top.name}`,
      "Il prodotto più ordinato deve essere facile da trovare: consigliato, foto chiara e descrizione breve.",
      "Apri menu",
      "/admin"
    ));
  }

  if (facts.service.reservationsNext7Days > 0) {
    insights.push(makeInsight(
      "low",
      "Usa le prenotazioni per preparare la sala",
      `Hai ${facts.service.reservationsNext7Days} prenotazioni nei prossimi 7 giorni. Collegale ai tavoli prima del servizio.`,
      "Apri tavoli",
      "/tavoli"
    ));
  }

  const subscriptionProblem = ["past_due", "unpaid", "incomplete", "canceled"].includes(facts.billing.subscriptionStatus || "");
  if (!facts.billing.restaurantActive || subscriptionProblem) {
    insights.unshift(makeInsight(
      "high",
      "Sistema lo stato abbonamento",
      "Il ristorante deve risultare attivo, altrimenti menu e demo possono restare bloccati.",
      "Apri billing",
      "/billing"
    ));
  }

  if (insights.length === 0) {
    insights.push(makeInsight(
      "low",
      "Setup pronto per una prova commerciale",
      "Logo, tavoli, menu e dati operativi sono coerenti. Ora fai provare prima il menu cliente, poi cucina e cassa.",
      "Apri demo",
      "/demo"
    ));
  }

  return insights.slice(0, 5);
}

function extractOutputText(data) {
  if (typeof data?.output_text === "string") return data.output_text;

  return (data?.output || [])
    .flatMap((entry) => entry.content || [])
    .map((content) => content.text || content.output_text || "")
    .join("\n")
    .trim();
}

function parseJsonText(text) {
  const cleaned = String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

function normalizeAiInsights(value) {
  const rows = Array.isArray(value?.insights) ? value.insights : [];
  return rows
    .map((row) => ({
      priority: ["high", "medium", "low"].includes(row.priority) ? row.priority : "medium",
      title: String(row.title || "").slice(0, 80),
      message: String(row.message || "").slice(0, 240),
      actionLabel: String(row.actionLabel || "Apri").slice(0, 32),
      actionHref: String(row.actionHref || "/dashboard").startsWith("/")
        ? String(row.actionHref || "/dashboard")
        : "/dashboard",
    }))
    .filter((row) => row.title && row.message)
    .slice(0, 5);
}

async function buildAiInsights(facts) {
  const enabled = process.env.EASYMENU_AI_ENABLED === "true";
  const apiKey = process.env.OPENAI_API_KEY;

  if (!enabled || !apiKey || facts.privacyMode) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input: [
        {
          role: "system",
          content:
            "Sei il consulente operativo di EasyMenu per ristoranti. Usa solo dati aggregati. Dai consigli brevi, pratici e non invasivi. Non citare dati personali.",
        },
        {
          role: "user",
          content:
            `Dati aggregati ristorante:\n${JSON.stringify(facts, null, 2)}\n\n` +
            "Rispondi solo con JSON valido nel formato: {\"summary\":\"...\",\"insights\":[{\"priority\":\"high|medium|low\",\"title\":\"...\",\"message\":\"...\",\"actionLabel\":\"...\",\"actionHref\":\"/...\"}]}",
        },
      ],
      max_output_tokens: 900,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI advisor non disponibile (${response.status})`);
  }

  const data = await response.json();
  const parsed = parseJsonText(extractOutputText(data));
  const insights = normalizeAiInsights(parsed);

  if (!insights.length) return null;

  return {
    summary: String(parsed.summary || "Consigli aggiornati sul servizio.").slice(0, 180),
    insights,
  };
}

export const getAnalyticsAdvisor = async (req, res) => {
  try {
    const restaurantId = req.user?.restaurantId;
    const privacyMode = Boolean(req.user?.impersonating);

    if (!restaurantId) {
      return res.status(401).json({ message: "Ristorante non autorizzato" });
    }

    const days = getDays(req.query);
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const today = startOfToday();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      restaurant,
      orders,
      activeOrders,
      menuItems,
      tablesCount,
      staffUsersCount,
      reservations,
      pendingPayments,
      unresolvedErrors,
    ] = await Promise.all([
      prisma.restaurant.findUnique({
        where: { id: restaurantId },
        include: { subscription: true },
      }),
      prisma.order.findMany({
        where: {
          restaurantId,
          createdAt: { gte: from },
          status: { not: "cancelled" },
        },
        include: { items: true },
      }),
      prisma.order.findMany({
        where: {
          restaurantId,
          status: { in: ["pending", "in_progress", "ready"] },
        },
        select: { id: true, status: true },
      }),
      prisma.menuItem.findMany({
        where: { restaurantId, isDeleted: false },
        select: {
          id: true,
          name: true,
          category: true,
          isAvailable: true,
          isFeatured: true,
          preparationArea: true,
          price: true,
        },
      }),
      prisma.table.count({
        where: { restaurantId, isActive: true },
      }),
      prisma.user.count({
        where: {
          restaurantId,
          isActive: true,
          role: { in: ["admin", "kitchen", "bar", "cashier"] },
        },
      }),
      prisma.reservation.findMany({
        where: {
          restaurantId,
          date: { gte: today, lte: nextWeek },
          status: { in: ["booked", "seated"] },
        },
        select: { id: true, status: true },
      }),
      prisma.paymentTransaction.count({
        where: {
          restaurantId,
          status: { in: ["unpaid", "pending"] },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.errorLog.count({
        where: { restaurantId, resolvedAt: null },
      }),
    ]);

    const paidOrders = orders.filter((order) => order.paymentStatus === "paid" || order.status === "served");
    const revenue = paidOrders.reduce((sum, order) => sum + toNumber(order.totalAmount), 0);
    const activeCounts = statusCounts(activeOrders);
    const categories = new Set(menuItems.map((item) => item.category).filter(Boolean));
    const unavailableItems = menuItems.filter((item) => !item.isAvailable);
    const topProducts = buildProductStats(paidOrders).slice(0, 5);
    const subscription = restaurant?.subscription || null;

    const facts = {
      privacyMode,
      setup: {
        logoLoaded: Boolean(restaurant?.logoUrl),
        tables: tablesCount,
        menuItems: menuItems.length,
        availableMenuItems: menuItems.length - unavailableItems.length,
        categories: categories.size,
        unavailableItems: unavailableItems.length,
        featuredItems: menuItems.filter((item) => item.isFeatured).length,
        staffUsers: staffUsersCount,
      },
      service: {
        openOrders: activeOrders.length,
        pendingOrders: activeCounts.pending || 0,
        inProgressOrders: activeCounts.in_progress || 0,
        readyOrders: activeCounts.ready || 0,
        reservationsNext7Days: reservations.length,
        seatedReservations: reservations.filter((reservation) => reservation.status === "seated").length,
      },
      sales: {
        periodDays: days,
        orders: orders.length,
        paidOrders: paidOrders.length,
        revenue: privacyMode ? null : Number(revenue.toFixed(2)),
        averageTicket: privacyMode || paidOrders.length === 0 ? null : Number((revenue / paidOrders.length).toFixed(2)),
        topProducts: topProducts.map((product) => ({
          name: product.name,
          category: product.category,
          quantity: product.quantity,
        })),
      },
      billing: {
        restaurantActive: Boolean(restaurant?.isActive),
        plan: restaurant?.plan || null,
        subscriptionStatus: subscription?.status || null,
        cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
      },
      issues: {
        pendingPayments,
        unresolvedErrors,
      },
    };

    const ruleInsights = buildRuleInsights(facts);
    let aiResult = null;

    try {
      aiResult = await buildAiInsights(facts);
    } catch (error) {
      console.warn("EasyMenu advisor fallback:", error.message);
    }

    return res.json({
      generatedAt: new Date().toISOString(),
      source: aiResult ? "openai" : "rules",
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
      aiEnabled: process.env.EASYMENU_AI_ENABLED === "true",
      privacyMode,
      summary: aiResult?.summary || "Consigli operativi generati dai dati del ristorante.",
      insights: aiResult?.insights || ruleInsights,
      facts,
    });
  } catch (error) {
    console.error("getAnalyticsAdvisor error:", error);
    return res.status(500).json({ message: "Consulente EasyMenu temporaneamente non disponibile" });
  }
};
