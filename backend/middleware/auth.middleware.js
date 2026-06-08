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
      email: decoded.email,
      restaurantId: decoded.restaurantId || null,
      role: decoded.role,
      isSuperAdmin: Boolean(decoded.isSuperAdmin),
    };

    next();
  } catch {
    return res.status(401).json({ message: "Token non valido o scaduto" });
  }
};

export const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (req.user?.isSuperAdmin) {
      return next();
    }

    if (!req.user?.role) {
      return res.status(401).json({ message: "Utente non autenticato" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Permessi insufficienti" });
    }

    next();
  };
};
