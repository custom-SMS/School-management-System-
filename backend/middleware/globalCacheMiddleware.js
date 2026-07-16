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

  return `globalcache:${req.method}:${req.originalUrl}:role:${role}:user:${userId}:branch:${safeKeyPart(branchFilter)}`;
}

function isBypassed(req) {
  return Boolean(req.query?.noCache) || Boolean(req.headers?.['x-no-cache']);
}

function shouldCache(req, res) {
  // Only cache GET by default.
  if (req.method !== 'GET') {
    console.log(`[Redis Cache] shouldCache: Not GET method for ${req.originalUrl}`);
    return false;
  }
  if (isBypassed(req)) {
    console.log(`[Redis Cache] shouldCache: Bypassed for ${req.originalUrl}`);
    return false;
  }

  // Avoid caching auth, docs, uploads, etc.
  const path = req.path || '';
  if (path.startsWith('/api/auth')) {
    console.log(`[Redis Cache] shouldCache: Auth path excluded for ${req.originalUrl}`);
    return false;
  }
  if (path.startsWith('/api/uploads')) {
    console.log(`[Redis Cache] shouldCache: Uploads path excluded for ${req.originalUrl}`);
    return false;
  }
  if (path.startsWith('/api-docs')) {
    console.log(`[Redis Cache] shouldCache: Docs path excluded for ${req.originalUrl}`);
    return false;
  }

  // IMPORTANT:
  // This middleware runs before route middlewares like verifyToken/injectBranchFilter.
  // If we cache before req.user/branchFilter exists, keys degrade to __guest__/__none__
  // and can cause wrong payloads to be served, breaking the UI.
  if (!req.user) {
    console.log(`[Redis Cache] shouldCache: No req.user for ${req.originalUrl}`);
    return false;
  }
  if (!req.branchFilter) {
    console.log(`[Redis Cache] shouldCache: No req.branchFilter for ${req.originalUrl}`);
    return false;
  }

  return true;
}


function isProbablyJsonResponse(obj) {
  // We only cache JSON objects/arrays/strings.
  return obj !== undefined;
}

const globalCacheMiddleware = async (req, res, next) => {
  try {
    if (!shouldCache(req, res)) {
      // console.log(`[Redis Cache] Not caching: ${req.method} ${req.originalUrl}`);
      return next();
    }

    const key = buildGlobalCacheKey(req);
    console.log(`[Redis Cache] Checking key: ${key}`);
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
};

module.exports = { globalCacheMiddleware };

