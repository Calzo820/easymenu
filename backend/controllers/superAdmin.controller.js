import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

function requireSuperAdmin(req, res) {
  if (req.user?.role !== "superadmin") {
    res.status(403).json({ message: "Permessi super admin richiesti" });
    return false;
  }
  return true;
}

function serializeRestaurant(restaurant) {
  const owner = restaurant.users?.find((user) => user.role === "owner") || restaurant.users?.[0];
  return {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    plan: restaurant.plan,
    isActive: restaurant.isActive,
    createdAt: restaurant.createdAt,
    ownerEmail: owner?.email || "",
    usersCount: restaurant._count?.users || 0,
    menuItemsCount: restaurant._count?.menuItems || 0,
    tablesCount: restaurant._count?.tables || 0,
    ordersCount: restaurant._count?.orders || 0,
  };
}

export async function listRestaurants(req, res) {
  if (!requireSuperAdmin(req, res)) return;

  try {
    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        users: { select: { email: true, role: true }, orderBy: { createdAt: "asc" } },
        _count: { select: { users: true, menuItems: true, tables: true, orders: true } },
      },
    });

    return res.json({ restaurants: restaurants.map(serializeRestaurant) });
  } catch (error) {
    console.error("listRestaurants error:", error);
    return res.status(500).json({ message: "Errore caricamento ristoranti" });
  }
}

export async function impersonateRestaurant(req, res) {
  if (!requireSuperAdmin(req, res)) return;

  try {
    const restaurantId = req.params.restaurantId;
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) return res.status(404).json({ message: "Ristorante non trovato" });

    const token = jwt.sign(
      {
        userId: req.user.userId,
        restaurantId: restaurant.id,
        role: "superadmin",
        impersonating: true,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "30d" }
    );

    return res.json({
      token,
      user: {
        id: req.user.userId,
        restaurantId: restaurant.id,
        role: "superadmin",
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
    console.error("impersonateRestaurant error:", error);
    return res.status(500).json({ message: "Errore apertura ristorante" });
  }
}
