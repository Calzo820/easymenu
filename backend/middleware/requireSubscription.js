export default function requireSubscription(req, res, next) {
  const restaurant = req.restaurant;

  if (!restaurant) {
    return res.status(403).json({
      error: "Ristorante non trovato",
    });
  }

  const allowedStatuses = ["active", "trial"];

  if (!allowedStatuses.includes(restaurant.subscriptionStatus)) {
    return res.status(402).json({
      error: "Abbonamento non attivo",
      code: "SUBSCRIPTION_REQUIRED",
    });
  }

  next();
}
