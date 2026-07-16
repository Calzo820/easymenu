import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";

const DEMO_PASSWORD = "EasyMenu2026!";
const DEMO_TABLE_TOKEN_PREFIX = "demo-table";
const RESTAURANT_SLUG = "demo";

const DEMO_LOGO_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="118" fill="#0f172a"/>
  <circle cx="256" cy="210" r="108" fill="#f8fafc"/>
  <path d="M156 342h200v34H156z" fill="#f8fafc"/>
  <path d="M192 222c32 36 96 36 128 0" fill="none" stroke="#0f172a" stroke-width="22" stroke-linecap="round"/>
  <text x="256" y="438" text-anchor="middle" font-family="Arial, sans-serif" font-size="46" font-weight="800" fill="#f8fafc">DEMO</text>
</svg>
`)}`;

const image = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=80`;

const demoMenuItems = [
  {
    id: "demo-antipasto-1",
    name: "Tartare mediterranea",
    description: "Manzo battuto al coltello, capperi, limone, olio EVO e chips croccanti.",
    price: 14,
    category: "Antipasti",
    preparationArea: "kitchen",
    sortOrder: 1,
    imageUrl: image("photo-1544025162-d76694265947"),
    allergens: ["glutine"],
  },
  {
    id: "demo-antipasto-2",
    name: "Burrata e pomodorini confit",
    description: "Burrata fresca, pomodorini confit, basilico e pane tostato.",
    price: 11,
    category: "Antipasti",
    preparationArea: "kitchen",
    sortOrder: 2,
    imageUrl: image("photo-1627308595229-7830a5c91f9f"),
    allergens: ["latte", "glutine"],
  },
  {
    id: "demo-antipasto-3",
    name: "Calamaro croccante",
    description: "Calamaro fritto leggero, maionese al lime e insalata di campo.",
    price: 13,
    category: "Antipasti",
    preparationArea: "kitchen",
    sortOrder: 3,
    imageUrl: image("photo-1562967916-eb82221dfb92"),
    allergens: ["glutine", "molluschi", "uova"],
  },
  {
    id: "demo-primo-1",
    name: "Carbonara croccante",
    description: "Rigatoni, guanciale, pecorino romano, uovo e pepe tostato.",
    price: 13,
    category: "Primi",
    preparationArea: "kitchen",
    sortOrder: 4,
    imageUrl: image("photo-1551183053-bf91a1d81141"),
    allergens: ["glutine", "uova", "latte"],
  },
  {
    id: "demo-primo-2",
    name: "Risotto limone e gambero",
    description: "Riso mantecato, limone, gambero rosso e polvere di cappero.",
    price: 18,
    category: "Primi",
    preparationArea: "kitchen",
    sortOrder: 5,
    imageUrl: image("photo-1476124369491-e7addf5db371"),
    allergens: ["crostacei", "latte"],
  },
  {
    id: "demo-primo-3",
    name: "Pacchero al ragu bianco",
    description: "Pacchero, vitello, rosmarino, fondo bruno e parmigiano.",
    price: 15,
    category: "Primi",
    preparationArea: "kitchen",
    sortOrder: 6,
    imageUrl: image("photo-1621996346565-e3dbc646d9a9"),
    allergens: ["glutine", "latte"],
  },
  {
    id: "demo-secondo-1",
    name: "Filetto al pepe verde",
    description: "Filetto di manzo, salsa al pepe verde e patata fondente.",
    price: 24,
    category: "Secondi",
    preparationArea: "kitchen",
    sortOrder: 7,
    imageUrl: image("photo-1600891964092-4316c288032e"),
    allergens: ["latte"],
  },
  {
    id: "demo-secondo-2",
    name: "Branzino alle erbe",
    description: "Branzino, erbe fini, verdure arrosto e salsa agrumata.",
    price: 21,
    category: "Secondi",
    preparationArea: "kitchen",
    sortOrder: 8,
    imageUrl: image("photo-1519708227418-c8fd9a32b7a2"),
    allergens: ["pesce"],
  },
  {
    id: "demo-secondo-3",
    name: "Parmigiana leggera",
    description: "Melanzana, pomodoro San Marzano, provola e basilico.",
    price: 12,
    category: "Secondi",
    preparationArea: "kitchen",
    sortOrder: 9,
    imageUrl: image("photo-1598515214211-89d3c73ae83b"),
    allergens: ["latte"],
  },
  {
    id: "demo-contorno-1",
    name: "Patate fondenti",
    description: "Patate, burro chiarificato, rosmarino e sale affumicato.",
    price: 5,
    category: "Contorni",
    preparationArea: "kitchen",
    sortOrder: 10,
    imageUrl: image("photo-1518013431117-eb1465fa5752"),
    allergens: ["latte"],
  },
  {
    id: "demo-contorno-2",
    name: "Verdure di stagione",
    description: "Verdure grigliate, olio EVO e vinaigrette alle erbe.",
    price: 6,
    category: "Contorni",
    preparationArea: "kitchen",
    sortOrder: 11,
    imageUrl: image("photo-1512621776951-a57141f2eefd"),
    allergens: [],
  },
  {
    id: "demo-dolce-1",
    name: "Tiramisu espresso",
    description: "Mascarpone, caffe espresso, cacao e biscotto leggero.",
    price: 7,
    category: "Dolci",
    preparationArea: "kitchen",
    sortOrder: 12,
    imageUrl: image("photo-1571877227200-a0d98ea607e9"),
    allergens: ["glutine", "latte", "uova"],
  },
  {
    id: "demo-dolce-2",
    name: "Cheesecake agrumi",
    description: "Crema al formaggio, crumble e gel agli agrumi.",
    price: 7,
    category: "Dolci",
    preparationArea: "kitchen",
    sortOrder: 13,
    imageUrl: image("photo-1565958011703-44f9829ba187"),
    allergens: ["glutine", "latte", "uova"],
  },
  {
    id: "demo-bar-1",
    name: "Acqua frizzante",
    description: "Bottiglia in vetro 75cl.",
    price: 2.5,
    category: "Bevande",
    preparationArea: "bar",
    sortOrder: 14,
    imageUrl: image("photo-1523362628745-0c100150b504"),
    allergens: [],
  },
  {
    id: "demo-bar-2",
    name: "Spritz Signature",
    description: "Aperol, prosecco, soda e arancia.",
    price: 8,
    category: "Cocktail",
    preparationArea: "bar",
    sortOrder: 15,
    imageUrl: image("photo-1551751299-1b51cab2694c"),
    allergens: ["solfiti"],
  },
  {
    id: "demo-bar-3",
    name: "Gin tonic botanico",
    description: "Gin dry, tonica premium, ginepro e scorza di limone.",
    price: 10,
    category: "Cocktail",
    preparationArea: "bar",
    sortOrder: 16,
    imageUrl: image("photo-1551538827-9c037cb4f32a"),
    allergens: [],
  },
  {
    id: "demo-vino-1",
    name: "Calice Etna rosso",
    description: "Selezione cantina, calice 12cl.",
    price: 7,
    category: "Vini",
    preparationArea: "bar",
    sortOrder: 17,
    imageUrl: image("photo-1506377247377-2a5b3b417ebb"),
    allergens: ["solfiti"],
  },
  {
    id: "demo-vino-2",
    name: "Calice Franciacorta",
    description: "Metodo classico, calice 10cl.",
    price: 9,
    category: "Vini",
    preparationArea: "bar",
    sortOrder: 18,
    imageUrl: image("photo-1547595628-c61a29f496f0"),
    allergens: ["solfiti"],
  },
];

function dateAt(daysFromToday) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(12, 0, 0, 0);
  return date;
}

function dateInDays(daysFromToday) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date;
}

function vatRateForCategory(category) {
  return ["Bevande", "Cocktail", "Vini"].includes(category) ? 22 : 10;
}

function orderTotal(items) {
  const byId = new Map(demoMenuItems.map((item) => [item.id, item]));
  return items.reduce((sum, item) => sum + Number(byId.get(item.menuItemId)?.price || 0) * item.quantity, 0);
}

async function upsertDemoOrder({ id, restaurantId, table, status, paymentStatus = "unpaid", customerName, items, notes }) {
  const sessionId = `${id}-session`;
  const totalAmount = orderTotal(items);

  await prisma.tableSession.upsert({
    where: { id: sessionId },
    update: {
      restaurantId,
      tableId: table.id,
      status: paymentStatus === "pending" ? "closing" : "open",
      guestName: customerName,
      notes,
      totalAmount,
    },
    create: {
      id: sessionId,
      restaurantId,
      tableId: table.id,
      status: paymentStatus === "pending" ? "closing" : "open",
      guestName: customerName,
      notes,
      totalAmount,
    },
  });

  await prisma.orderItem.deleteMany({ where: { orderId: id } });

  await prisma.order.upsert({
    where: { id },
    update: {
      restaurantId,
      tableId: table.id,
      tableSessionId: sessionId,
      customerName,
      notes,
      status,
      paymentStatus,
      totalAmount,
      closedAt: null,
      items: {
        create: items.map((item) => {
          const menuItem = demoMenuItems.find((menu) => menu.id === item.menuItemId);
          return {
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            notes: item.notes || null,
            nameSnapshot: menuItem.name,
            priceSnapshot: menuItem.price,
            categorySnapshot: menuItem.category,
            preparationArea: menuItem.preparationArea,
          };
        }),
      },
    },
    create: {
      id,
      restaurantId,
      tableId: table.id,
      tableSessionId: sessionId,
      customerName,
      notes,
      status,
      paymentStatus,
      totalAmount,
      orderNumber: Number(id.replace(/\D/g, "")) || 1,
      source: "qr",
      items: {
        create: items.map((item) => {
          const menuItem = demoMenuItems.find((menu) => menu.id === item.menuItemId);
          return {
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            notes: item.notes || null,
            nameSnapshot: menuItem.name,
            priceSnapshot: menuItem.price,
            categorySnapshot: menuItem.category,
            preparationArea: menuItem.preparationArea,
          };
        }),
      },
    },
  });
}

async function main() {
  console.log("Creo/aggiorno account demo completo EasyMenu...");

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: RESTAURANT_SLUG },
    update: {
      name: "EasyMenu Demo Bistro",
      logoUrl: DEMO_LOGO_URL,
      primaryColor: "#0f766e",
      currency: "EUR",
      isActive: true,
      plan: "growth",
    },
    create: {
      name: "EasyMenu Demo Bistro",
      slug: RESTAURANT_SLUG,
      logoUrl: DEMO_LOGO_URL,
      primaryColor: "#0f766e",
      currency: "EUR",
      isActive: true,
      plan: "growth",
    },
  });

  const demoAccessUntil = dateInDays(30);
  await prisma.saaSSubscription.upsert({
    where: { restaurantId: restaurant.id },
    update: {
      plan: "growth",
      status: "trialing",
      trialEndsAt: demoAccessUntil,
      currentPeriodEnd: demoAccessUntil,
      cancelAtPeriodEnd: false,
    },
    create: {
      restaurantId: restaurant.id,
      plan: "growth",
      status: "trialing",
      trialEndsAt: demoAccessUntil,
      currentPeriodEnd: demoAccessUntil,
      cancelAtPeriodEnd: false,
    },
  });

  for (let index = 1; index <= 20; index += 1) {
    const table = {
      name: `Tavolo ${index}`,
      code: `T${index}`,
      qrToken: `${DEMO_TABLE_TOKEN_PREFIX}-${index}`,
      seats: 4,
      zone: "Sala",
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

  for (const item of demoMenuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {
        ...item,
        restaurantId: restaurant.id,
        shortDescription: item.description,
        vatRate: vatRateForCategory(item.category),
        isFeatured: item.sortOrder <= 5 || ["Cocktail", "Vini", "Dolci"].includes(item.category),
        isAvailable: true,
        isDeleted: false,
      },
      create: {
        ...item,
        restaurantId: restaurant.id,
        shortDescription: item.description,
        vatRate: vatRateForCategory(item.category),
        isFeatured: item.sortOrder <= 5 || ["Cocktail", "Vini", "Dolci"].includes(item.category),
        isAvailable: true,
        isDeleted: false,
      },
    });
  }

  const tables = await prisma.table.findMany({ where: { restaurantId: restaurant.id } });
  const byCode = new Map(tables.map((table) => [table.code, table]));

  await prisma.reservation.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.reservation.createMany({
    data: [
      { restaurantId: restaurant.id, tableId: byCode.get("T3")?.id, customerName: "Luca Bianchi", phone: "+39 333 111 2233", date: dateAt(0), time: "20:15", guests: 4, notes: "Compleanno, preferisce tavolo tranquillo", status: "booked" },
      { restaurantId: restaurant.id, tableId: byCode.get("T8")?.id, customerName: "Sara Conti", phone: "+39 333 444 5566", date: dateAt(0), time: "21:00", guests: 2, notes: "Allergia frutta a guscio", status: "booked" },
      { restaurantId: restaurant.id, tableId: byCode.get("T12")?.id, customerName: "Marco De Luca", phone: "+39 333 777 8899", date: dateAt(1), time: "19:45", guests: 6, notes: "Richiesto seggiolone", status: "booked" },
      { restaurantId: restaurant.id, tableId: byCode.get("T15")?.id, customerName: "Giulia Ferri", phone: "+39 333 222 4455", date: dateAt(1), time: "20:30", guests: 3, notes: "Arriveranno con cane piccolo", status: "booked" },
      { restaurantId: restaurant.id, tableId: byCode.get("T5")?.id, customerName: "Cliente arrivato", phone: "+39 333 000 0000", date: dateAt(0), time: "19:30", guests: 2, notes: "Demo stato arrivata", status: "seated" },
    ],
  });

  await upsertDemoOrder({
    id: "demo-order-1",
    restaurantId: restaurant.id,
    table: byCode.get("T1"),
    status: "pending",
    customerName: "Tavolo demo 1",
    notes: "Ordine appena arrivato",
    items: [
      { menuItemId: "demo-primo-1", quantity: 2 },
      { menuItemId: "demo-bar-2", quantity: 2 },
    ],
  });

  await upsertDemoOrder({
    id: "demo-order-2",
    restaurantId: restaurant.id,
    table: byCode.get("T4"),
    status: "in_progress",
    customerName: "Tavolo demo 4",
    notes: "Secondo giro",
    items: [
      { menuItemId: "demo-secondo-1", quantity: 1 },
      { menuItemId: "demo-contorno-1", quantity: 1 },
      { menuItemId: "demo-vino-1", quantity: 2 },
    ],
  });

  await upsertDemoOrder({
    id: "demo-order-3",
    restaurantId: restaurant.id,
    table: byCode.get("T7"),
    status: "ready",
    customerName: "Tavolo demo 7",
    notes: "Da servire",
    items: [
      { menuItemId: "demo-secondo-2", quantity: 2 },
      { menuItemId: "demo-contorno-2", quantity: 2 },
    ],
  });

  console.log("OK. Demo completa pronta.");
  console.log(`Ristorante: EasyMenu Demo Bistro (${RESTAURANT_SLUG})`);
  console.log(`Menu cliente: /menu/${RESTAURANT_SLUG}/${DEMO_TABLE_TOKEN_PREFIX}-1`);
  console.log(`Login owner: owner@demo.test / ${DEMO_PASSWORD}`);
  console.log("Login staff: cucina@demo.test, bar@demo.test, cassa@demo.test");
}

main()
  .catch((error) => {
    console.error("Errore creazione demo completa:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
