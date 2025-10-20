// Prefetch utility for lazy-loaded components
// Preloads components on hover/focus for instant modal opening

const prefetchCache = new Set();

/**
 * Prefetch a lazy-loaded component
 * @param {Function} importFn - The import function (e.g., () => import('./Component'))
 * @returns {Promise} - The import promise
 */
export const prefetch = (importFn) => {
  // Check if already prefetched
  const key = importFn.toString();
  if (prefetchCache.has(key)) {
    return Promise.resolve();
  }

  prefetchCache.add(key);
  return importFn().catch((error) => {
    console.warn('[Prefetch] Failed to prefetch:', error);
    prefetchCache.delete(key);
  });
};

/**
 * Create a prefetch handler for buttons/links
 * @param {Function} importFn - The import function
 * @returns {Object} - Event handlers for onMouseEnter and onFocus
 */
export const createPrefetchHandlers = (importFn) => ({
  onMouseEnter: () => prefetch(importFn),
  onFocus: () => prefetch(importFn),
});

/**
 * Prefetch multiple components
 * @param {Array<Function>} importFns - Array of import functions
 */
export const prefetchMultiple = (importFns) => {
  importFns.forEach((importFn) => prefetch(importFn));
};

/**
 * Prefetch on idle (when browser is idle)
 * @param {Function} importFn - The import function
 */
export const prefetchOnIdle = (importFn) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => prefetch(importFn), { timeout: 2000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => prefetch(importFn), 1000);
  }
};

/**
 * Prefetch critical lazy components after initial load
 * Should be called after the app has finished initial render
 */
export const prefetchCriticalComponents = () => {
  prefetchOnIdle(() => import("../components/modals/SubmitTaskModal"));
  prefetchOnIdle(() => import("../components/modals/FilePreviewModal"));
  prefetchOnIdle(() => import("../components/recurring/RecurringTaskModal"));
  prefetchOnIdle(() => import("../components/members/InviteMemberModal"));
};

export default {
  prefetch,
  createPrefetchHandlers,
  prefetchMultiple,
  prefetchOnIdle,
  prefetchCriticalComponents,
};
