/**
 * API Service with Caching & Circuit Breaker
 * Enhanced version of api.js with performance optimizations
 */

import { getCircuitBreaker } from "../utils/circuitBreaker";
import { cachedFetch, invalidateCache } from "../utils/requestCache";
import { csrfMiddleware } from "../utils/csrf";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const DEBUG = import.meta.env.VITE_DEBUG === "true" || import.meta.env.DEV;

// Cache TTL configurations (in milliseconds)
const CACHE_TTL = {
  SHORT: 30000, // 30s - Frequently changing data
  MEDIUM: 300000, // 5min - Moderate changes
  LONG: 3600000, // 1h - Rarely changing data
};

// Circuit breakers for different services
const breakers = {
  tasks: getCircuitBreaker("tasks-api", { failureThreshold: 5, timeout: 60000 }),
  users: getCircuitBreaker("users-api", { failureThreshold: 3, timeout: 30000 }),
  files: getCircuitBreaker("files-api", { failureThreshold: 5, timeout: 90000 }),
  groups: getCircuitBreaker("groups-api", { failureThreshold: 3, timeout: 30000 }),
};

const debugLog = (...args) => {
  if (DEBUG) {
    console.log("[API Cache]", ...args);
  }
};

// Build URL helper
const buildUrl = (endpoint, params = {}) => {
  const baseUrl = API_BASE_URL.startsWith("http")
    ? API_BASE_URL
    : window.location.origin + API_BASE_URL;
  const url = new URL(`${baseUrl}${endpoint}`);
  Object.keys(params).forEach((key) => {
    if (params[key] !== null && params[key] !== undefined) {
      url.searchParams.append(key, params[key]);
    }
  });
  return url.toString();
};

// Enhanced API call with caching and circuit breaker
const apiCallWithCache = async (endpoint, options = {}, cacheOptions = {}) => {
  const {
    cache = true,
    ttl = CACHE_TTL.MEDIUM,
    breaker = breakers.tasks,
    invalidate = [],
  } = cacheOptions;

  const method = options.method || "GET";
  const url = buildUrl(endpoint, options.params);

  // Add CSRF token for unsafe methods
  const enhancedOptions = csrfMiddleware({
    ...options,
    method,
  });

  // DELETE cleanup old params
  delete enhancedOptions.params;

  // Use circuit breaker
  return breaker.execute(async () => {
    // For mutation operations (POST, PUT, DELETE), invalidate cache
    if (method !== "GET" && invalidate.length > 0) {
      invalidate.forEach((pattern) => {
        invalidateCache(pattern);
        debugLog(`Invalidated cache: ${pattern}`);
      });
    }

    // Use cached fetch for GET requests
    if (method === "GET" && cache) {
      return cachedFetch(url, enhancedOptions, {
        ttl,
        skipCache: !cache,
      });
    }

    // Direct fetch for mutations
    const response = await fetch(url, enhancedOptions);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || "Request failed" };
      }

      const error = new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    return response.json();
  });
};

// ============================================
// TASKS API
// ============================================

export const fetchTasks = (groupId, options = {}) => {
  return apiCallWithCache(
    `/groups/${groupId}/tasks`,
    {
      params: { period: options.period },
    },
    {
      cache: true,
      ttl: CACHE_TTL.SHORT, // Tasks change frequently
      breaker: breakers.tasks,
    }
  );
};

export const getTask = (groupId, taskId) => {
  return apiCallWithCache(
    `/groups/${groupId}/tasks/${taskId}`,
    {},
    {
      cache: true,
      ttl: CACHE_TTL.SHORT,
      breaker: breakers.tasks,
    }
  );
};

export const createTask = (groupId, taskData) => {
  return apiCallWithCache(
    `/groups/${groupId}/tasks`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData),
    },
    {
      cache: false,
      breaker: breakers.tasks,
      invalidate: [`/groups/${groupId}/tasks`],
    }
  );
};

