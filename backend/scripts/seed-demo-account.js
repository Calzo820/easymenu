import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PASSWORD = "Demo1234!";
const RESTAURANT_SLUG = "demo-restaurant";

const users = [
  { name: "Owner Demo", email: "owner@demo.it", role: "owner" },
  { name: "Cucina Demo", email: "cucina@demo.it", role: "kitchen" },
  { name: "Bar Demo", email: "bar@demo.it", role: "bar" },
  { name: "Cassa Demo", email: "cassa@demo.it", role: "cashier" },
];

const tables = [
  { name: "Tavolo 1", code: "T1", qrToken: "demo-table-1", seats: 2, zone: "Sala" },
  { name: "Tavolo 2", code: "T2", qrToken: "demo-table-2", seats: 4, zone: "Sala" },
  { name: "Tavolo 3", code: "T3", qrToken: "demo-table-3", seats: 4, zone: "Veranda" },
  { name: "Tavolo 4", code: "T4", qrToken: "demo-table-4", seats: 6, zone: "Veranda" },
];

const menuItems = [
  {
    name: "Spaghetti alla carbonara",
    description: "Pasta, uova, guanciale, pecorino e pepe.",
    shortDescription: "Classico romano",
    price: 12.5,
    category: "Primi",
    preparationArea: "kitchen",
    isFeatured: true,
    sortOrder: 1,
  },
  {
    name: "Margherita",
    description: "Pomodoro, mozzarella e basilico.",
    shortDescription: "Pizza classica",
    price: 8.5,
    category: "Pizze",
    preparationArea: "kitchen",
    isFeatured: true,
    sortOrder: 2,
  },
  {
    name: "Tagliata di manzo",
    description: "Manzo, rucola, grana e riduzione balsamica.",
    shortDescription: "Secondo piatto",
    price: 19,
    category: "Secondi",
    preparationArea: "kitchen",
    sortOrder: 3,
  },
  {
    name: "Tiramisù",
    description: "Mascarpone, caffè e cacao.",
    shortDescription: "Dolce della casa",
    price: 6,
    category: "Dolci",
    preparationArea: "kitchen",
    sortOrder: 4,
  },
  {
    name: "Acqua naturale",
    description: "Bottiglia 0,75L.",
    shortDescription: "0,75L",
    price: 2,
    category: "Bevande",
    preparationArea: "bar",
    sortOrder: 5,
  },
  {
    name: "Birra alla spina",
    description: "Media 0,4L.",
    shortDescription: "Media 0,4L",
    price: 5,
    category: "Bevande",
    preparationArea: "bar",
    isFeatured: true,
    sortOrder: 6,
  },
  {
    name: "Spritz",
    description: "Aperol, prosecco e soda.",
    shortDescription: "Cocktail aperitivo",
    price: 7,
    category: "Cocktail",
    preparationArea: "bar",
    sortOrder: 7,
  },
];

async function upsertMenuItem(restaurantId, item) {
  const existing = await prisma.menuItem.findFirst({
    where: { restaurantId, name: item.name, isDeleted: false },
  });

  if (existing) {
    return prisma.menuItem.update({
      where: { id: existing.id },
      data: {
        ...item,
        restaurantId,
        isAvailable: true,
        isDeleted: false,
      },
    });
  }

  return prisma.menuItem.create({
    data: {
      ...item,
      restaurantId,
      isAvailable: true,
      isDeleted: false,
      vatRate: 10,
      allergens: [],
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: RESTAURANT_SLUG },
    update: {
      name: "Demo Restaurant",
      isActive: true,
      plan: "starter",
      primaryColor: "#1d4ed8",
      currency: "EUR",
    },
    create: {
      name: "Demo Restaurant",
      slug: RESTAURANT_SLUG,
      isActive: true,
      plan: "starter",
      primaryColor: "#1d4ed8",
      currency: "EUR",
    },
  });

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        restaurantId: restaurant.id,
        name: user.name,
        passwordHash,
        role: user.role,
        isActive: true,
      },
      create: {
        restaurantId: restaurant.id,
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
        isActive: true,
      },
    });
  }

  for (const table of tables) {
    await prisma.table.upsert({
      where: {
        restaurantId_code: {
          restaurantId: restaurant.id,
          code: table.code,
        },
      },
      update: { ...table, isActive: true },
      create: { ...table, restaurantId: restaurant.id, isActive: true },
    });
  }

  for (const item of menuItems) {
    await upsertMenuItem(restaurant.id, item);
  }

  const table1 = await prisma.table.findFirst({
    where: { restaurantId: restaurant.id, code: "T1" },
  });

  if (table1) {
    const openSession = await prisma.tableSession.findFirst({
      where: { restaurantId: restaurant.id, tableId: table1.id, status: "open" },
    });

    if (!openSession) {
      await prisma.tableSession.create({
        data: {
          restaurantId: restaurant.id,
          tableId: table1.id,
          status: "open",
          guestName: "Cliente Demo",
          notes: "Sessione demo creata automaticamente",
        },
      });
    }
  }

  console.log("\n✅ Account demo creati/aggiornati");
  console.log("\nRistorante: Demo Restaurant");
  console.log("Slug: demo-restaurant");
  console.log("\nAccessi:");
  for (const user of users) {
    console.log(`- ${user.role}: ${user.email} / ${PASSWORD}`);
  }
  console.log("\nURL menu demo:");
  console.log("- Tavolo 1: http://localhost:5173/menu/demo-restaurant/demo-table-1");
  console.log("- Tavolo 2: http://localhost:5173/menu/demo-restaurant/demo-table-2");
  console.log("- Tavolo 3: http://localhost:5173/menu/demo-restaurant/demo-table-3");
  console.log("- Tavolo 4: http://localhost:5173/menu/demo-restaurant/demo-table-4");
  console.log("\nAvvia backend e frontend, poi prova il login con owner@demo.it");
}

main()
  .catch((error) => {
    console.error("\n❌ Errore creazione demo account:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
