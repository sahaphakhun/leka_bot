// Leka Bot API Service
// Handles all API calls to the backend

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const DEBUG = import.meta.env.VITE_DEBUG === "true" || import.meta.env.DEV;

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Debug logger
const debugLog = (...args) => {
  if (DEBUG) {
    console.log("[API Debug]", ...args);
  }
};

// Sleep utility for retry delays
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Calculate exponential backoff delay
const getRetryDelay = (attemptNumber) => {
  return INITIAL_RETRY_DELAY * Math.pow(2, attemptNumber - 1);
};

// Check if error is retryable
const isRetryableError = (error) => {
  // Network errors
  if (error.message?.includes("Failed to fetch")) return true;
  if (error.message?.includes("NetworkError")) return true;
  if (error.message?.includes("timeout")) return true;

  // HTTP status codes that should be retried
  if (error.status === 408) return true; // Request Timeout
  if (error.status === 429) return true; // Too Many Requests
  if (error.status >= 500) return true; // Server errors

  return false;
};

// Fetch with timeout
const fetchWithTimeout = (url, options = {}, timeout = REQUEST_TIMEOUT) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), timeout),
    ),
  ]);
};

// Handle authentication errors
const handleAuthError = (status) => {
  if (status === 401 || status === 403) {
    debugLog("Auth error detected, redirecting to login...");
    // Clear any stored auth data
    if (typeof window !== "undefined") {
      localStorage.removeItem("leka_userId");
      localStorage.removeItem("leka_groupId");
      // Redirect to login or show auth modal
      if (window.location.pathname !== "/") {
        window.location.href = "/?auth_required=true";
      }
    }
  }
};

// Helper function to build URL with query parameters
const buildUrl = (endpoint, params = {}) => {
  // Handle relative paths correctly
  const baseUrl = API_BASE_URL.startsWith("http")
    ? API_BASE_URL
    : window.location.origin + API_BASE_URL;
  const url = new URL(`${baseUrl}${endpoint}`);
  Object.keys(params).forEach((key) => {
    if (params[key] !== null && params[key] !== undefined) {
      url.searchParams.append(key, params[key]);
    }
  });
  debugLog("Built URL:", url.toString());
  return url.toString();
};

// Helper function for API calls with retry logic
const apiCall = async (endpoint, options = {}, retryCount = 0) => {
  const startTime = Date.now();
  const attempt = retryCount + 1;

  debugLog(`API Call (attempt ${attempt}/${MAX_RETRIES}):`, {
    endpoint,
    method: options.method || "GET",
    hasBody: !!options.body,
  });

  try {
    const isFormData = options.body instanceof FormData;
    const headers = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    };

    if (isFormData && headers["Content-Type"]) {
      delete headers["Content-Type"];
    }

    const response = await fetchWithTimeout(endpoint, {
      ...options,
      headers,
    });

    const duration = Date.now() - startTime;
    debugLog("API Response:", {
      endpoint,
      status: response.status,
      ok: response.ok,
      duration: `${duration}ms`,
      attempt,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || "Request failed" };
      }

      const error = new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
      );
      error.status = response.status;
      error.data = errorData;

      console.error("❌ API Error:", {
        endpoint,
        status: response.status,
        message: error.message,
        data: errorData,
        attempt,
      });

      // Handle authentication errors immediately
      handleAuthError(response.status);

      // Retry if applicable
      if (isRetryableError(error) && retryCount < MAX_RETRIES - 1) {
        const delay = getRetryDelay(attempt);
        debugLog(`⏳ Retrying after ${delay}ms...`);
        await sleep(delay);
        return apiCall(endpoint, options, retryCount + 1);
      }

      throw error;
    }

    const data = await response.json();
    debugLog("✅ API Success:", {
      endpoint,
      dataKeys: Object.keys(data),
      attempt,
    });

    return data;
  } catch (error) {
    // Enhanced error messages
    if (error.message?.includes("Failed to fetch")) {
      error.message =
        "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต";
    } else if (error.message?.includes("NetworkError")) {
      error.message = "เกิดข้อผิดพลาดทางเครือข่าย กรุณาลองใหม่อีกครั้ง";
    } else if (error.message?.includes("timeout")) {
      error.message = "คำขอใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง";
    }

    console.error("❌ API call failed:", {
      endpoint,
      error: error.message,
      attempt,
      willRetry: isRetryableError(error) && retryCount < MAX_RETRIES - 1,
    });

    // Retry if applicable
    if (isRetryableError(error) && retryCount < MAX_RETRIES - 1) {
      const delay = getRetryDelay(attempt);
      debugLog(`⏳ Retrying after ${delay}ms... (network/timeout error)`);
      await sleep(delay);
      return apiCall(endpoint, options, retryCount + 1);
    }

    throw error;
  }
};

