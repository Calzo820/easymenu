import prisma from "../lib/prisma.js";

const BILLING_OK = new Set(["trialing", "active"]);
const ROLE_BYPASS = new Set(["owner", "admin"]);

export function requireActiveSubscription({ allowOwnerAdmin = true } = {}) {
  return async (req, res, next) => {
    try {
      if (!req.user?.restaurantId) return res.status(401).json({ message: "Utente non autenticato" });
      if (allowOwnerAdmin && ROLE_BYPASS.has(req.user.role)) return next();

      const restaurant = await prisma.restaurant.findUnique({
        where: { id: req.user.restaurantId },
        include: { subscription: true },
      });
      if (!restaurant || restaurant.isActive === false) return res.status(403).json({ message: "Ristorante non attivo" });

      const subscription = restaurant.subscription;
      const trialOk = subscription?.status === "trialing" && (!subscription.trialEndsAt || subscription.trialEndsAt > new Date());
      const activeOk = subscription && BILLING_OK.has(subscription.status) && (subscription.status !== "trialing" || trialOk);

      if (!activeOk) {
        return res.status(402).json({
          message: "Abbonamento non attivo. Aggiorna il billing per continuare a usare questa funzione.",
          code: "SUBSCRIPTION_REQUIRED",
          billingPath: "/billing",
          plan: restaurant.plan,
          status: subscription?.status || "missing",
        });
      }

      return next();
    } catch (error) {
      console.error("requireActiveSubscription error:", error);
      return res.status(500).json({ message: "Errore controllo abbonamento" });
    }
  };
}
