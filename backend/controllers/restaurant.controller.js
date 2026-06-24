import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { logError } from "../lib/logger.js";

const ALLOWED_PLANS = new Set(["starter", "growth", "semiannual", "enterprise"]);
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

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

function requireSuperAdmin(req, res) {
  if (!isRequestSuperAdmin(req)) {
    res.status(403).json({ message: "Accesso riservato al super admin" });
    return false;
  }
  return true;
}

function serializeRestaurant(restaurant) {
  const owner =
    restaurant.users?.find((user) => user.role === "owner") ||
    restaurant.users?.[0] ||
    null;
  const safeOwner = owner
    ? {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        role: owner.role,
        isActive: owner.isActive,
        createdAt: owner.createdAt,
      }
    : null;

  return {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    primaryColor: restaurant.primaryColor,
    logoUrl: restaurant.logoUrl,
    currency: restaurant.currency,
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
    counts: restaurant._count || {},
    owner: safeOwner,
    users: safeOwner ? [safeOwner] : [],
  };
}

async function getRestaurantForSuperAdmin(id) {
  return prisma.restaurant.findUnique({
    where: { id },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      },
      subscription: true,
      _count: { select: { users: true, menuItems: true, tables: true } },
    },
  });
}

export const listRestaurantsForSuperAdmin = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;

    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        },
        subscription: true,
        _count: { select: { menuItems: true, tables: true, users: true } },
      },
    });

    return res.json({ restaurants: restaurants.map(serializeRestaurant) });
  } catch (error) {
    console.error("listRestaurantsForSuperAdmin error:", error);
    return res.status(500).json({ message: "Errore server durante il recupero ristoranti" });
  }
};

export const createRestaurantForSuperAdmin = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;

    const name = String(req.body.name || "").trim();
    const ownerName = String(req.body.ownerName || "Owner").trim() || "Owner";
    const ownerEmail = String(req.body.ownerEmail || "").trim().toLowerCase();
    const ownerPassword = String(req.body.ownerPassword || "");
    const plan = String(req.body.plan || "starter").trim().toLowerCase();
    const tablesCount = Math.max(0, Math.min(80, Number(req.body.tablesCount || 0)));

    if (!name || !ownerEmail || !ownerPassword) {
      return res.status(400).json({ message: "Nome ristorante, email owner e password sono obbligatori" });
    }

    if (!EMAIL_REGEX.test(ownerEmail)) {
      return res.status(400).json({ message: "Email owner non valida" });
    }

    if (ownerPassword.length < 8) {
      return res.status(400).json({ message: "La password iniziale deve avere almeno 8 caratteri" });
    }

    if (!ALLOWED_PLANS.has(plan)) {
      return res.status(400).json({ message: "Piano non valido" });
    }

    const slug = buildSlug(req.body.slug || name);
    if (!slug) return res.status(400).json({ message: "Slug non valido" });

    const [existingRestaurant, existingUser] = await Promise.all([
      prisma.restaurant.findUnique({ where: { slug } }),
      prisma.user.findUnique({ where: { email: ownerEmail } }),
    ]);

    if (existingRestaurant) return res.status(409).json({ message: "Slug già in uso" });
    if (existingUser) return res.status(409).json({ message: "Email owner già registrata" });

    const passwordHash = await bcrypt.hash(ownerPassword, 12);

    const restaurant = await prisma.$transaction(async (tx) => {
      const created = await tx.restaurant.create({
        data: {
          name,
          slug,
          plan,
          currency: "EUR",
          primaryColor: "#1d4ed8",
          isActive: true,
          users: {
            create: {
              name: ownerName,
              email: ownerEmail,
              passwordHash,
              role: "owner",
              isActive: true,
            },
          },
          subscription: {
            create: {
              plan,
              status: "trialing",
              trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
          },
        },
      });

      if (tablesCount > 0) {
        await tx.table.createMany({
          data: Array.from({ length: tablesCount }).map((_, index) => ({
            restaurantId: created.id,
            name: `Tavolo ${index + 1}`,
            code: String(index + 1),
            seats: 4,
            sortOrder: index + 1,
            isActive: true,
          })),
        });
      }

      return created;
    });

    const full = await getRestaurantForSuperAdmin(restaurant.id);
    return res.status(201).json({ message: "Ristorante creato", restaurant: serializeRestaurant(full) });
  } catch (error) {
    console.error("createRestaurantForSuperAdmin error:", error);
    return res.status(500).json({ message: "Errore server durante creazione ristorante" });
  }
};

