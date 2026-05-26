import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");

if (!fs.existsSync(envPath)) {
  console.error("File .env non trovato nella cartella backend.");
  process.exit(1);
}

const raw = fs.readFileSync(envPath, "utf8");
const lines = raw.split(/\r?\n/);
const seen = new Map();
const keep = [];

for (const line of lines) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=/);
  if (!match) {
    keep.push(line);
    continue;
  }

  const key = match[1];
  if (seen.has(key)) {
    const previousIndex = seen.get(key);
    keep[previousIndex] = `# RIMOSSA DUPLICATA: ${keep[previousIndex]}`;
  }
  seen.set(key, keep.length);
  keep.push(line);
}

if (!seen.has("JWT_SECRET")) {
  keep.push('JWT_SECRET="CAMBIA_CON_STRINGA_CASUALE_DI_ALMENO_32_CARATTERI"');
}

fs.writeFileSync(envPath, keep.join("\n"), "utf8");
console.log(".env controllato. Duplicati commentati e JWT_SECRET verificato.");
