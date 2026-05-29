import bcrypt from "bcrypt";
import dotenv from "dotenv";
import prisma from "../lib/prisma.js";

dotenv.config();

const email = process.env.SUPER_ADMIN_EMAIL;
const password = process.env.SUPER_ADMIN_PASSWORD;
const name = process.env.SUPER_ADMIN_NAME || "Super Admin";

if (!email || !password) {
  console.error("Imposta SUPER_ADMIN_EMAIL e SUPER_ADMIN_PASSWORD nel file .env del backend.");
  process.exit(1);
}

const slug = "easymenu-platform";
const passwordHash = await bcrypt.hash(password, 12);

const restaurant = await prisma.restaurant.upsert({
  where: { slug },
  update: { name: "EasyMenu Platform", isActive: true },
  create: {
    name: "EasyMenu Platform",
    slug,
    primaryColor: "#111827",
    currency: "EUR",
    isActive: true,
    plan: "enterprise",
  },
});

await prisma.user.upsert({
  where: { email: email.toLowerCase() },
  update: {
    name,
    passwordHash,
    role: "superadmin",
    isActive: true,
    restaurantId: restaurant.id,
  },
  create: {
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: "superadmin",
    isActive: true,
    restaurantId: restaurant.id,
  },
});

console.log(`✅ Super admin pronto: ${email}`);
await prisma.$disconnect();
