import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";

const DEMO_PASSWORD = "EasyMenu2026!";
const DEMO_TABLE_TOKEN_PREFIX = "demo-table";

const demoMenuItems = [
  ["demo-antipasto-1", "Tagliere della casa", "Salumi, formaggi, focaccia calda e confettura", 12, "Antipasti", "kitchen", 1],
  ["demo-primo-1", "Carbonara", "Guanciale croccante, pecorino romano, uovo e pepe", 12, "Primi", "kitchen", 2],
  ["demo-secondo-1", "Burger EasyMenu", "Pane artigianale, manzo, cheddar, bacon e salsa della casa", 15, "Secondi", "kitchen", 3],
  ["demo-dolce-1", "Tiramisù", "Mascarpone, caffè espresso e cacao", 6, "Dolci", "kitchen", 4],
  ["demo-bevanda-1", "Acqua frizzante", "Bottiglia 75cl", 2, "Bevande", "bar", 5],
  ["demo-bevanda-2", "Spritz", "Aperol, prosecco, soda e arancia", 7, "Bevande", "bar", 6],
];

async function main() {
  console.log("Creo/aggiorno demo reale EasyMenu...");

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "demo" },
    update: {
      name: "EasyMenu Demo",
      primaryColor: "#2563eb",
      currency: "EUR",
      isActive: true,
      plan: "growth",
    },
    create: {
      name: "EasyMenu Demo",
      slug: "demo",
      primaryColor: "#2563eb",
      currency: "EUR",
      isActive: true,
      plan: "growth",
    },
  });

  const demoTableToken = `${DEMO_TABLE_TOKEN_PREFIX}-${restaurant.id}`;

  const existingTable = await prisma.table.findFirst({
    where: {
      restaurantId: restaurant.id,
      code: "T1",
    },
  });

  if (existingTable) {
    await prisma.table.update({
      where: { id: existingTable.id },
      data: {
        name: "Tavolo 1",
        code: "T1",
        qrToken: demoTableToken,
        seats: 4,
        zone: "Sala",
        sortOrder: 1,
        isActive: true,
      },
    });
  } else {
    await prisma.table.create({
      data: {
        restaurantId: restaurant.id,
        name: "Tavolo 1",
        code: "T1",
        qrToken: demoTableToken,
        seats: 4,
        zone: "Sala",
        sortOrder: 1,
        isActive: true,
      },
    });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const users = [
    { name: "Owner Demo", email: "owner@demo.test", role: "owner" },
    { name: "Admin Demo", email: "admin@demo.test", role: "admin" },
    { name: "Cucina Demo", email: "cucina@demo.test", role: "kitchen" },
    { name: "Bar Demo", email: "bar@demo.test", role: "bar" },
    { name: "Cassa Demo", email: "cassa@demo.test", role: "cashier" },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        restaurantId: restaurant.id,
        name: user.name,
        role: user.role,
        isActive: true,
        passwordHash,
      },
      create: {
        restaurantId: restaurant.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: true,
        passwordHash,
      },
    });
  }

  for (const [id, name, description, price, category, preparationArea, sortOrder] of demoMenuItems) {
    await prisma.menuItem.upsert({
      where: { id },
      update: {
        restaurantId: restaurant.id,
        name,
        shortDescription: description,
        description,
        price,
        category,
        preparationArea,
        sortOrder,
        vatRate: category === "Bevande" ? 22 : 10,
        isFeatured: true,
        isAvailable: true,
        isDeleted: false,
      },
      create: {
        id,
        restaurantId: restaurant.id,
        name,
        shortDescription: description,
        description,
        price,
        category,
        preparationArea,
        sortOrder,
        vatRate: category === "Bevande" ? 22 : 10,
        isFeatured: true,
        isAvailable: true,
        isDeleted: false,
      },
    });
  }

  console.log(`OK. Demo reale pronta: /menu/demo/${demoTableToken}`);
  console.log(`Login: owner@demo.test / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Errore creazione demo reale:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
