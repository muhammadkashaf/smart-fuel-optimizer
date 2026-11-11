// Basic per-IP guard for public OTP endpoints; per-account cooldown is stored in MongoDB.
export function authOtpRateLimit(limit, windowMs = 15 * 60 * 1000) {
  const clients = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, entry] of clients) if (entry.resetAt <= now) clients.delete(key);
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const entry = clients.get(key) ?? { count: 0, resetAt: now + windowMs };
    if (!clients.has(key) && clients.size >= 5000) clients.delete(clients.keys().next().value);
    entry.count += 1;
    clients.set(key, entry);
    if (entry.count > limit) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ message: "Too many requests. Please wait and try again." });
    }
    next();
  };
}
