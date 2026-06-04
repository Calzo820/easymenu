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


function getAllowedSuperAdminEmails() {
  return String(process.env.SUPER_ADMIN_EMAILS || "easy.menu.service@gmail.com,calzo820@gmail.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function requireSuperAdminUser(req, res) {
  const currentUser = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, email: true, role: true, isActive: true },
  });

  if (!currentUser || !currentUser.isActive) {
    res.status(401).json({ message: "Utente non valido" });
    return null;
  }

  const allowedEmails = getAllowedSuperAdminEmails();
  const email = String(currentUser.email || "").toLowerCase();

  if (!allowedEmails.includes(email)) {
    res.status(403).json({ message: "Accesso super admin non autorizzato" });
    return null;
  }

  return currentUser;
}

export const listRestaurantsForSuperAdmin = async (req, res) => {
  try {
    const superAdmin = await requireSuperAdminUser(req, res);
    if (!superAdmin) return;

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
            orders: true,
            tables: true,
            menuItems: true,
            users: true,
          },
        },
      },
    });

    const mapped = restaurants.map((restaurant) => {
      const owner = restaurant.users?.[0] || null;

      return {
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
              plan: restaurant.subscription.plan,
              status: restaurant.subscription.status,
              currentPeriodEnd: restaurant.subscription.currentPeriodEnd,
              trialEndsAt: restaurant.subscription.trialEndsAt,
              cancelAtPeriodEnd: restaurant.subscription.cancelAtPeriodEnd,
            }
          : null,
        owner: owner
          ? {
              id: owner.id,
              name: owner.name,
              email: owner.email,
              isActive: owner.isActive,
            }
          : null,
        counts: {
          orders: restaurant._count.orders,
          tables: restaurant._count.tables,
          menuItems: restaurant._count.menuItems,
          users: restaurant._count.users,
        },
      };
    });

    return res.json({
      restaurants: mapped,
      stats: {
        totalRestaurants: mapped.length,
        activeRestaurants: mapped.filter((restaurant) => restaurant.isActive).length,
        suspendedRestaurants: mapped.filter((restaurant) => !restaurant.isActive).length,
        totalOrders: mapped.reduce((sum, restaurant) => sum + restaurant.counts.orders, 0),
        totalTables: mapped.reduce((sum, restaurant) => sum + restaurant.counts.tables, 0),
        totalMenuItems: mapped.reduce((sum, restaurant) => sum + restaurant.counts.menuItems, 0),
      },
    });
  } catch (error) {
    console.error("listRestaurantsForSuperAdmin error:", error);
    return res.status(500).json({ message: "Errore server super admin" });
  }
};
