import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const ALLOWED_ROLES = new Set(["owner", "admin", "kitchen", "bar", "cashier"]);

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function canManageRole(actorRole, targetRole) {
  if (actorRole === "owner") return true;
  if (actorRole === "admin") return targetRole !== "owner";
  return false;
}

export const listUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { restaurantId: req.user.restaurantId },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });

    return res.json(users.map(sanitizeUser));
  } catch (error) {
    console.error("listUsers error:", error);
    return res.status(500).json({ message: "Errore durante recupero utenti" });
  }
};

export const createUser = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const role = String(req.body.role || "kitchen").trim().toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Nome, email e password sono obbligatori" });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Email non valida" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "La password deve avere almeno 8 caratteri" });
    }

    if (!ALLOWED_ROLES.has(role)) {
      return res.status(400).json({ message: "Ruolo non valido" });
    }

    if (!canManageRole(req.user.role, role)) {
      return res.status(403).json({ message: "Non puoi creare utenti con questo ruolo" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email già registrata" });
    }

    const user = await prisma.user.create({
      data: {
        restaurantId: req.user.restaurantId,
        name,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role,
        isActive: true,
      },
    });

    return res.status(201).json({ message: "Utente creato", user: sanitizeUser(user) });
  } catch (error) {
    console.error("createUser error:", error);
    return res.status(500).json({ message: "Errore durante creazione utente" });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user || user.restaurantId !== req.user.restaurantId) {
      return res.status(404).json({ message: "Utente non trovato" });
    }

    if (!canManageRole(req.user.role, user.role)) {
      return res.status(403).json({ message: "Non puoi modificare questo utente" });
    }

    const data = {};

    if (req.body.name !== undefined) {
      const name = String(req.body.name || "").trim();
      if (!name) return res.status(400).json({ message: "Nome obbligatorio" });
      data.name = name;
    }

    if (req.body.email !== undefined) {
      const email = String(req.body.email || "").trim().toLowerCase();
      if (!EMAIL_REGEX.test(email)) return res.status(400).json({ message: "Email non valida" });
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== user.id) return res.status(409).json({ message: "Email già registrata" });
      data.email = email;
    }

    if (req.body.role !== undefined) {
      const role = String(req.body.role || "").trim().toLowerCase();
      if (!ALLOWED_ROLES.has(role)) return res.status(400).json({ message: "Ruolo non valido" });
      if (!canManageRole(req.user.role, role)) return res.status(403).json({ message: "Non puoi assegnare questo ruolo" });
      data.role = role;
    }

    if (req.body.isActive !== undefined) {
      if (user.id === req.user.userId && req.body.isActive === false) {
        return res.status(400).json({ message: "Non puoi disattivare il tuo account" });
      }
      data.isActive = Boolean(req.body.isActive);
    }

    if (req.body.password) {
      const password = String(req.body.password || "");
      if (password.length < 8) return res.status(400).json({ message: "La password deve avere almeno 8 caratteri" });
      data.passwordHash = await bcrypt.hash(password, 12);
    }

    const updated = await prisma.user.update({ where: { id }, data });
    return res.json({ message: "Utente aggiornato", user: sanitizeUser(updated) });
  } catch (error) {
    console.error("updateUser error:", error);
    return res.status(500).json({ message: "Errore durante aggiornamento utente" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user || user.restaurantId !== req.user.restaurantId) {
      return res.status(404).json({ message: "Utente non trovato" });
    }

    if (user.id === req.user.userId) {
      return res.status(400).json({ message: "Non puoi eliminare il tuo account" });
    }

    if (!canManageRole(req.user.role, user.role)) {
      return res.status(403).json({ message: "Non puoi eliminare questo utente" });
    }

    await prisma.user.delete({ where: { id } });
    return res.json({ message: "Utente eliminato" });
  } catch (error) {
    console.error("deleteUser error:", error);
    return res.status(500).json({ message: "Errore durante eliminazione utente" });
  }
};
