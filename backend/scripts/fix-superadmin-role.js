import prisma from "../lib/prisma.js";

async function main() {
  const result = await prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET role = 'owner'
    WHERE role = 'superadmin'
  `);

  console.log(`Utenti superadmin convertiti in owner: ${result}`);
}

main()
  .catch((error) => {
    console.error("fix-superadmin-role error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
