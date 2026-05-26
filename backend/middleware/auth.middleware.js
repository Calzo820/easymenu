import jwt from "jsonwebtoken";

function getBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return "";
  return authHeader.slice(7).trim();
}

export const requireAuth = (req, res, next) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({ message: "Token mancante o formato non valido" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: decoded.userId,
      restaurantId: decoded.restaurantId,
      role: decoded.role,
      email: decoded.email || null,
      isSuperAdminImpersonating: Boolean(decoded.isSuperAdminImpersonating),
      platformRestaurantId: decoded.platformRestaurantId || null,
    };

    next();
  } catch {
    return res.status(401).json({ message: "Token non valido o scaduto" });
  }
};

export const requireRole = (roles = []) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user?.role) {
      return res.status(401).json({ message: "Utente non autenticato" });
    }

    // Il superadmin ha accesso completo. Quando entra in un ristorante, usa
    // restaurantId nel token e può usare tutti gli endpoint owner/admin/cashier/kitchen/bar.
    if (req.user.role === "superadmin") {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Permessi insufficienti" });
    }

    next();
  };
};