// Test API connection
export const testConnection = async () => {
  try {
    debugLog("Testing API connection...");
    // Use /health endpoint (not /api/health)
    const healthUrl = window.location.origin + "/health";
    const response = await fetch(healthUrl, {
      method: "GET",
    });
    const ok = response.ok;
    debugLog("API Connection:", ok ? "✅ Connected" : "❌ Failed", healthUrl);
    return ok;
  } catch (error) {
    console.error("❌ API Connection Test Failed:", error);
    return false;
  }
};

// ==================== Task APIs ====================

export const fetchTasks = async (groupId, filters = {}) => {
  const url = buildUrl(`/groups/${groupId}/tasks`, filters);
  const res = await apiCall(url);
  return res?.data ?? res; // normalize to {data: [...] } or array
};

export const getTask = async (groupId, taskId) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/tasks/${taskId}`);
};

export const createTask = async (groupId, taskData) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/tasks`, {
    method: "POST",
    body: JSON.stringify(taskData),
  });
};

export const updateTask = async (groupId, taskId, updates) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
};

export const deleteTask = async (groupIdOrTaskId, maybeTaskId) => {
  const hasGroup = typeof maybeTaskId !== "undefined";
  const groupId = hasGroup ? groupIdOrTaskId : null;
  const taskId = hasGroup ? maybeTaskId : groupIdOrTaskId;
  const endpoint = hasGroup
    ? `${API_BASE_URL}/groups/${groupId}/tasks/${taskId}`
    : `${API_BASE_URL}/tasks/${taskId}`;

  return apiCall(endpoint, { method: "DELETE" });
};

export const completeTask = async (groupIdOrTaskId, maybeTaskId) => {
  const hasGroup = typeof maybeTaskId !== "undefined";
  const groupId = hasGroup ? groupIdOrTaskId : null;
  const taskId = hasGroup ? maybeTaskId : groupIdOrTaskId;
  const endpoint = hasGroup
    ? `${API_BASE_URL}/groups/${groupId}/tasks/${taskId}/complete`
    : `${API_BASE_URL}/tasks/${taskId}/complete`;

  return apiCall(endpoint, { method: "POST" });
};

const resolveStoredUserId = () => {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("leka_userId");
};

const buildEndpointWithUserId = (endpoint, userId) => {
  const resolvedUserId = userId || resolveStoredUserId();
  if (!resolvedUserId) {
    return endpoint;
  }
  const separator = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${separator}userId=${encodeURIComponent(resolvedUserId)}`;
};

export const submitTask = async (groupId, taskId, submitData = {}, userId) => {
  // ถ้าไม่มี groupId ให้ใช้ endpoint ที่ไม่ต้องมี groupId
  const baseEndpoint = groupId 
    ? `${API_BASE_URL}/groups/${groupId}/tasks/${taskId}/submit`
    : `${API_BASE_URL}/tasks/${taskId}/submit`;
  const endpoint = buildEndpointWithUserId(baseEndpoint, userId);

  if (submitData instanceof FormData) {
    const response = await fetch(endpoint, {
      method: "POST",
      body: submitData,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  return apiCall(endpoint, {
    method: "POST",
    body:
      typeof submitData === "string"
        ? submitData
        : JSON.stringify(submitData || {}),
  });
};

export const submitTaskWithProgress = (
  groupId,
  taskId,
  formData,
  userId,
  onProgress,
) => {
  return new Promise((resolve, reject) => {
    try {
      // ถ้าไม่มี groupId ให้ใช้ endpoint ที่ไม่ต้องมี groupId
      const baseEndpoint = groupId 
        ? `${API_BASE_URL}/groups/${groupId}/tasks/${taskId}/submit`
        : `${API_BASE_URL}/tasks/${taskId}/submit`;
      const endpoint = buildEndpointWithUserId(baseEndpoint, userId);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint, true);
      xhr.responseType = "json";

      if (typeof onProgress === "function") {
        xhr.upload.onprogress = (event) => {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            lengthComputable: event.lengthComputable,
          });
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response || {});
        } else {
          const message =
            xhr.response?.message ||
            xhr.response?.error ||
            `HTTP ${xhr.status}`;
          reject(new Error(message));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(formData);
    } catch (error) {
      reject(error);
    }
  });
};

export const approveTask = async (
  groupIdOrTaskId,
  maybeTaskId,
  payload = {},
) => {
  const hasGroup = typeof maybeTaskId !== "undefined";
  const groupId = hasGroup ? groupIdOrTaskId : null;
  const taskId = hasGroup ? maybeTaskId : groupIdOrTaskId;
  const endpoint = hasGroup
    ? `${API_BASE_URL}/groups/${groupId}/tasks/${taskId}/approve`
    : `${API_BASE_URL}/tasks/${taskId}/approve`;

  const hasPayload = payload && Object.keys(payload).length > 0;

  return apiCall(endpoint, {
    method: "POST",
    ...(hasPayload ? { body: JSON.stringify(payload) } : {}),
  });
};

export const reopenTask = async (
  groupIdOrTaskId,
  maybeTaskId,
  updates = { status: "in_progress" },
) => {
  const hasGroup = typeof maybeTaskId !== "undefined";
  const groupId = hasGroup ? groupIdOrTaskId : null;
  const taskId = hasGroup ? maybeTaskId : groupIdOrTaskId;
  const endpoint = hasGroup
    ? `${API_BASE_URL}/groups/${groupId}/tasks/${taskId}`
    : `${API_BASE_URL}/tasks/${taskId}`;

  return apiCall(endpoint, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
};

export const createMultipleTasks = async (groupId, tasks = []) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/tasks/bulk`, {
    method: "POST",
    body: JSON.stringify({ tasks }),
  });
};

