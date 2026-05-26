import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

function sanitizeRestaurant(restaurant) {
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
    _count: restaurant._count || undefined,
  };
}

function signImpersonationToken(user, restaurant) {
  return jwt.sign(
    {
      userId: user.id,
      restaurantId: restaurant.id,
      role: "superadmin",
      email: user.email,
      isSuperAdminImpersonating: true,
      platformRestaurantId: user.restaurantId,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "30d" }
  );
}

export const listRestaurants = async (_req, res) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { slug: { not: "easymenu-platform" } },
      orderBy: [{ createdAt: "desc" }],
      include: {
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

    return res.json({ restaurants: restaurants.map(sanitizeRestaurant) });
  } catch (error) {
    console.error("listRestaurants superadmin error:", error);
    return res.status(500).json({ message: "Errore durante recupero ristoranti" });
  }
};

export const impersonateRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const [user, restaurant] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user.userId } }),
      prisma.restaurant.findUnique({ where: { id: restaurantId } }),
    ]);

    if (!user || user.role !== "superadmin") {
      return res.status(403).json({ message: "Solo il superadmin può gestire altri ristoranti" });
    }

    if (!restaurant) {
      return res.status(404).json({ message: "Ristorante non trovato" });
    }

    const token = signImpersonationToken(user, restaurant);

    return res.json({
      message: `Gestione ristorante ${restaurant.name} attivata`,
      token,
      user: {
        id: user.id,
        restaurantId: restaurant.id,
        name: user.name,
        email: user.email,
        role: "superadmin",
        isActive: user.isActive,
      },
      restaurant: sanitizeRestaurant(restaurant),
      isSuperAdminImpersonating: true,
    });
  } catch (error) {
    console.error("impersonateRestaurant error:", error);
    return res.status(500).json({ message: "Errore durante apertura ristorante" });
  }
};
