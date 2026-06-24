import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");
const projectRoot = path.resolve(backendDir, "..");

const ENV_FILES = [
  path.join(backendDir, ".env"),
  path.join(projectRoot, ".env"),
  path.join(projectRoot, ".env.local"),
];

function firstValue(keys = []) {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

function applyEnvAliases() {
  const stripeSecret = firstValue(["STRIPE_SECRET_KEY", "STRIPE_API_KEY", "STRIPE_SECRET"]);
  const webhookSecret = firstValue(["STRIPE_WEBHOOK_SECRET", "STRIPE_ENDPOINT_SECRET"]);
  const starterPrice = firstValue(["STRIPE_PRICE_STARTER", "STRIPE_PRICE_MONTHLY", "STRIPE_STARTER_PRICE_ID", "STRIPE_PRICE_ID", "VITE_STRIPE_PRICE_STARTER"]);
  const growthPrice = firstValue(["STRIPE_PRICE_GROWTH", "STRIPE_PRICE_QUARTERLY", "STRIPE_GROWTH_PRICE_ID", "VITE_STRIPE_PRICE_GROWTH"]);
  const semiannualPrice = firstValue(["STRIPE_PRICE_SEMIANNUAL", "STRIPE_SEMIANNUAL_PRICE_ID", "VITE_STRIPE_PRICE_SEMIANNUAL"]);
  const enterprisePrice = firstValue(["STRIPE_PRICE_ENTERPRISE", "STRIPE_PRICE_YEARLY", "STRIPE_ENTERPRISE_PRICE_ID", "VITE_STRIPE_PRICE_ENTERPRISE"]);

  if (stripeSecret) process.env.STRIPE_SECRET_KEY = stripeSecret;
  if (webhookSecret) process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
  if (starterPrice) process.env.STRIPE_PRICE_STARTER = starterPrice;
  if (growthPrice) process.env.STRIPE_PRICE_GROWTH = growthPrice;
  if (semiannualPrice) process.env.STRIPE_PRICE_SEMIANNUAL = semiannualPrice;
  if (enterprisePrice) process.env.STRIPE_PRICE_ENTERPRISE = enterprisePrice;
}

export function loadEnvironment({ silent = true } = {}) {
  const loadedFiles = [];

  for (const envPath of ENV_FILES) {
    const result = dotenv.config({ path: envPath, override: false, quiet: silent });
    if (!result.error && result.parsed) {
      loadedFiles.push(path.relative(projectRoot, envPath).replaceAll("\\", "/"));
    }
  }

  applyEnvAliases();

  const status = {
    loadedFiles,
    hasStripeSecret: Boolean(process.env.STRIPE_SECRET_KEY),
    hasStripeWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    hasStarterPrice: Boolean(process.env.STRIPE_PRICE_STARTER || process.env.STRIPE_PRICE_MONTHLY),
    hasGrowthPrice: Boolean(process.env.STRIPE_PRICE_GROWTH || process.env.STRIPE_PRICE_QUARTERLY),
    hasSemiannualPrice: Boolean(process.env.STRIPE_PRICE_SEMIANNUAL),
    hasEnterprisePrice: Boolean(process.env.STRIPE_PRICE_ENTERPRISE || process.env.STRIPE_PRICE_YEARLY),
  };

  if (!silent) {
    console.log(`EasyMenu env caricati da: ${loadedFiles.join(", ") || "nessun file .env trovato"}`);
  }

  return status;
}