export const approveExtension = async (groupId, taskId) => {
  return apiCall(
    `${API_BASE_URL}/groups/${groupId}/tasks/${taskId}/approve-extension`,
    {
      method: "POST",
    },
  );
};

// ==================== Calendar APIs ====================

export const getCalendarEvents = async (groupId, params = {}) => {
  const url = buildUrl(`/groups/${groupId}/calendar`, params);
  return apiCall(url);
};

// ==================== Group APIs ====================

export const getGroup = async (groupId) => {
  const res = await apiCall(`${API_BASE_URL}/groups/${groupId}`);
  return res?.data ?? res;
};

export const getUserGroups = async (userId) => {
  const res = await apiCall(`${API_BASE_URL}/users/${userId}/groups`);
  return res?.data ?? res?.groups ?? [];
};

export const getGroupMembers = async (groupId) => {
  const res = await apiCall(`${API_BASE_URL}/groups/${groupId}/members`);
  return res?.data ?? res?.members ?? [];
};

export const getGroupStats = async (groupId, params = {}) => {
  const url = buildUrl(`/groups/${groupId}/stats`, params);
  const res = await apiCall(url);
  return res?.data ?? res?.stats ?? res;
};

export const createInviteLink = async (groupId) => {
  const res = await apiCall(`${API_BASE_URL}/groups/${groupId}/invites`, {
    method: "POST",
  });
  return res?.data ?? res;
};

export const sendInviteEmail = async (groupId, email, message) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/invites/email`, {
    method: "POST",
    body: JSON.stringify({ email, message }),
  });
};

export const updateMemberRole = async (groupId, memberId, role) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/members/${memberId}/role`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });
};

export const removeMember = async (groupId, memberId) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/members/${memberId}`, {
    method: "DELETE",
  });
};

/**
 * Bulk delete members
 * @param {string} groupId - Group ID
 * @param {string[]} memberIds - Array of LINE User IDs
 * @returns {Promise<{success: boolean, deletedCount: number, failedCount: number, errors: Array}>}
 */
export const bulkDeleteMembers = async (groupId, memberIds) => {
  const response = await apiCall(
    `${API_BASE_URL}/groups/${groupId}/members/bulk-delete`,
    {
      method: "POST",
      body: JSON.stringify({ memberIds }),
    },
  );
  return response?.data || response;
};

/**
 * Bulk update member roles
 * @param {string} groupId - Group ID
 * @param {string[]} memberIds - Array of LINE User IDs
 * @param {string} role - New role ('admin' or 'member')
 * @returns {Promise<{success: boolean, updatedCount: number, failedCount: number, errors: Array}>}
 */
export const bulkUpdateMemberRole = async (groupId, memberIds, role) => {
  const response = await apiCall(
    `${API_BASE_URL}/groups/${groupId}/members/bulk-update-role`,
    {
      method: "POST",
      body: JSON.stringify({ memberIds, role }),
    },
  );
  return response?.data || response;
};

/**
 * Send email verification
 * @param {string} userId - LINE User ID
 * @param {string} email - Email address
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const sendEmailVerification = async (userId, email) => {
  const response = await apiCall(
    `${API_BASE_URL}/users/${userId}/email/send-verification`,
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
  );
  return response?.data || response;
};

/**
 * Verify email with token
 * @param {string} userId - LINE User ID
 * @param {string} token - Verification token
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const verifyEmail = async (userId, token) => {
  const response = await apiCall(
    `${API_BASE_URL}/users/${userId}/email/verify`,
    {
      method: "POST",
      body: JSON.stringify({ token }),
    },
  );
  return response;
};

export const getLeaderboard = async (groupId, params = {}) => {
  const url = buildUrl(`/groups/${groupId}/leaderboard`, params);
  const res = await apiCall(url);
  return res?.data ?? res?.leaderboard ?? res;
};

export const syncLeaderboard = async (groupId) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/sync-leaderboard`, {
    method: "POST",
  });
};

