/**
 * Request Cache & Deduplication
 * Prevents duplicate requests and caches responses
 */

// In-flight requests map (for deduplication)
const inFlightRequests = new Map();

// Response cache with TTL
const cache = new Map();

/**
 * Generate cache key from request
 */
const getCacheKey = (url, options = {}) => {
  const method = options.method || "GET";
  const body = options.body ? JSON.stringify(options.body) : "";
  return `${method}:${url}:${body}`;
};

/**
 * Deduplicate requests
 * If same request is in-flight, return the existing promise
 */
export const deduplicateRequest = async (key, requestFn) => {
  // Check if request is already in-flight
  if (inFlightRequests.has(key)) {
    console.log(`🔄 Deduplicating request: ${key}`);
    return inFlightRequests.get(key);
  }

  // Create new request
  const requestPromise = requestFn()
    .then((result) => {
      inFlightRequests.delete(key);
      return result;
    })
    .catch((error) => {
      inFlightRequests.delete(key);
      throw error;
    });

  inFlightRequests.set(key, requestPromise);
  return requestPromise;
};

/**
 * Cache response with TTL
 */
export const cacheResponse = (key, data, ttl = 60000) => {
  const expiresAt = Date.now() + ttl;
  cache.set(key, { data, expiresAt });
  console.log(`💾 Cached response: ${key} (TTL: ${ttl / 1000}s)`);
};

/**
 * Get cached response if valid
 */
export const getCachedResponse = (key) => {
  const cached = cache.get(key);

  if (!cached) {
    return null;
  }

  // Check if expired
  if (Date.now() > cached.expiresAt) {
    cache.delete(key);
    console.log(`🗑️ Cache expired: ${key}`);
    return null;
  }

  console.log(`✅ Cache hit: ${key}`);
  return cached.data;
};

/**
 * Invalidate cache by pattern
 */
export const invalidateCache = (pattern) => {
  let count = 0;
  cache.forEach((_, key) => {
    if (key.includes(pattern)) {
      cache.delete(key);
      count++;
    }
  });
  console.log(`🗑️ Invalidated ${count} cache entries matching: ${pattern}`);
};

/**
 * Clear all cache
 */
export const clearCache = () => {
  const count = cache.size;
  cache.clear();
  console.log(`🗑️ Cleared ${count} cache entries`);
};

/**
 * Get cache stats
 */
export const getCacheStats = () => {
  const now = Date.now();
  const entries = Array.from(cache.entries());

  return {
    total: cache.size,
    expired: entries.filter(([, { expiresAt }]) => now > expiresAt).length,
    valid: entries.filter(([, { expiresAt }]) => now <= expiresAt).length,
    keys: entries.map(([key]) => key),
  };
};

/**
 * Cached fetch with deduplication
 */
export const cachedFetch = async (url, options = {}, cacheOptions = {}) => {
  const {
    ttl = 60000, // Default 60s
    skipCache = false,
    skipDedup = false,
  } = cacheOptions;

  const cacheKey = getCacheKey(url, options);

  // Check cache first (only for GET requests)
  if (!skipCache && (!options.method || options.method === "GET")) {
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Deduplicate request
  const requestFn = async () => {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Cache successful GET requests
    if (!skipCache && (!options.method || options.method === "GET")) {
      cacheResponse(cacheKey, data, ttl);
    }

    return data;
  };

  if (skipDedup) {
    return requestFn();
  }

  return deduplicateRequest(cacheKey, requestFn);
};

export default {
  deduplicateRequest,
  cacheResponse,
  getCachedResponse,
  invalidateCache,
  clearCache,
  getCacheStats,
  cachedFetch,
};
