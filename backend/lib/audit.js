export function auditData(req, {
  restaurantId = req.user?.restaurantId,
  action,
  entityType,
  entityId = null,
  reason = null,
  metadata = null,
}) {
  return {
    restaurantId,
    userId: req.user?.userId || null,
    action,
    entityType,
    entityId,
    reason: reason ? String(reason).trim().slice(0, 500) : null,
    metadata,
    ipAddress: String(req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim().slice(0, 80) || null,
  };
}

export async function writeAudit(tx, req, details) {
  return tx.auditLog.create({ data: auditData(req, details) });
}