// ==================== File APIs ====================

export const getGroupFiles = async (groupId, params = {}) => {
  const url = buildUrl(`/groups/${groupId}/files`, params);
  return apiCall(url);
};

export const getFileInfo = async (groupId, fileId) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/files/${fileId}`);
};

export const getTaskFiles = async (groupId, taskId) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/tasks/${taskId}/files`);
};

export const downloadFile = async (_groupId, fileId) => {
  return `${API_BASE_URL}/files/${fileId}/download`;
};

export const previewFile = async (_groupId, fileId) => {
  return `${API_BASE_URL}/files/${fileId}/preview`;
};

export const uploadFile = async (groupId, formData) => {
  const response = await fetch(
    `${API_BASE_URL}/groups/${groupId}/files/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Upload failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return await response.json();
};

export const uploadFiles = async (groupId, files = [], metadata = {}) => {
  const formData = new FormData();

  files.forEach((file) => {
    if (file) {
      formData.append("attachments", file);
    }
  });

  Object.entries(metadata || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  const response = await fetch(
    `${API_BASE_URL}/groups/${groupId}/files/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Upload failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return await response.json();
};

export const deleteFile = async (_groupId, fileId) => {
  return apiCall(`${API_BASE_URL}/files/${fileId}`, {
    method: "DELETE",
  });
};

export const getFilePreview = async (fileId, groupId) => {
  const storedGroupId =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("leka_groupId")
      : null;
  const resolvedGroupId = groupId || storedGroupId;
  if (!resolvedGroupId) {
    throw new Error("Missing groupId for file preview");
  }
  return `${API_BASE_URL}/groups/${resolvedGroupId}/files/${fileId}/preview`;
};

export const uploadFilesWithProgress = (
  groupId,
  files = [],
  metadata = {},
  onProgress,
) => {
  return new Promise((resolve, reject) => {
    try {
      const formData = new FormData();
      files.forEach((file) => file && formData.append("attachments", file));
      Object.entries(metadata || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE_URL}/groups/${groupId}/files/upload`, true);
      xhr.responseType = "json";

      if (typeof onProgress === "function") {
        xhr.upload.onprogress = (event) => {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            lengthComputable: event.lengthComputable,
          });
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response || {});
        } else {
          const message =
            xhr.response?.message ||
            xhr.response?.error ||
            `HTTP ${xhr.status}`;
          reject(new Error(message));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(formData);
    } catch (error) {
      reject(error);
    }
  });
};

// ==================== User APIs ====================

export const getUserStats = async (userId, groupId) => {
  const url = buildUrl(`/users/${userId}/stats`, { groupId });
  return apiCall(url);
};

export const getUserScoreHistory = async (userId, groupId) => {
  return apiCall(`${API_BASE_URL}/users/${userId}/score-history/${groupId}`);
};

export const getUserAverageScore = async (userId, groupId) => {
  return apiCall(`${API_BASE_URL}/users/${userId}/average-score/${groupId}`);
};

export const getUserProfile = async (userId, groupId) => {
  const endpoint = groupId
    ? `${API_BASE_URL}/groups/${groupId}/users/${userId}/profile`
    : `${API_BASE_URL}/users/${userId}/profile`;
  const res = await apiCall(endpoint);
  return res?.data ?? res;
};

export const updateUserProfile = async (userId, groupId, profileData = {}) => {
  const endpoint = groupId
    ? `${API_BASE_URL}/groups/${groupId}/users/${userId}/profile`
    : `${API_BASE_URL}/users/${userId}/profile`;

  return apiCall(endpoint, {
    method: "PUT",
    body: JSON.stringify(profileData),
  });
};

export const getUserTasks = async (userId, params = {}) => {
  if (!userId) return [];
  const url = buildUrl(`/users/${userId}/tasks`, params);
  const res = await apiCall(url);
  return res?.data ?? res ?? [];
};

// ==================== Recurring Task APIs ====================

export const listRecurringTasks = async (groupId) => {
  const res = await apiCall(`${API_BASE_URL}/groups/${groupId}/recurring`);
  return res?.data ?? res ?? [];
};

export const getRecurringTask = async (groupIdOrId, maybeId) => {
  const hasGroup = typeof maybeId !== "undefined";
  const groupId = hasGroup ? groupIdOrId : null;
  const id = hasGroup ? maybeId : groupIdOrId;
  const endpoint = hasGroup
    ? `${API_BASE_URL}/groups/${groupId}/recurring/${id}`
    : `${API_BASE_URL}/recurring/${id}`;

  const res = await apiCall(endpoint);
  return res?.data ?? res;
};

export const createRecurringTask = async (groupId, recurringData) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/recurring`, {
    method: "POST",
    body: JSON.stringify(recurringData),
  });
};

export const updateRecurringTask = async (groupIdOrId, maybeId, updates) => {
  const hasGroup = typeof maybeId !== "undefined";
  const groupId = hasGroup ? groupIdOrId : null;
  const id = hasGroup ? maybeId : groupIdOrId;
  const endpoint = hasGroup
    ? `${API_BASE_URL}/groups/${groupId}/recurring/${id}`
    : `${API_BASE_URL}/recurring/${id}`;

  return apiCall(endpoint, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
};

export const deleteRecurringTask = async (groupIdOrId, maybeId) => {
  const hasGroup = typeof maybeId !== "undefined";
  const groupId = hasGroup ? groupIdOrId : null;
  const id = hasGroup ? maybeId : groupIdOrId;
  const endpoint = hasGroup
    ? `${API_BASE_URL}/groups/${groupId}/recurring/${id}`
    : `${API_BASE_URL}/recurring/${id}`;

  return apiCall(endpoint, {
    method: "DELETE",
  });
};

export const toggleRecurringTask = async (groupId, taskId, enabled) => {
  return apiCall(
    `${API_BASE_URL}/groups/${groupId}/recurring/${taskId}/toggle`,
    {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    },
  );
};

export const getRecurringHistory = async (groupIdOrId, maybeId) => {
  const hasGroup = typeof maybeId !== "undefined";
  const groupId = hasGroup ? groupIdOrId : null;
  const id = hasGroup ? maybeId : groupIdOrId;
  const endpoint = hasGroup
    ? `${API_BASE_URL}/groups/${groupId}/recurring/${id}/history`
    : `${API_BASE_URL}/recurring/${id}/history`;

  const res = await apiCall(endpoint);
  return res?.data ?? res ?? [];
};

export const getRecurringTaskHistory = async (groupId, taskId) => {
  return getRecurringHistory(groupId, taskId);
};

export const getRecurringStats = async (id) => {
  const res = await apiCall(`${API_BASE_URL}/recurring/${id}/stats`);
  return res?.data ?? res;
};

export const getGroupRecurringStats = async (groupId) => {
  const res = await apiCall(
    `${API_BASE_URL}/groups/${groupId}/recurring/stats`,
  );
  return res?.data ?? res;
};

// ==================== Report APIs ====================

// Helper: Normalize report summary data
const normalizeReportSummary = (summarySource) => {
  if (!summarySource) {
    return {
      periodStart: null,
      periodEnd: null,
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      overdueTasks: 0,
      completionRate: 0,
      avgCompletionTime: 0,
    };
  }

  const totals = summarySource.totals || summarySource || {};
  const totalTasks =
    totals.totalAssigned ??
    totals.total ??
    (totals.completed || 0) +
      (totals.overdue || 0) +
      (totals.late || 0) +
      (totals.ontime || 0) +
      (totals.early || 0);
  const completed = Number(totals.completed || 0);
  const overdue = Number(totals.overdue || 0);
  const completionRate = Number(totals.completionRate || 0);
  const avgCompletionTime = Number(
    totals.avgCompletionTime || totals.avgCompletionHours || 0,
  );

  const inProgressEstimate = Math.max(totalTasks - completed - overdue, 0);

  return {
    periodStart: summarySource.periodStart || null,
    periodEnd: summarySource.periodEnd || null,
    totalTasks,
    completedTasks: completed,
    inProgressTasks: inProgressEstimate,
    overdueTasks: overdue,
    completionRate: Math.round(completionRate * 10) / 10,
    avgCompletionTime,
  };
};

// Helper: Normalize member/user report rows
const normalizeMemberReportRows = (rows) => {
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    const completed = Number(row.completed || 0);
    const overdue = Number(row.overdue || 0);
    const late = Number(row.late || 0);
    const early = Number(row.early || 0);
    const ontime = Number(row.ontime || 0);

    const assigned =
      Number(row.assigned) ||
      Number(row.totalAssigned) ||
      completed + overdue + late + ontime + early ||
      completed;

    const rate =
      assigned > 0 ? Math.round((completed / assigned) * 1000) / 10 : 0;

    return {
      name: row.displayName || row.name || row.userName || "ไม่ทราบชื่อ",
      userId: row.userId || row.lineUserId || row.id,
      assigned,
      completed,
      overdue,
      rate,
      trend: rate >= 70 ? "up" : "down",
    };
  });
};

const normalizeReportParams = (params = {}) => {
  const output = {};

  const range = params.dateRange;
  if (range === "week" || range === "weekly") {
    output.period = "weekly";
  } else if (range === "month" || range === "monthly") {
    output.period = "monthly";
  } else if (range === "custom") {
    if (params.startDate) output.startDate = params.startDate;
    if (params.endDate) output.endDate = params.endDate;
  } else if (range === "quarter" || range === "year") {
    output.period = "monthly";
  }

  if (Array.isArray(params.members) && params.members.length > 0) {
    output.userId = params.members[0];
  }

  if (params.startDate && !output.startDate && range !== "custom") {
    output.startDate = params.startDate;
  }

  if (params.endDate && !output.endDate && range !== "custom") {
    output.endDate = params.endDate;
  }

  return output;
};

export const getReports = async (groupId, params = {}) => {
  const query = normalizeReportParams(params);
  const [summaryRaw, byUsersRaw] = await Promise.all([
    getReportsSummary(groupId, query).catch(() => null),
    getReportsByUsers(groupId, query).catch(() => []),
  ]);

  // Normalize data before returning
  const summary = normalizeReportSummary(summaryRaw);
  const byMember = normalizeMemberReportRows(byUsersRaw);

  // Include trends if available (otherwise empty)
  const trends = summaryRaw?.trends || {
    labels: [],
    tasksCreated: [],
    tasksCompleted: [],
  };

  return {
    summary,
    byMember,
    trends,
    byCategory: Array.isArray(summaryRaw?.byCategory)
      ? summaryRaw.byCategory
      : [],
  };
};

export const getReportsSummary = async (groupId, params = {}) => {
  const url = buildUrl(`/groups/${groupId}/reports/summary`, params);
  const res = await apiCall(url);
  return res?.data ?? res;
};

export const getReportsByUsers = async (groupId, params = {}) => {
  const url = buildUrl(`/groups/${groupId}/reports/by-users`, params);
  const res = await apiCall(url);
  return res?.data ?? res ?? [];
};

export const exportReports = async (groupId, params = {}) => {
  const url = buildUrl(`/groups/${groupId}/reports/export`, params);
  return url; // Return URL for download
};

// ==================== KPI APIs ====================

export const exportKPI = async (groupId) => {
  return `${API_BASE_URL}/export/kpi/${groupId}`;
};

// ==================== LINE APIs ====================

export const getLineMembers = async (groupId) => {
  return apiCall(`${API_BASE_URL}/line/members/${groupId}`);
};

export const getLineMembersLive = async (groupId) => {
  return apiCall(`${API_BASE_URL}/line/members/${groupId}/live`);
};

// ==================== Helper Functions ====================

// Convert task from backend format to frontend format
const normalizeTaskStatus = (status) => {
  if (!status) return "pending";
  const normalized = status.toLowerCase();
  if (normalized === "in-progress") return "in_progress";
  if (normalized === "waiting") return "pending";
  if (
    normalized === "done" ||
    normalized === "approved" ||
    normalized === "submitted" ||
    normalized === "reviewed"
  ) {
    return normalized;
  }
  if (normalized === "cancelled") return "cancelled";
  if (normalized === "overdue") return "overdue";
  return normalized;
};

export const normalizeTask = (task) => {
  let assignedUsers =
    Array.isArray(task.assignedUsers) && task.assignedUsers.length > 0
      ? task.assignedUsers
      : [];

  if (assignedUsers.length === 0 && Array.isArray(task.assigneeLineUserIds)) {
    assignedUsers = task.assigneeLineUserIds
      .filter(Boolean)
      .map((lineUserId) => ({
        id: lineUserId,
        lineUserId,
        displayName: lineUserId,
      }));
  }

  const primaryAssignee = assignedUsers.length > 0 ? assignedUsers[0] : null;

  const dueTime = task.dueTime || task.dueDate || task.deadline || null;

  const startTime = task.startTime || task.scheduledDate || null;

  return {
    id: task.id,
    groupId: task.groupId,
    title: task.title || task.description || "Untitled",
    description: task.description || "",
    status: normalizeTaskStatus(task.status),
    priority: (task.priority || "medium").toLowerCase(),
    assignee: primaryAssignee
      ? {
          name:
            primaryAssignee.displayName ||
            primaryAssignee.realName ||
            primaryAssignee.name ||
            primaryAssignee.lineUserId,
          avatar: primaryAssignee.pictureUrl,
          lineUserId: primaryAssignee.lineUserId || primaryAssignee.id,
        }
      : null,
    assignees: Array.isArray(task.assignees) ? task.assignees : [],
    assignedUsers,
    assigneeLineUserIds: Array.isArray(task.assigneeLineUserIds)
      ? task.assigneeLineUserIds
      : Array.isArray(task.assignees)
        ? task.assignees
        : [],
    scheduledDate: startTime,
    startTime,
    dueDate: dueTime,
    dueTime,
    estimatedTime: task.estimatedTime || task.timeEstimate || null,
    tags: Array.isArray(task.tags) ? task.tags : [],
    createdBy: task.createdBy,
    createdByUser: task.createdByUser || null,
    createdAt: task.createdAt || null,
    updatedAt: task.updatedAt || null,
    completedAt: task.completedAt || null,
    files: task.files || task.attachedFiles || [],
    type: task.type || "operational",
    reviewerUserId: task.reviewerUserId || null,
    workflow: task.workflow || null,
    raw: task,
  };
};

// Convert tasks array
export const normalizeTasks = (tasks) => {
  if (!Array.isArray(tasks)) return [];
  return tasks.map(normalizeTask);
};

// Calculate task statistics
const parseNumberStat = (value) => {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
};

const pickStatValue = (stats, keys) => {
  for (const key of keys) {
    const value = parseNumberStat(stats?.[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
};

export const normalizeStatsSummary = (rawStats) => {
  if (!rawStats || typeof rawStats !== "object") return null;

  const stats =
    rawStats.stats ??
    rawStats.data?.stats ??
    rawStats.data ??
    rawStats.summary ??
    rawStats;

  if (!stats || typeof stats !== "object") return null;

  const normalized = {
    totalTasks:
      pickStatValue(stats, [
        "totalTasks",
        "total_tasks",
        "total",
        "totalCount",
        "tasksTotal",
      ]) ?? 0,
    completedTasks:
      pickStatValue(stats, [
        "completedTasks",
        "completed_tasks",
        "completed",
        "completedCount",
        "tasksCompleted",
        "done",
      ]) ?? 0,
    overdueTasks:
      pickStatValue(stats, [
        "overdueTasks",
        "overdue_tasks",
        "overdue",
        "overdueCount",
        "tasksOverdue",
      ]) ?? 0,
    pendingTasks: pickStatValue(stats, [
      "pendingTasks",
      "pending_tasks",
      "pending",
      "pendingCount",
      "tasksPending",
      "incomplete",
      "processing",
    ]),
    inProgressTasks: pickStatValue(stats, [
      "inProgressTasks",
      "in_progress",
      "inProgress",
      "processingTasks",
      "processing",
    ]),
    scheduledTasks: pickStatValue(stats, [
      "scheduledTasks",
      "scheduled",
      "tasksScheduled",
      "waiting",
    ]),
    newTasks: pickStatValue(stats, ["newTasks", "new", "tasksNew"]),
  };

  Object.keys(normalized).forEach((key) => {
    if (normalized[key] === null) {
      delete normalized[key];
    }
  });

  if (
    normalized.pendingTasks === undefined &&
    typeof normalized.totalTasks === "number" &&
    typeof normalized.completedTasks === "number"
  ) {
    normalized.pendingTasks = Math.max(
      normalized.totalTasks - normalized.completedTasks,
      0,
    );
  }

  return normalized;
};

export const calculateStats = (tasks) => {
  const now = new Date();
  const completedStatuses = new Set([
    "completed",
    "approved",
    "submitted",
    "reviewed",
    "auto_approved",
    "done",
  ]);
  const inProgressStatuses = new Set([
    "in-progress",
    "in_progress",
    "processing",
    "review",
  ]);
  const pendingStatuses = new Set(["pending", "waiting", "scheduled"]);

  return {
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => completedStatuses.has(t.status)).length,
    inProgressTasks: tasks.filter((t) => inProgressStatuses.has(t.status))
      .length,
    overdueTasks: tasks.filter((t) => {
      if (completedStatuses.has(t.status)) return false;
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < now || t.status === "overdue";
    }).length,
    newTasks: tasks.filter((t) => pendingStatuses.has(t.status)).length,
    scheduledTasks: tasks.filter((t) => pendingStatuses.has(t.status)).length,
    pendingTasks: tasks.filter(
      (t) => pendingStatuses.has(t.status) || inProgressStatuses.has(t.status),
    ).length,
  };
};

export default {
  fetchTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  submitTask,
  submitTaskWithProgress,
  approveTask,
  reopenTask,
  createMultipleTasks,
  approveExtension,
  getCalendarEvents,
  getGroup,
  getGroupMembers,
  getGroupStats,
  createInviteLink,
  sendInviteEmail,
  updateMemberRole,
  removeMember,
  getLeaderboard,
  syncLeaderboard,
  getGroupFiles,
  getFileInfo,
  getTaskFiles,
  downloadFile,
  previewFile,
  uploadFile,
  uploadFiles,
  uploadFilesWithProgress,
  deleteFile,
  getFilePreview,
  getUserStats,
  getUserScoreHistory,
  getUserAverageScore,
  getUserProfile,
  getUserTasks,
  updateUserProfile,
  listRecurringTasks,
  getRecurringTask,
  createRecurringTask,
  updateRecurringTask,
  deleteRecurringTask,
  toggleRecurringTask,
  getRecurringHistory,
  getRecurringTaskHistory,
  getRecurringStats,
  getGroupRecurringStats,
  getReports,
  getReportsSummary,
  getReportsByUsers,
  exportReports,
  exportKPI,
  getLineMembers,
  getLineMembersLive,
  normalizeTask,
  normalizeTasks,
  calculateStats,
  normalizeStatsSummary,
};

// ==================== Activity Logs ====================

/**
 * Get activity logs with filters
 * @param {string} groupId - Group ID
 * @param {Object} params - Query parameters
 * @returns {Promise<{logs: Array, total: number}>}
 */
export const getActivityLogs = async (groupId, params = {}) => {
  const queryParams = new URLSearchParams();

  if (params.userId) queryParams.append("userId", params.userId);
  if (params.action) queryParams.append("action", params.action);
  if (params.resourceType)
    queryParams.append("resourceType", params.resourceType);
  if (params.resourceId) queryParams.append("resourceId", params.resourceId);
  if (params.startDate) queryParams.append("startDate", params.startDate);
  if (params.endDate) queryParams.append("endDate", params.endDate);
  if (params.limit) queryParams.append("limit", params.limit);
  if (params.offset) queryParams.append("offset", params.offset);
  if (params.search) queryParams.append("search", params.search);

  const queryString = queryParams.toString();
  const url = `${API_BASE_URL}/groups/${groupId}/activity-logs${queryString ? `?${queryString}` : ""}`;

  const response = await apiCall(url);
  return {
    logs: response?.data || [],
    total: response?.pagination?.total || 0,
  };
};

/**
 * Get activity statistics
 * @param {string} groupId - Group ID
 * @param {number} days - Number of days to look back (default: 30)
 * @returns {Promise<Object>}
 */
export const getActivityStats = async (groupId, days = 30) => {
  const response = await apiCall(
    `${API_BASE_URL}/groups/${groupId}/activity-logs/stats?days=${days}`,
  );
  return response?.data || {};
};

/**
 * Get unique actions in group
 * @param {string} groupId - Group ID
 * @returns {Promise<Array<string>>}
 */
export const getUniqueActions = async (groupId) => {
  const response = await apiCall(
    `${API_BASE_URL}/groups/${groupId}/activity-logs/actions`,
  );
  return response?.data || [];
};

/**
 * Get unique resource types in group
 * @param {string} groupId - Group ID
 * @returns {Promise<Array<string>>}
 */
export const getUniqueResourceTypes = async (groupId) => {
  const response = await apiCall(
    `${API_BASE_URL}/groups/${groupId}/activity-logs/resource-types`,
  );
  return response?.data || [];
};
