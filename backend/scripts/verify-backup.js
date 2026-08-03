import crypto from "node:crypto";
import fs from "node:fs/promises";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";

const gunzipAsync = promisify(gunzip);
const MAGIC = Buffer.from("ORDYNORA1");
const LEGACY_MAGIC = Buffer.from("EASYMENU1");
const filePath = process.env.BACKUP_FILE || process.argv[2];
const secret = String(process.env.BACKUP_ENCRYPTION_KEY || "");

if (!filePath) throw new Error("Indica il file con BACKUP_FILE oppure come primo argomento.");
if (secret.length < 32) throw new Error("BACKUP_ENCRYPTION_KEY deve contenere almeno 32 caratteri.");

const encrypted = await fs.readFile(filePath);
const fileMagic = encrypted.subarray(0, MAGIC.length);
const recognizedMagic = fileMagic.equals(MAGIC) || fileMagic.equals(LEGACY_MAGIC);
if (!recognizedMagic) throw new Error("Formato backup Ordynora non riconosciuto.");

const ivStart = MAGIC.length;
const tagStart = ivStart + 12;
const dataStart = tagStart + 16;
const decipher = crypto.createDecipheriv(
  "aes-256-gcm",
  crypto.createHash("sha256").update(secret).digest(),
  encrypted.subarray(ivStart, tagStart)
);
decipher.setAuthTag(encrypted.subarray(tagStart, dataStart));
const compressed = Buffer.concat([decipher.update(encrypted.subarray(dataStart)), decipher.final()]);
const payload = JSON.parse((await gunzipAsync(compressed)).toString("utf8"));
const counts = Object.fromEntries(
  Object.entries(payload.data || {}).map(([name, rows]) => [name, Array.isArray(rows) ? rows.length : 0])
);
console.log(JSON.stringify({ ok: true, generatedAt: payload.generatedAt, counts }, null, 2));
