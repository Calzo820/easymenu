import crypto from "node:crypto";
import prisma from "../lib/prisma.js";

const DEMO_MENU = [
  { name: "Margherita", description: "Pomodoro, mozzarella, basilico fresco", price: 7.5, category: "Pizze", preparationArea: "kitchen", allergens: ["glutine", "latte"], sortOrder: 10, isFeatured: true },
  { name: "Diavola", description: "Pomodoro, mozzarella, salame piccante", price: 9, category: "Pizze", preparationArea: "kitchen", allergens: ["glutine", "latte"], sortOrder: 20 },
  { name: "Tagliatelle al ragù", description: "Pasta fresca con ragù della casa", price: 12, category: "Primi", preparationArea: "kitchen", allergens: ["glutine", "uova"], sortOrder: 30, isFeatured: true },
  { name: "Spaghetti alle vongole", description: "Vongole, aglio, olio, prezzemolo", price: 14, category: "Primi", preparationArea: "kitchen", allergens: ["glutine", "molluschi"], sortOrder: 40 },
  { name: "Cotoletta con patate", description: "Secondo completo per servizio veloce", price: 13, category: "Secondi", preparationArea: "kitchen", allergens: ["glutine", "uova"], sortOrder: 50 },
  { name: "Insalatona vegetariana", description: "Verdure fresche, feta, olive", price: 10, category: "Insalate", preparationArea: "kitchen", allergens: ["latte"], sortOrder: 60 },
  { name: "Tiramisù", description: "Dolce classico della casa", price: 5.5, category: "Dolci", preparationArea: "kitchen", allergens: ["glutine", "latte", "uova"], sortOrder: 70, isFeatured: true },
  { name: "Acqua naturale 0,75", description: "Bottiglia vetro", price: 2.5, category: "Bevande", preparationArea: "bar", sortOrder: 80 },
  { name: "Coca-Cola", description: "Lattina 33cl", price: 3, category: "Bevande", preparationArea: "bar", sortOrder: 90 },
  { name: "Birra alla spina media", description: "0,4L", price: 5, category: "Birre", preparationArea: "bar", allergens: ["glutine"], sortOrder: 100 },
  { name: "Spritz", description: "Aperitivo pronto per servizio bar", price: 6, category: "Cocktail", preparationArea: "bar", sortOrder: 110 },
  { name: "Caffè espresso", description: "Servizio banco/tavolo", price: 1.5, category: "Caffetteria", preparationArea: "bar", sortOrder: 120 },
];

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-_]/g, "").slice(0, 30);
}

function parsePositiveInt(value, fallback, max = 300) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

function parseMenuImport(raw) {
  const lines = String(raw || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const maybeHeader = lines[0].toLowerCase();
  const hasHeader = maybeHeader.includes("nome") || maybeHeader.includes("name") || maybeHeader.includes("prezzo") || maybeHeader.includes("price");
  const dataLines = hasHeader ? lines.slice(1) : lines;
  return dataLines.map((line, index) => {
    const separator = line.includes(";") ? ";" : ",";
    const [name, price, category = "Menu", preparationArea = "kitchen", description = "", allergens = ""] = line.split(separator).map((cell) => cell.trim());
    const parsedPrice = Number(String(price || "").replace("€", "").replace(",", "."));
    if (!name || !Number.isFinite(parsedPrice) || parsedPrice <= 0) return null;
    const area = preparationArea === "bar" ? "bar" : "kitchen";
    return { name, price: parsedPrice, category: category || "Menu", preparationArea: area, description: description || null, allergens: allergens ? allergens.split(/[|,]/).map((a) => a.trim()).filter(Boolean) : [], sortOrder: 1000 + index };
  }).filter(Boolean);
}

async function buildStatus(restaurantId) {
  const [restaurant, tablesCount, activeTablesCount, menuCount] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id: restaurantId } }),
    prisma.table.count({ where: { restaurantId } }),
    prisma.table.count({ where: { restaurantId, isActive: true } }),
    prisma.menuItem.count({ where: { restaurantId, isDeleted: false } }),
  ]);
  const settings = restaurant?.settingsJson && typeof restaurant.settingsJson === "object" ? restaurant.settingsJson : {};
  const onboarding = settings.onboarding || {};
  const checks = {
    profile: Boolean(restaurant?.name && restaurant?.slug),
    tables: activeTablesCount > 0,
    qr: activeTablesCount > 0,
    menu: menuCount > 0,
    import: Boolean(onboarding.importCompleted || menuCount > DEMO_MENU.length),
    reviewed: Boolean(onboarding.reviewed),
  };
  const completedCount = Object.values(checks).filter(Boolean).length;
  return {
    restaurant: restaurant ? { id: restaurant.id, name: restaurant.name, slug: restaurant.slug, primaryColor: restaurant.primaryColor, currency: restaurant.currency, settingsJson: restaurant.settingsJson } : null,
    counts: { tables: tablesCount, activeTables: activeTablesCount, menuItems: menuCount },
    checks,
    progress: Math.round((completedCount / Object.keys(checks).length) * 100),
    completed: completedCount === Object.keys(checks).length,
    onboarding,
  };
}

