import bcrypt from "bcrypt";
import dotenv from "dotenv";
import prisma from "../lib/prisma.js";

dotenv.config();

const email = String(process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
const password = String(process.env.SUPER_ADMIN_PASSWORD || "");
const name = String(process.env.SUPER_ADMIN_NAME || "Super Admin").trim();

if (!email || !password) {
  console.error("Imposta SUPER_ADMIN_EMAIL e SUPER_ADMIN_PASSWORD nel file .env del backend.");
  process.exit(1);
}

if (password.length < 8) {
  console.error("SUPER_ADMIN_PASSWORD deve avere almeno 8 caratteri.");
  process.exit(1);
}

const platformRestaurant = await prisma.restaurant.upsert({
  where: { slug: "easymenu-platform" },
  update: { name: "EasyMenu Platform", isActive: true },
  create: {
    name: "EasyMenu Platform",
    slug: "easymenu-platform",
    primaryColor: "#111827",
    currency: "EUR",
    isActive: true,
    plan: "enterprise",
  },
});

const existing = await prisma.user.findUnique({ where: { email } });
const passwordHash = await bcrypt.hash(password, 12);

const user = existing
  ? await prisma.user.update({
      where: { email },
      data: {
        restaurantId: platformRestaurant.id,
        name,
        passwordHash,
        role: "superadmin",
        isActive: true,
      },
    })
  : await prisma.user.create({
      data: {
        restaurantId: platformRestaurant.id,
        name,
        email,
        passwordHash,
        role: "superadmin",
        isActive: true,
      },
    });

console.log(`✅ Super admin pronto: ${user.email}`);
await prisma.$disconnect();
