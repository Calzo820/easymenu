import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: [] });

const email = process.argv[2] || "owner@demo.test";
const password = process.argv[3] || "EasyMenu2026!";

function printFriendlyError(error) {
  const message = String(error?.message || error || "");
  const dbOffline = error?.code === "P1001" || message.includes("Can't reach database server");

  if (dbOffline) {
    console.error("Database demo non raggiungibile.");
    console.error("Controlla DATABASE_URL, connessione Neon/Render e riprova dopo il wake-up del servizio.");
    return;
  }

  console.error("Controllo demo fallito:", message || "errore sconosciuto");
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email }, include: { restaurant: true } });

  if (!user) {
    console.error(`Utente non trovato: ${email}`);
    console.error("Esegui prima: npm run demo:seed");
    process.exit(1);
  }

  console.log("Utente trovato:", {
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    restaurant: user.restaurant?.name,
    restaurantActive: user.restaurant?.isActive,
    hasPasswordHash: Boolean(user.passwordHash),
  });

  const ok = await bcrypt.compare(password, user.passwordHash || "");
  console.log("Password corretta:", ok);
  if (!ok) process.exit(1);
}

main()
  .catch((error) => { printFriendlyError(error); process.exit(1); })
  .finally(async () => { await prisma.$disconnect().catch(() => {}); });