async function updateOnboardingSettings(restaurantId, patch) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  const settings = restaurant?.settingsJson && typeof restaurant.settingsJson === "object" ? restaurant.settingsJson : {};
  const onboarding = { ...(settings.onboarding || {}), ...patch, updatedAt: new Date().toISOString() };
  return prisma.restaurant.update({ where: { id: restaurantId }, data: { settingsJson: { ...settings, onboarding } } });
}

export const getOnboardingStatus = async (req, res) => {
  try {
    return res.json(await buildStatus(req.user.restaurantId));
  } catch (error) {
    console.error("getOnboardingStatus error:", error);
    return res.status(500).json({ message: "Errore recupero onboarding" });
  }
};

export const autoSetupRestaurant = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const tablesCount = parsePositiveInt(req.body?.tablesCount, 20, 200);
    const seats = parsePositiveInt(req.body?.seats, 4, 20);
    const zoneMode = req.body?.zoneMode || "sala";
    const overwriteEmptyOnly = req.body?.overwriteEmptyOnly !== false;
    const createDemoMenu = req.body?.createDemoMenu !== false;

    const result = await prisma.$transaction(async (tx) => {
      const existingTables = await tx.table.findMany({ where: { restaurantId }, select: { code: true } });
      const existingCodes = new Set(existingTables.map((t) => t.code));
      const tablesToCreate = [];
      for (let i = 1; i <= tablesCount; i += 1) {
        const code = normalizeCode(`T${i}`);
        if (existingCodes.has(code)) continue;
        const zone = zoneMode === "zones" ? (i <= Math.ceil(tablesCount / 2) ? "Sala" : "Dehors") : "Sala";
        tablesToCreate.push({ restaurantId, name: `Tavolo ${i}`, code, qrToken: crypto.randomUUID(), seats, zone, sortOrder: i, isActive: true });
      }
      if (tablesToCreate.length) await tx.table.createMany({ data: tablesToCreate, skipDuplicates: true });

      const currentMenuCount = await tx.menuItem.count({ where: { restaurantId, isDeleted: false } });
      let demoMenuCreated = 0;
      if (createDemoMenu && (!overwriteEmptyOnly || currentMenuCount === 0)) {
        const existingNames = await tx.menuItem.findMany({ where: { restaurantId, isDeleted: false }, select: { name: true } });
        const names = new Set(existingNames.map((item) => item.name.toLowerCase()));
        const items = DEMO_MENU.filter((item) => !names.has(item.name.toLowerCase())).map((item) => ({ restaurantId, ...item }));
        if (items.length) {
          await tx.menuItem.createMany({ data: items });
          demoMenuCreated = items.length;
        }
      }
      return { tablesCreated: tablesToCreate.length, demoMenuCreated };
    });

    await updateOnboardingSettings(restaurantId, { autoSetupCompleted: true, autoSetupAt: new Date().toISOString(), tablesRequested: tablesCount });
    return res.json({ message: "Setup automatico completato", ...result, status: await buildStatus(restaurantId) });
  } catch (error) {
    console.error("autoSetupRestaurant error:", error);
    return res.status(500).json({ message: "Errore setup automatico" });
  }
};

export const importMenuQuick = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const items = parseMenuImport(req.body?.text);
    if (!items.length) return res.status(400).json({ message: "Nessuna riga valida. Usa: nome;prezzo;categoria;area;descrizione;allergeni" });
    const existingNames = await prisma.menuItem.findMany({ where: { restaurantId, isDeleted: false }, select: { name: true } });
    const names = new Set(existingNames.map((item) => item.name.toLowerCase()));
    const data = items.filter((item) => !names.has(item.name.toLowerCase())).map((item) => ({ restaurantId, ...item }));
    if (data.length) await prisma.menuItem.createMany({ data });
    await updateOnboardingSettings(restaurantId, { importCompleted: true, importedAt: new Date().toISOString(), importedRows: data.length });
    return res.json({ message: "Import menu completato", imported: data.length, skipped: items.length - data.length, status: await buildStatus(restaurantId) });
  } catch (error) {
    console.error("importMenuQuick error:", error);
    return res.status(500).json({ message: "Errore import menu" });
  }
};

export const markOnboardingStep = async (req, res) => {
  try {
    const allowed = new Set(["reviewed", "qrPrinted", "menuChecked", "staffReady"]);
    const step = String(req.body?.step || "");
    if (!allowed.has(step)) return res.status(400).json({ message: "Step onboarding non valido" });
    await updateOnboardingSettings(req.user.restaurantId, { [step]: Boolean(req.body?.value ?? true) });
    return res.json(await buildStatus(req.user.restaurantId));
  } catch (error) {
    console.error("markOnboardingStep error:", error);
    return res.status(500).json({ message: "Errore salvataggio step onboarding" });
  }
};

export const getQrPayload = async (req, res) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: req.user.restaurantId } });
    const tables = await prisma.table.findMany({ where: { restaurantId: req.user.restaurantId, isActive: true }, orderBy: [{ sortOrder: "asc" }, { code: "asc" }] });
    return res.json({ restaurant: { name: restaurant.name, slug: restaurant.slug, primaryColor: restaurant.primaryColor }, tables: tables.map((table) => ({ id: table.id, name: table.name, code: table.code, qrToken: table.qrToken, seats: table.seats, zone: table.zone })) });
  } catch (error) {
    console.error("getQrPayload error:", error);
    return res.status(500).json({ message: "Errore recupero QR" });
  }
};
