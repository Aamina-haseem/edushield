import type { NextFunction, Request, Response } from 'express';

/**
 * Small in-memory limiter for failed sign-ins: after `maxFailures` failures for the same
 * IP + email within `windowMs`, further attempts get 429 until the window passes. In-memory is
 * enough for a single backend process; several processes would need a shared store (e.g. Redis).
 */
export function createLoginLimiter({ maxFailures = 5, windowMs = 15 * 60_000 } = {}) {
  const failures = new Map<string, { count: number; firstAt: number }>();

  const keyFor = (req: Request) => `${req.ip}|${String((req.body as { email?: unknown })?.email ?? '').toLowerCase()}`;
  const current = (key: string) => {
    const entry = failures.get(key);
    if (entry && Date.now() - entry.firstAt > windowMs) {
      failures.delete(key);
      return undefined;
    }
    return entry;
  };

  return {
    guard(req: Request, res: Response, next: NextFunction) {
      const entry = current(keyFor(req));
      if (entry && entry.count >= maxFailures) {
        const retryAfter = Math.ceil((entry.firstAt + windowMs - Date.now()) / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({ message: 'Too many failed sign-in attempts. Try again later.' });
      }
      next();
    },
    recordFailure(req: Request) {
      const key = keyFor(req);
      const entry = current(key);
      if (entry) entry.count++;
      else failures.set(key, { count: 1, firstAt: Date.now() });
    },
    recordSuccess(req: Request) {
      failures.delete(keyFor(req));
    },
  };
}
