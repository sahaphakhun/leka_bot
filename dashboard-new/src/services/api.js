// Leka Bot API Service
// Handles all API calls to the backend

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const DEBUG = import.meta.env.VITE_DEBUG === "true" || import.meta.env.DEV;

// Debug logger
const debugLog = (...args) => {
  if (DEBUG) {
    console.log("[API Debug]", ...args);
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

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const startTime = Date.now();
  debugLog("API Call:", {
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

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const duration = Date.now() - startTime;
    debugLog("API Response:", {
      endpoint,
      status: response.status,
      ok: response.ok,
      duration: `${duration}ms`,
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
      });

      throw error;
    }

    const data = await response.json();
    debugLog("✅ API Success:", {
      endpoint,
      dataKeys: Object.keys(data),
    });

    return data;
  } catch (error) {
    if (
      error.message.includes("Failed to fetch") ||
      error.message.includes("NetworkError")
    ) {
      console.error("🌐 Network Error:", {
        endpoint,
        message:
          "ไม่สามารถเชื่อมต่อกับ API ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต",
        originalError: error.message,
      });
      error.message =
        "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง";
    }

    console.error("❌ API call failed:", {
      endpoint,
      error: error.message,
      stack: error.stack,
    });
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

export const submitTask = async (groupId, taskId, submitData = {}) => {
  const endpoint = `${API_BASE_URL}/groups/${groupId}/tasks/${taskId}/submit`;

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
  onProgress,
) => {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open(
        "POST",
        `${API_BASE_URL}/groups/${groupId}/tasks/${taskId}/submit`,
        true,
      );
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

export const downloadFile = async (groupId, fileId) => {
  return `${API_BASE_URL}/groups/${groupId}/files/${fileId}/download`;
};

export const previewFile = async (groupId, fileId) => {
  return `${API_BASE_URL}/groups/${groupId}/files/${fileId}/preview`;
};

export const uploadFile = async (groupId, formData) => {
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/files`, {
    method: "POST",
    body: formData, // Don't set Content-Type, let browser set it with boundary
  });

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
      formData.append("files", file);
    }
  });

  Object.entries(metadata || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/files`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Upload failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return await response.json();
};

export const deleteFile = async (groupId, fileId) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/files/${fileId}`, {
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
      files.forEach((file) => file && formData.append("files", file));
      Object.entries(metadata || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE_URL}/groups/${groupId}/files`, true);
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

export const getReports = async (groupId, params = {}) => {
  try {
    const url = buildUrl(`/groups/${groupId}/reports`, params);
    const res = await apiCall(url);
    return res?.data ?? res;
  } catch (error) {
    console.warn("⚠️ getReports fallback to summary/by-users:", error);
    const [summary, byUsers] = await Promise.all([
      getReportsSummary(groupId, params).catch(() => null),
      getReportsByUsers(groupId, params).catch(() => []),
    ]);

    return {
      summary,
      byMember: byUsers,
    };
  }
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
