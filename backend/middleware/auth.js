export const requireRole = (role) => {
  return (req, res, next) => {
    const userRole = req.headers["role"];

    if (userRole !== role) {
      return res.status(403).json({ error: "Accesso negato" });
    }

    next();
  };
};
