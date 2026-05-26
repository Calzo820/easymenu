const stores = new Map();

function cleanup(store, now) {
  if (store.size < 5000) return;
  for (const [key, value] of store.entries()) {
    if (value.resetAt < now) store.delete(key);
  }
}

export function createRateLimiter({ windowMs = 60000, maxRequests = 60, keyPrefix = "global", keyBuilder } = {}) {
  const store = stores.get(keyPrefix) || new Map();
  stores.set(keyPrefix, store);
  return (req, res, next) => {
    const now = Date.now();
    cleanup(store, now);
    const key = keyBuilder?.(req) || `${req.ip}:${req.path}`;
    const entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader("X-RateLimit-Limit", String(maxRequests));
      res.setHeader("X-RateLimit-Remaining", String(maxRequests - 1));
      return next();
    }
    if (entry.count >= maxRequests) {
      res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ message: "Troppe richieste, riprova tra poco" });
    }
    entry.count += 1;
    res.setHeader("X-RateLimit-Limit", String(maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, maxRequests - entry.count)));
    return next();
  };
}
