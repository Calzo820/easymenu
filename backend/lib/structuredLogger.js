export function logInfo(source, message, metadata = {}) {
  console.log(JSON.stringify({ level: "info", source, message, metadata, timestamp: new Date().toISOString() }));
}

export function logWarn(source, message, metadata = {}) {
  console.warn(JSON.stringify({ level: "warn", source, message, metadata, timestamp: new Date().toISOString() }));
}

export function sanitizeRequest(req) {
  return {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.user?.userId || null,
    restaurantId: req.user?.restaurantId || null,
    requestId: req.requestId || null,
  };
}
