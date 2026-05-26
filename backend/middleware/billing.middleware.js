import prisma from "../lib/prisma.js";
import { billingBlockPayload, resolveBillingState } from "../lib/billingPolicy.js";

export async function requireActiveSubscription(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return res.status(401).json({ message: "Utente non autenticato" });

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { subscription: true },
    });

    if (!restaurant) return res.status(404).json({ message: "Ristorante non trovato" });

    const billing = resolveBillingState(restaurant.subscription, restaurant);
    req.billing = billing;

    if (!billing.allowed) {
      return res.status(402).json(billingBlockPayload(billing));
    }

    return next();
  } catch (error) {
    console.error("requireActiveSubscription error:", error);
    return res.status(500).json({ message: "Errore controllo abbonamento" });
  }
}

export async function requirePublicRestaurantActive(restaurantIdOrSlug, res) {
  const where = String(restaurantIdOrSlug || "").startsWith("c")
    ? { id: String(restaurantIdOrSlug) }
    : { slug: String(restaurantIdOrSlug) };

  const restaurant = await prisma.restaurant.findUnique({ where, include: { subscription: true } });
  if (!restaurant) {
    res.status(404).json({ message: "Ristorante non trovato" });
    return null;
  }

  const billing = resolveBillingState(restaurant.subscription, restaurant);
  if (!billing.allowed) {
    res.status(402).json(billingBlockPayload(billing));
    return null;
  }

  return { restaurant, billing };
}
