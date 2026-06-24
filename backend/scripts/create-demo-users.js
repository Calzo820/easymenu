import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";

const DEMO_PASSWORD = "EasyMenu2026!";
const DEMO_TABLE_TOKEN_PREFIX = "demo-table";

const demoMenuItems = [
  ["demo-antipasto-1", "Tartare mediterranea", "Manzo battuto, capperi, limone, olio EVO e chips croccanti", 14, "Antipasti", "kitchen", 1],
  ["demo-antipasto-2", "Burrata e pomodorini", "Burrata fresca, pomodorini confit, basilico e pane tostato", 11, "Antipasti", "kitchen", 2],
  ["demo-antipasto-3", "Calamaro croccante", "Calamaro fritto leggero, maionese al lime e insalata di campo", 13, "Antipasti", "kitchen", 3],
  ["demo-primo-1", "Carbonara croccante", "Guanciale, pecorino romano, uovo e pepe tostato", 13, "Primi", "kitchen", 4],
  ["demo-primo-2", "Risotto limone e gambero", "Riso mantecato, limone, gambero rosso e polvere di cappero", 18, "Primi", "kitchen", 5],
  ["demo-primo-3", "Pacchero al ragu bianco", "Pacchero, vitello, rosmarino, fondo bruno e parmigiano", 15, "Primi", "kitchen", 6],
  ["demo-secondo-1", "Filetto al pepe verde", "Filetto di manzo, salsa al pepe verde e patata fondente", 24, "Secondi", "kitchen", 7],
  ["demo-secondo-2", "Branzino alle erbe", "Branzino, erbe fini, verdure arrosto e salsa agrumata", 21, "Secondi", "kitchen", 8],
  ["demo-secondo-3", "Parmigiana leggera", "Melanzana, pomodoro San Marzano, provola e basilico", 12, "Secondi", "kitchen", 9],
  ["demo-contorno-1", "Patate fondenti", "Patate, burro chiarificato, rosmarino e sale affumicato", 5, "Contorni", "kitchen", 10],
  ["demo-contorno-2", "Verdure di stagione", "Verdure grigliate, olio EVO e vinaigrette alle erbe", 6, "Contorni", "kitchen", 11],
  ["demo-dolce-1", "Tiramisu espresso", "Mascarpone, caffe espresso, cacao e biscotto leggero", 7, "Dolci", "kitchen", 12],
  ["demo-dolce-2", "Cheesecake agrumi", "Crema al formaggio, crumble e gel agli agrumi", 7, "Dolci", "kitchen", 13],
  ["demo-bar-1", "Acqua frizzante", "Bottiglia 75cl", 2.5, "Bevande", "bar", 14],
  ["demo-bar-2", "Spritz Signature", "Aperol, prosecco, soda e arancia", 8, "Cocktail", "bar", 15],
  ["demo-bar-3", "Gin tonic botanico", "Gin dry, tonica premium, ginepro e scorza di limone", 10, "Cocktail", "bar", 16],
  ["demo-vino-1", "Calice Etna rosso", "Selezione cantina, calice 12cl", 7, "Vini", "bar", 17],
  ["demo-vino-2", "Calice Franciacorta", "Metodo classico, calice 10cl", 9, "Vini", "bar", 18],
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

  for (let index = 1; index <= 20; index += 1) {
    const table = {
      name: `Tavolo ${index}`,
      code: `T${index}`,
      qrToken: `${DEMO_TABLE_TOKEN_PREFIX}-${index}`,
      seats: index % 5 === 0 ? 6 : index % 3 === 0 ? 2 : 4,
      zone: index > 14 ? "Dehors" : index > 8 ? "Veranda" : "Sala",
      sortOrder: index,
      isActive: true,
    };

    await prisma.table.upsert({
      where: {
        restaurantId_code: {
          restaurantId: restaurant.id,
          code: table.code,
        },
      },
      update: table,
      create: { ...table, restaurantId: restaurant.id },
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
        vatRate: category === "Bevande" || category === "Cocktail" || category === "Vini" ? 22 : 10,
        isFeatured: sortOrder <= 5 || ["Cocktail", "Vini", "Dolci"].includes(category),
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
        vatRate: category === "Bevande" || category === "Cocktail" || category === "Vini" ? 22 : 10,
        isFeatured: sortOrder <= 5 || ["Cocktail", "Vini", "Dolci"].includes(category),
        isAvailable: true,
        isDeleted: false,
      },
    });
  }

  console.log(`OK. Demo reale pronta: /menu/demo/${DEMO_TABLE_TOKEN_PREFIX}-1`);
  console.log(`Login: owner@demo.test / ${DEMO_PASSWORD}`);
  console.log("Ruoli: cucina@demo.test, bar@demo.test, cassa@demo.test");
}

main()
  .catch((error) => {
    console.error("Errore creazione demo reale:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
