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
  return String(process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export const listRestaurantsForSuperAdmin = async (req, res) => {
  try {
    const superAdminEmails = getSuperAdminEmails();

    if (superAdminEmails.length === 0) {
      return res.status(403).json({ message: "SUPER_ADMIN_EMAILS non configurato sul backend" });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { email: true, isActive: true },
    });

    const currentEmail = String(currentUser?.email || "").toLowerCase();

    if (!currentUser?.isActive || !superAdminEmails.includes(currentEmail)) {
      return res.status(403).json({ message: "Accesso super admin non autorizzato" });
    }

    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subscription: true,
        users: {
          select: {
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: {
            users: true,
            orders: true,
            tables: true,
            menuItems: true,
          },
        },
      },
    });

    const normalizedRestaurants = restaurants.map((restaurant) => {
      const owner =
        restaurant.users.find((user) => user.role === "owner") ||
        restaurant.users.find((user) => user.isActive) ||
        restaurant.users[0];

      return {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        isActive: restaurant.isActive,
        plan: restaurant.plan,
        currency: restaurant.currency,
        createdAt: restaurant.createdAt,
        updatedAt: restaurant.updatedAt,
        subscriptionStatus: restaurant.subscription?.status || null,
        currentPeriodEnd: restaurant.subscription?.currentPeriodEnd || null,
        ownerName: owner?.name || null,
        ownerEmail: owner?.email || null,
        usersCount: restaurant._count.users,
        ordersCount: restaurant._count.orders,
        tablesCount: restaurant._count.tables,
        menuItemsCount: restaurant._count.menuItems,
      };
    });

    const stats = normalizedRestaurants.reduce(
      (acc, restaurant) => {
        acc.total += 1;
        if (restaurant.isActive) acc.active += 1;
        else acc.inactive += 1;

        if (restaurant.plan && acc[restaurant.plan] !== undefined) {
          acc[restaurant.plan] += 1;
        }

        return acc;
      },
      { total: 0, active: 0, inactive: 0, starter: 0, growth: 0, enterprise: 0 }
    );

    return res.json({
      restaurants: normalizedRestaurants,
      stats,
    });
  } catch (error) {
    console.error("listRestaurantsForSuperAdmin error:", error);
    return res.status(500).json({ message: "Errore server durante il caricamento dei ristoranti" });
  }
};
