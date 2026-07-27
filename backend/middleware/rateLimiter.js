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

// ─── Helper: Safely extract real client IP ────────────────────────────────────
const getClientIp = (req) => {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = String(xForwardedFor).split(',').map((ip) => ip.trim());
    if (ips[0]) return ips[0];
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
};

const isLoopbackIp = (ip) => {
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost';
};

// ─── Helper: build an Express middleware from an @upstash/ratelimit instance ──
const buildLimiter = (ratelimit, identifier) => async (req, res, next) => {
  // Graceful fallback: if Redis is not available, skip rate limiting
  if (!redis || !ratelimit) {
    return next();
  }

  // Bypass rate limiting on local loopback IP during development
  const clientIp = getClientIp(req);
  if (process.env.NODE_ENV !== 'production' && isLoopbackIp(clientIp)) {
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
        message: 'Too many login or request attempts. Please slow down and try again in a few minutes.',
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
// 20 requests per 15 minutes, keyed by IP + identifier when present
const authRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '15 m'),
      analytics: true,
      prefix: 'sms:v2:auth',
    })
  : null;

const authLimiter = buildLimiter(authRatelimit, (req) => {
  const ip = getClientIp(req);
  const loginTarget = req.body?.identifier || req.body?.email || req.body?.studentId || '';
  return loginTarget ? `auth:${ip}:${loginTarget.toLowerCase().trim()}` : `auth:${ip}`;
});

// ─── Tier 2: Global API Limiter ───────────────────────────────────────────────
// Moderate: 100 requests per minute, keyed by userId or IP.
const apiRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'sms:v2:api',
    })
  : null;

const apiLimiter = buildLimiter(apiRatelimit, (req) => {
  const userId = req.user?._id || req.user?.id;
  if (userId) return `user:${userId}`;
  return `ip:${getClientIp(req)}`;
});

// ─── Tier 3: Sensitive Operations Limiter ────────────────────────────────────
// 30 requests per minute, keyed by userId or IP.
const sensitiveRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      analytics: true,
      prefix: 'sms:v2:sensitive',
    })
  : null;

const sensitiveLimiter = buildLimiter(sensitiveRatelimit, (req) => {
  const userId = req.user?._id || req.user?.id;
  if (userId) return `user:${userId}`;
  return `ip:${getClientIp(req)}`;
});

module.exports = { authLimiter, apiLimiter, sensitiveLimiter };
