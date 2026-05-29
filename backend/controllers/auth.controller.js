import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const buildSlug = (value) => {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const signToken = (user) =>
  jwt.sign(
    {
      userId: user.id,
      restaurantId: user.restaurantId,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
}

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
  };
}

export const registerOwner = async (req, res) => {
  try {
    const restaurantName = String(req.body.restaurantName || "").trim();
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!restaurantName || !name || !email || !password) {
      return res.status(400).json({ message: "Compila tutti i campi obbligatori" });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Email non valida" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "La password deve avere almeno 8 caratteri" });
    }

    const slug = buildSlug(restaurantName);
    if (!slug) {
      return res.status(400).json({ message: "Nome ristorante non valido" });
    }

    const [existingUser, existingRestaurant] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.restaurant.findUnique({ where: { slug } }),
    ]);

    if (existingUser) {
      return res.status(409).json({ message: "Email già registrata" });
    }

    if (existingRestaurant) {
      return res.status(409).json({ message: "Esiste già un ristorante con questo nome o slug" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: restaurantName,
          slug,
          primaryColor: "#1d4ed8",
          currency: "EUR",
          isActive: true,
          plan: "starter",
        },
      });

      const user = await tx.user.create({
        data: {
          restaurantId: restaurant.id,
          name,
          email,
          passwordHash,
          role: "owner",
          isActive: true,
        },
      });

      return { restaurant, user };
    });

    const token = signToken(result.user);

    return res.status(201).json({
      message: "Registrazione completata",
      token,
      user: sanitizeUser(result.user),
      restaurant: sanitizeRestaurant(result.restaurant),
    });
  } catch (error) {
    console.error("registerOwner error:", error);
    return res.status(500).json({ message: "Errore server durante la registrazione" });
  }
};

export const login = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email e password sono obbligatorie" });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Email non valida" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { restaurant: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Credenziali non valide" });
    }

    if (user.role !== "superadmin" && (!user.restaurant || user.restaurant.isActive === false)) {
      return res.status(403).json({ message: "Ristorante non attivo" });
    }

    if (!user.passwordHash) {
      console.error("login error: utente senza passwordHash", { email: user.email, id: user.id });
      return res.status(500).json({
        message: "Account non configurato correttamente. Ricrea gli utenti demo.",
      });
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ message: "Credenziali non valide" });
    }

    const token = signToken(user);

    return res.json({
      message: "Login effettuato",
      token,
      user: sanitizeUser(user),
      restaurant: user.restaurant ? sanitizeRestaurant(user.restaurant) : null,
    });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({
      message: "Errore server durante il login",
      details: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

export const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { restaurant: true },
    });

    const activeRestaurant = req.user.restaurantId
      ? await prisma.restaurant.findUnique({ where: { id: req.user.restaurantId } })
      : user?.restaurant;

    if (!user || !user.isActive) {
      return res.status(404).json({ message: "Utente non trovato" });
    }

    return res.json({
      user: sanitizeUser(user),
      restaurant: user.restaurant ? sanitizeRestaurant(user.restaurant) : null,
    });
  } catch (error) {
    console.error("me error:", error);
    return res.status(500).json({ message: "Errore server" });
  }
};
