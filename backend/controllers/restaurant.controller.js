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

function getSuperAdminEmails() {
  return String(process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isRequestSuperAdmin(req) {
  const tokenEmail = String(req.user?.email || "").trim().toLowerCase();
  return Boolean(req.user?.isSuperAdmin) || getSuperAdminEmails().includes(tokenEmail);
}

export const listRestaurantsForSuperAdmin = async (req, res) => {
  try {
    if (!isRequestSuperAdmin(req)) {
      return res.status(403).json({ message: "Accesso riservato al super admin" });
    }

    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true, isActive: true },
          orderBy: { createdAt: "asc" },
        },
        subscription: true,
        _count: {
          select: {
            menuItems: true,
            tables: true,
            orders: true,
            users: true,
          },
        },
      },
    });

    return res.json({
      restaurants: restaurants.map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        plan: restaurant.plan,
        isActive: restaurant.isActive,
        createdAt: restaurant.createdAt,
        updatedAt: restaurant.updatedAt,
        subscription: restaurant.subscription
          ? {
              status: restaurant.subscription.status,
              plan: restaurant.subscription.plan,
              currentPeriodEnd: restaurant.subscription.currentPeriodEnd,
              cancelAtPeriodEnd: restaurant.subscription.cancelAtPeriodEnd,
            }
          : null,
        counts: restaurant._count,
        owner:
          restaurant.users.find((user) => user.role === "owner") ||
          restaurant.users[0] ||
          null,
        users: restaurant.users,
      })),
    });
  } catch (error) {
    console.error("listRestaurantsForSuperAdmin error:", error);
    return res.status(500).json({ message: "Errore server durante il recupero ristoranti" });
  }
};


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
