const { getRedis } = require('../utils/upstashRedis');

const TTL_SECONDS = Number(process.env.GLOBAL_CACHE_TTL_SECONDS || 60);
console.log(`[Redis Cache] Global Cache TTL: ${TTL_SECONDS} seconds`);

function stableStringify(value) {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${k}:${stableStringify(value[k])}`).join(',')}}`;
}

function safeKeyPart(value) {
  if (value === undefined || value === null) return '__null__';
  if (typeof value === 'string') return value;
  return stableStringify(value);
}

function buildGlobalCacheKey(req) {
  const role = req.user?.role || '__guest__';
  const userId = req.user?._id || '__none__';
  const branchFilter = req.branchFilter || {};

  // Namespace versioning is controlled by cache version keys so we can invalidate deterministically
  // without wildcard/pattern deletion.
  //
  // resourceVersion is expected to be set by our route handlers (or default to 0).
  const resourceVersion = Number(req.cacheResourceVersion ?? 0);

  // Key is resource-based, not URL-based, to enable invalidation by resource.
  // Keep the current cache-key format parts (role/user/branch) and add version.
  return `globalcache:${resourceVersion}:${req.method}:${req.path}:role:${role}:user:${userId}:branch:${safeKeyPart(branchFilter)}`;
}


function isBypassed(req) {
  return Boolean(req.query?.noCache) || Boolean(req.headers?.['x-no-cache']);
}

function shouldCache(req, res) {
  console.log(`[Redis Cache] Entering shouldCache for ${req.method} ${req.originalUrl}`);
  // Only cache GET by default.
  if (req.method !== 'GET') return false;
  if (isBypassed(req)) return false;

  // Avoid caching auth, docs, uploads, etc.
  const path = req.path || '';
  if (path.startsWith('/api/auth')) return false;
  if (path.startsWith('/api/uploads')) return false;
  if (path.startsWith('/api-docs')) return false;

  // Now that middleware is placed after auth/branch middleware, we can rely on the presence
  // of req.user/req.branchFilter for protected GET requests.
  // For routes that don't set them, don't cache.
  if (!req.user) {
    console.log("[Redis Cache] Skipping: req.user is missing");
    return false;
  }

  return true;
}



function isProbablyJsonResponse(obj) {
  // We only cache JSON objects/arrays/strings.
  return obj !== undefined;
}

const { getResourceVersion } = require('../utils/cacheVersions');

const globalCacheMiddleware = async (req, res, next) => {
    console.log("🔥 CACHE MIDDLEWARE EXECUTED");
  console.log(`[Redis Cache] Entering globalCacheMiddleware for ${req.method} ${req.originalUrl}`);
  try {
    if (!shouldCache(req, res)) {
      return next();
    }

    // Attach resource version dynamically based on endpoint.
    // Route handlers can override by setting req.cacheResourceVersion.
    if (req.cacheResourceVersion === undefined) {
      const resource = req.cacheResource || 'default';
      req.cacheResourceVersion = await getResourceVersion(resource);
    }

    const key = buildGlobalCacheKey(req);
    const redis = getRedis();


    const cached = await redis.get(key);
    if (cached) {
      console.log(`[Redis Cache] HIT for key: ${key}`);
      try {
        return res.status(200).json(JSON.parse(cached));
      } catch {
        // If it was stored as raw, just return.
        return res.status(200).json(cached);
      }
    }

    // Capture JSON response.
    const originalJson = res.json.bind(res);
    res.json = async (payload) => {
      console.log(`[Redis Cache] MISS for key: ${key}, caching response.`);
      if (res.headersSent) return originalJson(payload);

      if (isProbablyJsonResponse(payload)) {
        try {
          await redis.set(key, JSON.stringify(payload), { ex: TTL_SECONDS });
        } catch {
          // ignore cache set failures
        }
      }

      return originalJson(payload);
    };

    return next();
  } catch {
    // On any cache failure, never break the request.
    return next();
  }

  console.log("🔥 CACHE MIDDLEWARE EXECUTED");
};

module.exports = { globalCacheMiddleware };

