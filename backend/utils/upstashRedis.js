const { Redis } = require('@upstash/redis');

// Lazy init to avoid crashes if env vars are missing in some environments.
let redisInstance = null;
let hasLoggedConfig = false;

function getRedis() {
  if (redisInstance) return redisInstance;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // One-time startup log to confirm whether Redis is configured.
  if (!hasLoggedConfig) {
    hasLoggedConfig = true;
    // Avoid printing sensitive token.
    console.log('[Redis Cache] Upstash configured:', Boolean(url && token));
  }

  if (!url || !token) {
    // If redis is not configured, return a tiny no-op implementation.
    redisInstance = {
      get: async () => null,
      set: async () => null,
      del: async () => null,
      mget: async () => [],
      mset: async () => null,
      hget: async () => null,
      hset: async () => null,
      hincrby: async () => null,
      incr: async () => null,
      // keep the same interface surface for caching helpers
      z: null,
    };
    return redisInstance;
  }

  redisInstance = new Redis({ url, token });
  return redisInstance;
}

module.exports = { getRedis };


