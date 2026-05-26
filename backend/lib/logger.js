import prisma from "./prisma.js";

function cleanMetadata(metadata = {}) {
  return JSON.parse(JSON.stringify(metadata, (_key, value) => {
    if (typeof value === "bigint") return value.toString();
    if (value instanceof Error) return { message: value.message, stack: value.stack };
    return value;
  }));
}

export async function logError({ restaurantId = null, source = "backend", message, error = null, metadata = {}, level = "error" }) {
  const safeMessage = String(message || error?.message || "Errore non specificato").slice(0, 1000);
  try {
    return await prisma.errorLog.create({
      data: {
        restaurantId: restaurantId || null,
        level,
        source: String(source || "backend").slice(0, 120),
        message: safeMessage,
        stack: error?.stack ? String(error.stack).slice(0, 5000) : null,
        metadata: cleanMetadata(metadata),
      },
    });
  } catch (logFailure) {
    console.error("Errore durante salvataggio ErrorLog:", logFailure);
    return null;
  }
}

export async function logPaymentProblem({ restaurantId = null, source = "stripe", message, error = null, metadata = {} }) {
  return logError({ restaurantId, source, message, error, metadata, level: "payment" });
}
