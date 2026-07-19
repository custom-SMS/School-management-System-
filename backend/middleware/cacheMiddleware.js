const { bumpResourceVersion } = require('../utils/cacheVersions');

/**
 * Middleware to set the cache resource name on the request object.
 * This is picked up by globalCacheMiddleware.js.
 */
function setCacheResource(resourceName) {
  return (req, res, next) => {
    req.cacheResource = resourceName;
    next();
  };
}

/**
 * Middleware to automatically invalidate a resource version in Redis
 * upon successful (2xx) Create/Update/Delete operations.
 */
function invalidateResource(resourceName) {
  return (req, res, next) => {
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          console.log(`[Redis Cache] Invalidating cache for resource: "${resourceName}" (Status: ${res.statusCode})`);
          await bumpResourceVersion(resourceName);
        } catch (err) {
          console.error(`[Redis Cache Error] Failed to bump version for resource: ${resourceName}`, err);
        }
      }
    });
    next();
  };
}

module.exports = {
  setCacheResource,
  invalidateResource,
};
