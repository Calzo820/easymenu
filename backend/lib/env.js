import { loadEnvironment } from "./loadEnv.js";

const REQUIRED_IN_PRODUCTION = ["JWT_SECRET", "DATABASE_URL", "CLIENT_URL", "CORS_ORIGIN"];
const BILLING_MINIMUM = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_STARTER"];

export function validateEnvironment() {
  loadEnvironment({ silent: false });

  const isProduction = process.env.NODE_ENV === "production";
  const missingRequired = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);
  const missingBilling = BILLING_MINIMUM.filter((key) => !process.env[key]);

  if (isProduction && missingRequired.length > 0) {
    throw new Error(`Variabili ambiente mancanti in produzione: ${missingRequired.join(", ")}`);
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || ["postgres123", "dev-secret-change-me"].includes(process.env.JWT_SECRET)) {
    throw new Error("JWT_SECRET assente o troppo debole: usa una stringa casuale di almeno 32 caratteri.");
  }

  if (missingBilling.length > 0) {
    console.warn(`Avviso EasyMenu billing: mancano ${missingBilling.join(", ")}. Stripe resta in modalità test/trial locale finché non sono configurate.`);
  } else {
    console.log("EasyMenu billing: Stripe Starter configurato correttamente.");
  }

  return {
    nodeEnv: process.env.NODE_ENV || "development",
    paymentsEnabled: Boolean(process.env.STRIPE_SECRET_KEY),
    webhookEnabled: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    subscriptionsEnabled: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_STARTER),
    starterPlanEnabled: Boolean(process.env.STRIPE_PRICE_STARTER),
    growthPlanEnabled: Boolean(process.env.STRIPE_PRICE_GROWTH),
    enterprisePlanEnabled: Boolean(process.env.STRIPE_PRICE_ENTERPRISE),
  };
}
