import prisma from "../lib/prisma.js";

function buildSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const getMyRestaurant = async (req, res) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.user.restaurantId },
    });

    if (!restaurant) {
      return res.status(404).json({ message: "Ristorante non trovato" });
    }

    return res.json(restaurant);
  } catch (error) {
    console.error("getMyRestaurant error:", error);
    return res.status(500).json({ message: "Errore server" });
  }
};

export const updateMyRestaurant = async (req, res) => {
  try {
    const current = await prisma.restaurant.findUnique({
      where: { id: req.user.restaurantId },
    });

    if (!current) {
      return res.status(404).json({ message: "Ristorante non trovato" });
    }

    const data = {};

    if (req.body.name !== undefined) {
      const name = String(req.body.name || "").trim();
      if (!name) {
        return res.status(400).json({ message: "Il nome del ristorante è obbligatorio" });
      }
      data.name = name;

      const nextSlug = buildSlug(name);
      if (!nextSlug) {
        return res.status(400).json({ message: "Nome ristorante non valido" });
      }

      if (nextSlug !== current.slug) {
        const collision = await prisma.restaurant.findUnique({ where: { slug: nextSlug } });
        if (collision && collision.id !== current.id) {
          return res.status(409).json({ message: "Slug già in uso da un altro ristorante" });
        }
        data.slug = nextSlug;
      }
    }

    if (req.body.primaryColor !== undefined) {
      data.primaryColor = String(req.body.primaryColor || "").trim() || "#1d4ed8";
    }

    if (req.body.logoUrl !== undefined) {
      data.logoUrl = String(req.body.logoUrl || "").trim() || null;
    }

    if (req.body.currency !== undefined) {
      data.currency = String(req.body.currency || "EUR").trim().toUpperCase();
    }

    if (req.body.isActive !== undefined) {
      data.isActive = Boolean(req.body.isActive);
    }

    if (req.body.settingsJson !== undefined) {
      data.settingsJson = req.body.settingsJson ?? null;
    }

    const restaurant = await prisma.restaurant.update({
      where: { id: req.user.restaurantId },
      data,
    });

    return res.json({
      message: "Ristorante aggiornato",
      restaurant,
    });
  } catch (error) {
    console.error("updateMyRestaurant error:", error);
    return res.status(500).json({ message: "Errore server" });
  }
};
