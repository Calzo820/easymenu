import prisma from "../lib/prisma.js";
import { billingBlockPayload, resolveBillingState } from "../lib/billingPolicy.js";

const VALID_AREAS = ["kitchen", "bar"];

function normalizeAllergens(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return [...new Set(input.map((item) => String(item || "").trim()).filter(Boolean))];
  }
  return [...new Set(String(input).split(",").map((item) => item.trim()).filter(Boolean))];
}

function buildMenuItemData(payload) {
  const data = {};

  if (payload.name !== undefined) {
    const name = String(payload.name || "").trim();
    if (!name) throw new Error("Il nome prodotto non può essere vuoto");
    data.name = name;
  }

  if (payload.description !== undefined) {
    data.description = String(payload.description || "").trim() || null;
  }

  if (payload.shortDescription !== undefined) {
    data.shortDescription = String(payload.shortDescription || "").trim() || null;
  }

  if (payload.price !== undefined) {
    const parsedPrice = Number(payload.price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      throw new Error("Il prezzo deve essere un numero maggiore di zero");
    }
    data.price = parsedPrice;
  }

  if (payload.category !== undefined) {
    data.category = String(payload.category || "").trim() || null;
  }

  if (payload.imageUrl !== undefined) {
    data.imageUrl = String(payload.imageUrl || "").trim() || null;
  }

  if (payload.sku !== undefined) {
    data.sku = String(payload.sku || "").trim() || null;
  }

  if (payload.vatRate !== undefined) {
    const vatRate = Number(payload.vatRate);
    if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) {
      throw new Error("IVA non valida");
    }
    data.vatRate = vatRate;
  }

  if (payload.sortOrder !== undefined) {
    const sortOrder = Number(payload.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      throw new Error("Ordinamento non valido");
    }
    data.sortOrder = sortOrder;
  }

  if (payload.preparationArea !== undefined) {
    if (!VALID_AREAS.includes(payload.preparationArea)) {
      throw new Error("preparationArea deve essere 'kitchen' oppure 'bar'");
    }
    data.preparationArea = payload.preparationArea;
  }

  if (payload.allergens !== undefined) {
    data.allergens = normalizeAllergens(payload.allergens);
  }

  if (payload.isAvailable !== undefined) {
    data.isAvailable = Boolean(payload.isAvailable);
  }

  if (payload.isFeatured !== undefined) {
    data.isFeatured = Boolean(payload.isFeatured);
  }

  return data;
}

export const getMenuItems = async (req, res) => {
  try {
    const items = await prisma.menuItem.findMany({
      where: {
        restaurantId: req.user.restaurantId,
        isDeleted: false,
      },
      orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { createdAt: "desc" }],
    });

    return res.json(items);
  } catch (error) {
    console.error("getMenuItems error:", error);
    return res.status(500).json({ message: "Errore server nel recupero del menu" });
  }
};

export const createMenuItem = async (req, res) => {
  try {
    const data = buildMenuItemData(req.body);

    if (!data.name || data.price === undefined || !data.preparationArea) {
      return res.status(400).json({ message: "name, price e preparationArea sono obbligatori" });
    }

    const item = await prisma.menuItem.create({
      data: {
        restaurantId: req.user.restaurantId,
        ...data,
      },
    });

    return res.status(201).json({ message: "Prodotto creato", item });
  } catch (error) {
    console.error("createMenuItem error:", error);
    return res.status(400).json({ message: error.message || "Errore nella creazione del prodotto" });
  }
};

export const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    const existingItem = await prisma.menuItem.findFirst({
      where: { id, restaurantId: req.user.restaurantId, isDeleted: false },
    });

    if (!existingItem) {
      return res.status(404).json({ message: "Prodotto non trovato" });
    }

    const data = buildMenuItemData(req.body);

    const item = await prisma.menuItem.update({
      where: { id },
      data,
    });

    return res.json({ message: "Prodotto aggiornato", item });
  } catch (error) {
    console.error("updateMenuItem error:", error);
    return res.status(400).json({ message: error.message || "Errore nell'aggiornamento del prodotto" });
  }
};

export const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    const existingItem = await prisma.menuItem.findFirst({
      where: { id, restaurantId: req.user.restaurantId, isDeleted: false },
    });

    if (!existingItem) {
      return res.status(404).json({ message: "Prodotto non trovato" });
    }

    await prisma.menuItem.update({
      where: { id },
      data: { isDeleted: true, isAvailable: false },
    });

    return res.json({ message: "Prodotto eliminato" });
  } catch (error) {
    console.error("deleteMenuItem error:", error);
    return res.status(500).json({ message: "Errore server nell'eliminazione del prodotto" });
  }
};

export const getPublicMenu = async (req, res) => {
  try {
    const { slug } = req.params;

    const restaurant = await prisma.restaurant.findUnique({ where: { slug }, include: { subscription: true } });
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ message: "Ristorante non trovato" });
    }

    const billing = resolveBillingState(restaurant.subscription, restaurant);
    if (!billing.allowed) return res.status(402).json(billingBlockPayload(billing));

    const items = await prisma.menuItem.findMany({
      where: {
        restaurantId: restaurant.id,
        isAvailable: true,
        isDeleted: false,
      },
      orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
    });

    return res.json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        primaryColor: restaurant.primaryColor,
        logoUrl: restaurant.logoUrl,
        currency: restaurant.currency,
      },
      items,
    });
  } catch (error) {
    console.error("getPublicMenu error:", error);
    return res.status(500).json({ message: "Errore server nel recupero del menu pubblico" });
  }
};