export const updateRestaurantForSuperAdmin = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;

    const restaurantId = String(req.params.restaurantId || "");
    const current = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!current) return res.status(404).json({ message: "Ristorante non trovato" });

    const data = {};

    if (req.body.name !== undefined) {
      const name = String(req.body.name || "").trim();
      if (!name) return res.status(400).json({ message: "Nome ristorante obbligatorio" });
      data.name = name;
    }

    if (req.body.slug !== undefined) {
      const slug = buildSlug(req.body.slug);
      if (!slug) return res.status(400).json({ message: "Slug non valido" });
      if (slug !== current.slug) {
        const collision = await prisma.restaurant.findUnique({ where: { slug } });
        if (collision && collision.id !== current.id) return res.status(409).json({ message: "Slug già in uso" });
      }
      data.slug = slug;
    }

    if (req.body.plan !== undefined) {
      const plan = String(req.body.plan || "").trim().toLowerCase();
      if (!ALLOWED_PLANS.has(plan)) return res.status(400).json({ message: "Piano non valido" });
      data.plan = plan;
    }

    if (req.body.isActive !== undefined) {
      data.isActive = Boolean(req.body.isActive);
    }

    if (req.body.primaryColor !== undefined) data.primaryColor = String(req.body.primaryColor || "#1d4ed8");
    if (req.body.logoUrl !== undefined) data.logoUrl = String(req.body.logoUrl || "").trim() || null;

    await prisma.$transaction(async (tx) => {
      await tx.restaurant.update({ where: { id: restaurantId }, data });
      if (data.plan) {
        await tx.saaSSubscription.upsert({
          where: { restaurantId },
          update: { plan: data.plan },
          create: { restaurantId, plan: data.plan, status: "trialing" },
        });
      }
    });

    const updated = await getRestaurantForSuperAdmin(restaurantId);
    return res.json({ message: "Ristorante aggiornato", restaurant: serializeRestaurant(updated) });
  } catch (error) {
    console.error("updateRestaurantForSuperAdmin error:", error);
    return res.status(500).json({ message: "Errore server durante aggiornamento ristorante" });
  }
};

export const impersonateRestaurantForSuperAdmin = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;

    const restaurantId = String(req.params.restaurantId || "");
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) return res.status(404).json({ message: "Ristorante non trovato" });

    const supportReason = String(req.body?.supportReason || "").trim();
    if (supportReason.length < 8) {
      return res.status(400).json({ message: "Serve un motivo supporto o consenso esplicito del ristorante" });
    }

    await logError({
      restaurantId: restaurant.id,
      source: "superadmin-support-access",
      level: "audit",
      message: "Accesso superadmin in modalita supporto",
      metadata: {
        supportReason,
        superAdminEmail: req.user?.email,
        platformUserId: req.user?.userId,
        restaurantName: restaurant.name,
      },
    });

    const token = jwt.sign(
      {
        userId: req.user.userId,
        platformUserId: req.user.userId,
        email: req.user.email,
        restaurantId: restaurant.id,
        role: "owner",
        impersonating: true,
        isSuperAdmin: false,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.json({
      message: "Gestione ristorante aperta",
      token,
      user: {
        id: req.user.userId,
        name: "Super admin",
        email: req.user.email,
        role: "owner",
        isActive: true,
        isImpersonating: true,
      },
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        primaryColor: restaurant.primaryColor,
        logoUrl: restaurant.logoUrl,
        currency: restaurant.currency,
        isActive: restaurant.isActive,
        plan: restaurant.plan,
      },
    });
  } catch (error) {
    console.error("impersonateRestaurantForSuperAdmin error:", error);
    return res.status(500).json({ message: "Errore apertura gestione ristorante" });
  }
};

export const getMyRestaurant = async (req, res) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: req.user.restaurantId } });

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
    const current = await prisma.restaurant.findUnique({ where: { id: req.user.restaurantId } });

    if (!current) {
      return res.status(404).json({ message: "Ristorante non trovato" });
    }

    const data = {};

    if (req.body.name !== undefined) {
      const name = String(req.body.name || "").trim();
      if (!name) return res.status(400).json({ message: "Il nome del ristorante è obbligatorio" });
      data.name = name;

      const nextSlug = buildSlug(name);
      if (!nextSlug) return res.status(400).json({ message: "Nome ristorante non valido" });

      if (nextSlug !== current.slug) {
        const collision = await prisma.restaurant.findUnique({ where: { slug: nextSlug } });
        if (collision && collision.id !== current.id) {
          return res.status(409).json({ message: "Slug già in uso da un altro ristorante" });
        }
        data.slug = nextSlug;
      }
    }

    if (req.body.primaryColor !== undefined) data.primaryColor = String(req.body.primaryColor || "").trim() || "#1d4ed8";
    if (req.body.logoUrl !== undefined) data.logoUrl = String(req.body.logoUrl || "").trim() || null;
    if (req.body.currency !== undefined) data.currency = String(req.body.currency || "EUR").trim().toUpperCase();
    if (req.body.isActive !== undefined) data.isActive = Boolean(req.body.isActive);
    if (req.body.settingsJson !== undefined) data.settingsJson = req.body.settingsJson ?? null;

    const restaurant = await prisma.restaurant.update({ where: { id: req.user.restaurantId }, data });

    return res.json({ message: "Ristorante aggiornato", restaurant });
  } catch (error) {
    console.error("updateMyRestaurant error:", error);
    return res.status(500).json({ message: "Errore server" });
  }
};