export const updateTask = (groupId, taskId, updates) => {
  return apiCallWithCache(
    `/groups/${groupId}/tasks/${taskId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    },
    {
      cache: false,
      breaker: breakers.tasks,
      invalidate: [`/groups/${groupId}/tasks`, `/tasks/${taskId}`],
    }
  );
};

export const deleteTask = (groupId, taskId) => {
  return apiCallWithCache(
    `/groups/${groupId}/tasks/${taskId}`,
    {
      method: "DELETE",
    },
    {
      cache: false,
      breaker: breakers.tasks,
      invalidate: [`/groups/${groupId}/tasks`, `/tasks/${taskId}`],
    }
  );
};

// ============================================
// GROUPS API
// ============================================

export const getGroup = (groupId) => {
  return apiCallWithCache(
    `/groups/${groupId}`,
    {},
    {
      cache: true,
      ttl: CACHE_TTL.LONG, // Group info rarely changes
      breaker: breakers.groups,
    }
  );
};

export const getGroupStats = (groupId, options = {}) => {
  return apiCallWithCache(
    `/groups/${groupId}/stats`,
    {
      params: { period: options.period },
    },
    {
      cache: true,
      ttl: CACHE_TTL.MEDIUM,
      breaker: breakers.groups,
    }
  );
};

export const getGroupMembers = (groupId) => {
  return apiCallWithCache(
    `/groups/${groupId}/members`,
    {},
    {
      cache: true,
      ttl: CACHE_TTL.MEDIUM,
      breaker: breakers.users,
    }
  );
};

// ============================================
// LEADERBOARD API
// ============================================

export const getLeaderboard = (groupId, options = {}) => {
  return apiCallWithCache(
    `/groups/${groupId}/leaderboard`,
    {
      params: {
        period: options.period,
        limit: options.limit,
      },
    },
    {
      cache: true,
      ttl: CACHE_TTL.MEDIUM,
      breaker: breakers.groups,
    }
  );
};

export const syncLeaderboard = (groupId) => {
  return apiCallWithCache(
    `/groups/${groupId}/leaderboard/sync`,
    {
      method: "POST",
    },
    {
      cache: false,
      breaker: breakers.groups,
      invalidate: [`/groups/${groupId}/leaderboard`],
    }
  );
};

// ============================================
// FILES API
// ============================================

export const uploadFile = (groupId, formData, onProgress) => {
  // File uploads don't use cache
  const url = buildUrl(`/groups/${groupId}/files/upload`);

  return breakers.files.execute(async () => {
    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            lengthComputable: true,
          });
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            invalidateCache(`/groups/${groupId}/files`);
            resolve(data);
          } catch {
            reject(new Error("Invalid JSON response"));
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload aborted"));
      });

      xhr.open("POST", url);
      xhr.send(formData);
    });
  });
};

// ============================================
// RECURRING TASKS API
// ============================================

export const listRecurringTasks = (groupId) => {
  return apiCallWithCache(
    `/groups/${groupId}/recurring-tasks`,
    {},
    {
      cache: true,
      ttl: CACHE_TTL.MEDIUM,
      breaker: breakers.tasks,
    }
  );
};

export const createRecurringTask = (groupId, taskData) => {
  return apiCallWithCache(
    `/groups/${groupId}/recurring-tasks`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData),
    },
    {
      cache: false,
      breaker: breakers.tasks,
      invalidate: [`/groups/${groupId}/recurring-tasks`],
    }
  );
};

export const updateRecurringTask = (groupId, taskId, updates) => {
  return apiCallWithCache(
    `/groups/${groupId}/recurring-tasks/${taskId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    },
    {
      cache: false,
      breaker: breakers.tasks,
      invalidate: [`/groups/${groupId}/recurring-tasks`, `/recurring-tasks/${taskId}`],
    }
  );
};

export const deleteRecurringTask = (groupId, taskId) => {
  return apiCallWithCache(
    `/groups/${groupId}/recurring-tasks/${taskId}`,
    {
      method: "DELETE",
    },
    {
      cache: false,
      breaker: breakers.tasks,
      invalidate: [`/groups/${groupId}/recurring-tasks`],
    }
  );
};

// ============================================
// CACHE MANAGEMENT
// ============================================

export { invalidateCache, clearCache, getCacheStats } from "../utils/requestCache";
export { getCircuitBreakerStates, resetCircuitBreaker } from "../utils/circuitBreaker";

export default {
  fetchTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getGroup,
  getGroupStats,
  getGroupMembers,
  getLeaderboard,
  syncLeaderboard,
  uploadFile,
  listRecurringTasks,
  createRecurringTask,
  updateRecurringTask,
  deleteRecurringTask,
};
