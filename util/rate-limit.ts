type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetMs: number;
};

export function createRateLimiter(opts: RateLimitOptions) {
  const hits = new Map<string, number[]>();
  return function check(key: string): RateLimitResult {
    const now = Date.now();
    const timestamps = (hits.get(key) || []).filter((t) => now - t < opts.windowMs);
    if (timestamps.length >= opts.limit) {
      const resetMs = opts.windowMs - (now - timestamps[0]);
      return { ok: false, remaining: 0, resetMs };
    }
    timestamps.push(now);
    hits.set(key, timestamps);
    // cleanup ocasional
    if (hits.size > 1000) {
      for (const [k, ts] of hits) {
        if (ts.every((t) => now - t >= opts.windowMs)) hits.delete(k);
      }
    }
    return { ok: true, remaining: opts.limit - timestamps.length, resetMs: opts.windowMs };
  };
}

export function getClientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get('x-forwarded-for')?.split(',')[0].trim() ||
    h.get('x-real-ip') ||
    'unknown'
  );
}
