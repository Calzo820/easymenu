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
      return res.status(403).json({ message: "Super admin non configurato" });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, isActive: true },
    });

    const currentEmail = String(currentUser?.email || "").toLowerCase();

    if (!currentUser?.isActive || !superAdminEmails.includes(currentEmail)) {
      return res.status(403).json({ message: "Accesso super admin non autorizzato" });
    }

    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        users: {
          where: { role: "owner" },
          select: { name: true, email: true },
          take: 1,
        },
        _count: {
          select: {
            users: true,
            menuItems: true,
            tables: true,
            orders: true,
          },
        },
      },
    });

    const mappedRestaurants = restaurants.map((restaurant) => {
      const owner = restaurant.users?.[0] || null;

      return {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        isActive: restaurant.isActive,
        plan: restaurant.plan,
        primaryColor: restaurant.primaryColor,
        logoUrl: restaurant.logoUrl,
        createdAt: restaurant.createdAt,
        updatedAt: restaurant.updatedAt,
        ownerName: owner?.name || "",
        ownerEmail: owner?.email || "",
        usersCount: restaurant._count?.users || 0,
        menuItemsCount: restaurant._count?.menuItems || 0,
        tablesCount: restaurant._count?.tables || 0,
        ordersCount: restaurant._count?.orders || 0,
      };
    });

    const stats = mappedRestaurants.reduce(
      (acc, restaurant) => {
        acc.restaurants += 1;
        if (restaurant.isActive) acc.activeRestaurants += 1;
        else acc.inactiveRestaurants += 1;
        acc.orders += restaurant.ordersCount || 0;
        acc.tables += restaurant.tablesCount || 0;
        return acc;
      },
      { restaurants: 0, activeRestaurants: 0, inactiveRestaurants: 0, orders: 0, tables: 0 }
    );

    return res.json({ restaurants: mappedRestaurants, stats });
  } catch (error) {
    console.error("listRestaurantsForSuperAdmin error:", error);
    return res.status(500).json({ message: "Errore server durante recupero ristoranti" });
  }
};
