import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "EasyMenu2026!";

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function upsertUser({ restaurantId, name, email, role, passwordHash }) {
  return prisma.user.upsert({
    where: { email },
    update: {
      restaurantId,
      name,
      role,
      isActive: true,
      passwordHash,
    },
    create: {
      restaurantId,
      name,
      email,
      role,
      isActive: true,
      passwordHash,
    },
  });
}

async function ensureTable(restaurantId, data) {
  const existing = await prisma.table.findFirst({
    where: { restaurantId, code: data.code },
  });

  if (existing) {
    return prisma.table.update({
      where: { id: existing.id },
      data: { ...data, isActive: true },
    });
  }

  return prisma.table.create({
    data: { restaurantId, ...data, isActive: true },
  });
}

async function ensureMenuItem(restaurantId, data) {
  const existing = await prisma.menuItem.findFirst({
    where: {
      restaurantId,
      name: data.name,
      isDeleted: false,
    },
  });

  if (existing) {
    return prisma.menuItem.update({
      where: { id: existing.id },
      data: { ...data, isAvailable: true, isDeleted: false },
    });
  }

  return prisma.menuItem.create({
    data: { restaurantId, ...data, isAvailable: true, isDeleted: false },
  });
}

async function seedRestaurant({ name, slug, primaryColor }) {
  const restaurant = await prisma.restaurant.upsert({
    where: { slug },
    update: {
      name,
      primaryColor,
      currency: "EUR",
      isActive: true,
      plan: "growth",
    },
    create: {
      name,
      slug,
      primaryColor,
      currency: "EUR",
      isActive: true,
      plan: "growth",
    },
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  await Promise.all([
    upsertUser({ restaurantId: restaurant.id, name: "Owner Demo", email: `owner@${slug}.test`, role: "owner", passwordHash }),
    upsertUser({ restaurantId: restaurant.id, name: "Admin Demo", email: `admin@${slug}.test`, role: "admin", passwordHash }),
    upsertUser({ restaurantId: restaurant.id, name: "Cucina Demo", email: `cucina@${slug}.test`, role: "kitchen", passwordHash }),
    upsertUser({ restaurantId: restaurant.id, name: "Bar Demo", email: `bar@${slug}.test`, role: "bar", passwordHash }),
    upsertUser({ restaurantId: restaurant.id, name: "Cassa Demo", email: `cassa@${slug}.test`, role: "cashier", passwordHash }),
  ]);

  await Promise.all([
    ensureTable(restaurant.id, { name: "Tavolo 1", code: "T1", seats: 2, zone: "Sala", sortOrder: 1 }),
    ensureTable(restaurant.id, { name: "Tavolo 2", code: "T2", seats: 4, zone: "Sala", sortOrder: 2 }),
    ensureTable(restaurant.id, { name: "Tavolo 3", code: "T3", seats: 6, zone: "Terrazza", sortOrder: 3 }),
  ]);

  await Promise.all([
    ensureMenuItem(restaurant.id, {
      name: "Margherita Pro",
      shortDescription: "Pomodoro, mozzarella, basilico",
      description: "Pizza classica per testare ordini QR e cucina.",
      price: 8.5,
      category: "Pizze",
      preparationArea: "kitchen",
      vatRate: 10,
      sortOrder: 1,
      isFeatured: true,
      allergens: ["glutine", "latte"],
    }),
    ensureMenuItem(restaurant.id, {
      name: "Burger EasyMenu",
      shortDescription: "Burger demo con patatine",
      description: "Piatto demo per verificare upsell e cassa.",
      price: 13.9,
      category: "Main",
      preparationArea: "kitchen",
      vatRate: 10,
      sortOrder: 2,
      isFeatured: true,
      allergens: ["glutine"],
    }),
    ensureMenuItem(restaurant.id, {
      name: "Tiramisù Casa",
      shortDescription: "Dolce consigliato",
      description: "Perfetto per testare upsell automatico.",
      price: 5.5,
      category: "Dolci",
      preparationArea: "kitchen",
      vatRate: 10,
      sortOrder: 3,
      isFeatured: false,
      allergens: ["uova", "latte"],
    }),
    ensureMenuItem(restaurant.id, {
      name: "Acqua Naturale",
      shortDescription: "50 cl",
      description: "Bevanda demo per area bar.",
      price: 1.5,
      category: "Bevande",
      preparationArea: "bar",
      vatRate: 10,
      sortOrder: 4,
      isFeatured: false,
      allergens: [],
    }),
    ensureMenuItem(restaurant.id, {
      name: "Spritz Demo",
      shortDescription: "Aperitivo",
      description: "Bevanda demo per test bar.",
      price: 6.0,
      category: "Drink",
      preparationArea: "bar",
      vatRate: 10,
      sortOrder: 5,
      isFeatured: true,
      allergens: [],
    }),
  ]);

  return restaurant;
}

async function main() {
  const restaurants = await Promise.all([
    seedRestaurant({ name: "EasyMenu Demo", slug: "demo", primaryColor: "#2563eb" }),
    seedRestaurant({ name: "Pizzeria Demo", slug: slugify("Pizzeria Demo"), primaryColor: "#dc2626" }),
  ]);

  console.log("\n✅ Seed completato. Account demo creati/aggiornati:\n");
  for (const restaurant of restaurants) {
    console.log(`Ristorante: ${restaurant.name} — slug: ${restaurant.slug}`);
    console.log(`  owner@${restaurant.slug}.test   / ${DEMO_PASSWORD}`);
    console.log(`  admin@${restaurant.slug}.test   / ${DEMO_PASSWORD}`);
    console.log(`  cucina@${restaurant.slug}.test  / ${DEMO_PASSWORD}`);
    console.log(`  bar@${restaurant.slug}.test     / ${DEMO_PASSWORD}`);
    console.log(`  cassa@${restaurant.slug}.test   / ${DEMO_PASSWORD}`);
    console.log("");
  }
}

main()
  .catch((error) => {
    console.error("❌ Seed fallito:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
