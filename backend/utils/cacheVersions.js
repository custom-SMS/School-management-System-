const { getRedis } = require('./upstashRedis');

// Versioned namespaces to enable deterministic invalidation without wildcard/pattern deletion.
//
// We store a monotonically increasing integer version per resource.
// Cache keys include: resourceVersion.
//
// Mutations bump a resource version so subsequent GETs automatically write new cache entries.

const RESOURCE_VERSIONS_KEY = 'cache:resourceVersions';

async function getResourceVersion(resource) {
  const redis = getRedis();
  // We store versions in a Redis hash if supported; otherwise use get on a composed key.
  // Upstash Redis supports hashes via `hget/hset`.
  try {
    const val = await redis.hget(RESOURCE_VERSIONS_KEY, resource);
    const num = Number(val);
    return Number.isFinite(num) ? num : 0;
  } catch {
    // Fallback: composed key (if hash ops are unavailable)
    const composed = `cache:resourceVersion:${resource}`;
    const val = await redis.get(composed);
    const num = Number(val);
    return Number.isFinite(num) ? num : 0;
  }
}

async function bumpResourceVersion(resource) {
  const redis = getRedis();
  // Use atomic INCR when possible.
  try {
    const val = await redis.hincrby(RESOURCE_VERSIONS_KEY, resource, 1);
    return Number(val);
  } catch {
    // Fallback: increment composed key
    const composed = `cache:resourceVersion:${resource}`;
    try {
      const val = await redis.incr(composed);
      return Number(val);
    } catch {
      // Last fallback: set with get+1
      const current = await getResourceVersion(resource);
      await redis.set(composed, String(current + 1), { ex: 60 * 60 * 24 });
      return current + 1;
    }
  }
}

module.exports = {
  getResourceVersion,
  bumpResourceVersion,
};

