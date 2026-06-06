import dotenv from "dotenv";
import prisma from "../lib/prisma.js";

dotenv.config();

async function main() {
  const result = await prisma.$executeRawUnsafe(
    `UPDATE "User" SET "role" = 'owner' WHERE "role"::text IN ('superadmin', 'super_admin')`
  );

  console.log(`Fix ruoli superadmin completato. Record aggiornati: ${result}`);
}

main()
  .catch((error) => {
    console.error("Errore fix ruoli superadmin:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
