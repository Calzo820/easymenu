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


function getSuperAdminEmails() {
  return String(process.env.SUPER_ADMIN_EMAILS || "easy.menu.service@gmail.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export const listRestaurantsForSuperAdmin = async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { email: true, role: true, isActive: true },
    });

    const allowedEmails = getSuperAdminEmails();
    const isAllowed =
      currentUser?.isActive &&
      allowedEmails.includes(String(currentUser.email || "").toLowerCase());

    if (!isAllowed) {
      return res.status(403).json({ message: "Accesso super admin non autorizzato" });
    }

    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subscription: true,
        users: {
          where: { role: "owner" },
          select: { id: true, name: true, email: true, isActive: true },
          take: 1,
        },
        _count: {
          select: {
            menuItems: true,
            tables: true,
            orders: true,
          },
        },
      },
    });

    const totals = await prisma.restaurant.aggregate({
      _count: { id: true },
    });

    const [activeRestaurants, suspendedRestaurants, orders, tables] = await Promise.all([
      prisma.restaurant.count({ where: { isActive: true } }),
      prisma.restaurant.count({ where: { isActive: false } }),
      prisma.order.count(),
      prisma.table.count(),
    ]);

    return res.json({
      summary: {
        restaurants: totals._count.id,
        activeRestaurants,
        suspendedRestaurants,
        orders,
        tables,
      },
      restaurants: restaurants.map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        primaryColor: restaurant.primaryColor,
        logoUrl: restaurant.logoUrl,
        currency: restaurant.currency,
        isActive: restaurant.isActive,
        plan: restaurant.plan,
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
        owner: restaurant.users?.[0] || null,
        counts: {
          menuItems: restaurant._count.menuItems,
          tables: restaurant._count.tables,
          orders: restaurant._count.orders,
        },
      })),
    });
  } catch (error) {
    console.error("listRestaurantsForSuperAdmin error:", error);
    return res.status(500).json({ message: "Errore server super admin" });
  }
};
