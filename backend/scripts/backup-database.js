import "dotenv/config";
import prisma from "../lib/prisma.js";
import { runEncryptedBackup } from "../services/backup.service.js";

try {
  const result = await runEncryptedBackup();
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
