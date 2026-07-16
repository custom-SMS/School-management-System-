const crypto = require('crypto');
const { getRedis } = require('./upstashRedis');

const TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || 60);

function stableStringify(value) {
  // Deterministic serialization for cache keys.
  // Handles primitives, arrays, objects.
  if (value === null || value === undefined) return String(value);
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${k}:${stableStringify(value[k])}`).join(',')}}`;
}

function cacheKey(prefix, reqLike) {
  const raw = typeof reqLike === 'string'
    ? reqLike
    : stableStringify(reqLike);

  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return `${prefix}:${hash}`;
}

async function getCachedJson(key) {
  const redis = getRedis();
  const val = await redis.get(key);
  if (!val) return null;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

async function setCachedJson(key, data, ttlSeconds = TTL_SECONDS) {
  const redis = getRedis();
  // Upstash Redis set supports { ex: seconds }
  await redis.set(key, JSON.stringify(data), { ex: ttlSeconds });
}

async function delKey(key) {
  const redis = getRedis();
  await redis.del(key);
}

function shouldBypassCache(req) {
  // Useful for debugging.
  return Boolean(req.query?.noCache) || Boolean(req.headers?.['x-no-cache']);
}

module.exports = {
  cacheKey,
  getCachedJson,
  setCachedJson,
  delKey,
  shouldBypassCache,
  TTL_SECONDS,
};

