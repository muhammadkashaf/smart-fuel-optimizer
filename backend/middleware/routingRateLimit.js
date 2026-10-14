// Small per-user limits protect the shared provider quota. No credentials are stored.
export function routingRateLimit(limit) {
  const users = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [id, entry] of users) if (entry.resetAt <= now) users.delete(id);
    const id = String(req.user._id);
    const entry = users.get(id) ?? { count: 0, resetAt: now + 60_000 };
    if (!users.has(id) && users.size >= 5000) users.delete(users.keys().next().value);
    entry.count += 1;
    users.set(id, entry);
    if (entry.count > limit) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ code: "ROUTING_RATE_LIMIT", message: "Too many route requests. Please wait a minute and try again." });
    }
    next();
  };
}
