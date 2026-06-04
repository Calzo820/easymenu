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

function parseSuperAdminEmails() {
  return String(process.env.SUPER_ADMIN_EMAILS || "easy.menu.service@gmail.com,calzo820@gmail.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function assertSuperAdmin(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
  const allowedEmails = parseSuperAdminEmails();

  if (!user || !user.isActive || !["owner", "admin"].includes(user.role) || !allowedEmails.includes(String(user.email || "").toLowerCase())) {
    res.status(403).json({ message: "Accesso super admin non autorizzato" });
    return null;
  }

  return user;
}

export const listRestaurantsForSuperAdmin = async (req, res) => {
  try {
    const user = await assertSuperAdmin(req, res);
    if (!user) return;

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
            users: true,
            menuItems: true,
            tables: true,
            orders: true,
          },
        },
      },
    });

    const summary = restaurants.reduce(
      (acc, restaurant) => {
        acc.total += 1;
        if (restaurant.isActive) acc.active += 1;
        else acc.suspended += 1;
        acc.orders += restaurant._count?.orders || 0;
        acc.menuItems += restaurant._count?.menuItems || 0;
        acc.tables += restaurant._count?.tables || 0;
        acc.plans[restaurant.plan] = (acc.plans[restaurant.plan] || 0) + 1;
        return acc;
      },
      { total: 0, active: 0, suspended: 0, orders: 0, menuItems: 0, tables: 0, plans: {} }
    );

    return res.json({
      summary,
      restaurants: restaurants.map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        primaryColor: restaurant.primaryColor,
        logoUrl: restaurant.logoUrl,
        currency: restaurant.currency,
        isActive: restaurant.isActive,
        plan: restaurant.plan,
        stripeCustomerId: restaurant.stripeCustomerId,
        createdAt: restaurant.createdAt,
        updatedAt: restaurant.updatedAt,
        subscription: restaurant.subscription
          ? {
              status: restaurant.subscription.status,
              currentPeriodEnd: restaurant.subscription.currentPeriodEnd,
              cancelAtPeriodEnd: restaurant.subscription.cancelAtPeriodEnd,
            }
          : null,
        owner: restaurant.users?.[0] || null,
        counts: restaurant._count,
      })),
    });
  } catch (error) {
    console.error("listRestaurantsForSuperAdmin error:", error);
    return res.status(500).json({ message: "Errore caricamento ristoranti" });
  }
};

export const updateRestaurantForSuperAdmin = async (req, res) => {
  try {
    const user = await assertSuperAdmin(req, res);
    if (!user) return;

    const data = {};
    if (req.body.isActive !== undefined) data.isActive = Boolean(req.body.isActive);
    if (req.body.plan !== undefined) {
      const plan = String(req.body.plan || "").trim();
      if (!["starter", "growth", "enterprise"].includes(plan)) {
        return res.status(400).json({ message: "Piano non valido" });
      }
      data.plan = plan;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "Nessuna modifica valida" });
    }

    const restaurant = await prisma.restaurant.update({
      where: { id: req.params.id },
      data,
    });

    return res.json({ message: "Ristorante aggiornato", restaurant });
  } catch (error) {
    console.error("updateRestaurantForSuperAdmin error:", error);
    return res.status(500).json({ message: "Errore aggiornamento ristorante" });
  }
};

