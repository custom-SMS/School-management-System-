const { Ratelimit } = require('@upstash/ratelimit');
const { Redis } = require('@upstash/redis');

// ─── Redis client (reuses existing Upstash credentials) ───────────────────────
let redis;
try {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
} catch (err) {
  console.warn('[rateLimiter] Failed to initialise Redis client — rate limiting will be disabled.', err?.message);
}

// ─── Helper: build an Express middleware from an @upstash/ratelimit instance ──
// identifier: function that receives (req) and returns a string key to rate-limit on.
const buildLimiter = (ratelimit, identifier) => async (req, res, next) => {
  // Graceful fallback: if Redis is not available, skip rate limiting
  if (!redis || !ratelimit) {
    console.warn('[rateLimiter] Redis unavailable — skipping rate limit check.');
    return next();
  }

  try {
    const key = identifier(req);
    const { success, limit, remaining, reset } = await ratelimit.limit(key);

    // Set standard rate-limit headers
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', new Date(reset).toISOString());

    if (!success) {
      return res.status(429).json({
        message: 'Too many requests. Please slow down and try again later.',
        retryAfter: new Date(reset).toISOString(),
      });
    }

    next();
  } catch (err) {
    // If Upstash is unreachable, log and let the request through (fail open)
    console.warn('[rateLimiter] Rate limit check failed — allowing request.', err?.message);
    next();
  }
};

// ─── Tier 1: Auth Limiter ─────────────────────────────────────────────────────
// Strict: 10 requests per 15 minutes, keyed by IP.
// Applied to: POST /api/auth/login  and  POST /api/auth/register-admin
const authRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '0 m'),
      analytics: true,
      prefix: 'sms:rl:auth',
    })
  : null;

const authLimiter = buildLimiter(
  authRatelimit,
  (req) => `ip:${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`
);

// ─── Tier 2: Global API Limiter ───────────────────────────────────────────────
// Moderate: 100 requests per minute.
// Keyed by userId (from JWT) when authenticated, otherwise by IP.
// Applied globally to all /api/* routes in server.js
const apiRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'sms:rl:api',
    })
  : null;

const apiLimiter = buildLimiter(apiRatelimit, (req) => {
  // Prefer userId from JWT payload (populated by verifyToken), fall back to IP
  const userId = req.user?._id || req.user?.id;
  if (userId) return `user:${userId}`;
  return `ip:${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`;
});

// ─── Tier 3: Sensitive Operations Limiter ────────────────────────────────────
// Strict: 30 requests per minute, keyed by userId or IP.
// Applied per-route to high-impact mutations (POST/PUT/DELETE/PATCH on key resources).
const sensitiveRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      analytics: true,
      prefix: 'sms:rl:sensitive',
    })
  : null;

const sensitiveLimiter = buildLimiter(sensitiveRatelimit, (req) => {
  const userId = req.user?._id || req.user?.id;
  if (userId) return `user:${userId}`;
  return `ip:${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`;
});

module.exports = { authLimiter, apiLimiter, sensitiveLimiter };
