// Leka Bot API Service
// Handles all API calls to the backend

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Helper function to build URL with query parameters
const buildUrl = (endpoint, params = {}) => {
  // Handle relative paths correctly
  const baseUrl = API_BASE_URL.startsWith('http') ? API_BASE_URL : window.location.origin + API_BASE_URL;
  const url = new URL(`${baseUrl}${endpoint}`);
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined) {
      url.searchParams.append(key, params[key]);
    }
  });
  return url.toString();
};

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  try {
    const isFormData = options.body instanceof FormData;
    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    };

    if (isFormData && headers['Content-Type']) {
      delete headers['Content-Type'];
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
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
    method: 'POST',
    body: JSON.stringify(taskData),
  });
};

export const updateTask = async (groupId, taskId, updates) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteTask = async (groupIdOrTaskId, maybeTaskId) => {
  const hasGroup = typeof maybeTaskId !== 'undefined';
  const groupId = hasGroup ? groupIdOrTaskId : null;
  const taskId = hasGroup ? maybeTaskId : groupIdOrTaskId;
  const endpoint = hasGroup
    ? `${API_BASE_URL}/groups/${groupId}/tasks/${taskId}`
    : `${API_BASE_URL}/tasks/${taskId}`;

  return apiCall(endpoint, { method: 'DELETE' });
};

export const completeTask = async (groupIdOrTaskId, maybeTaskId) => {
  const hasGroup = typeof maybeTaskId !== 'undefined';
  const groupId = hasGroup ? groupIdOrTaskId : null;
  const taskId = hasGroup ? maybeTaskId : groupIdOrTaskId;
  const endpoint = hasGroup
    ? `${API_BASE_URL}/groups/${groupId}/tasks/${taskId}/complete`
    : `${API_BASE_URL}/tasks/${taskId}/complete`;

  return apiCall(endpoint, { method: 'POST' });
};

export const submitTask = async (groupId, taskId, submitData = {}) => {
  const endpoint = `${API_BASE_URL}/groups/${groupId}/tasks/${taskId}/submit`;

  if (submitData instanceof FormData) {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: submitData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  return apiCall(endpoint, {
    method: 'POST',
    body: typeof submitData === 'string' ? submitData : JSON.stringify(submitData || {}),
  });
};

export const approveTask = async (groupIdOrTaskId, maybeTaskId, payload = {}) => {
  const hasGroup = typeof maybeTaskId !== 'undefined';
  const groupId = hasGroup ? groupIdOrTaskId : null;
  const taskId = hasGroup ? maybeTaskId : groupIdOrTaskId;
  const endpoint = hasGroup
    ? `${API_BASE_URL}/groups/${groupId}/tasks/${taskId}/approve`
    : `${API_BASE_URL}/tasks/${taskId}/approve`;

  const hasPayload = payload && Object.keys(payload).length > 0;

  return apiCall(endpoint, {
    method: 'POST',
    ...(hasPayload ? { body: JSON.stringify(payload) } : {}),
  });
};

export const reopenTask = async (groupIdOrTaskId, maybeTaskId, updates = { status: 'in_progress' }) => {
  const hasGroup = typeof maybeTaskId !== 'undefined';
  const groupId = hasGroup ? groupIdOrTaskId : null;
  const taskId = hasGroup ? maybeTaskId : groupIdOrTaskId;
  const endpoint = hasGroup
    ? `${API_BASE_URL}/groups/${groupId}/tasks/${taskId}`
    : `${API_BASE_URL}/tasks/${taskId}`;

  return apiCall(endpoint, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const createMultipleTasks = async (groupId, tasks = []) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/tasks/bulk`, {
    method: 'POST',
    body: JSON.stringify({ tasks }),
  });
};

export const approveExtension = async (groupId, taskId) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/tasks/${taskId}/approve-extension`, {
    method: 'POST',
  });
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

export const getGroupStats = async (groupId) => {
  const res = await apiCall(`${API_BASE_URL}/groups/${groupId}/stats`);
  return res?.data ?? res?.stats ?? res;
};

export const createInviteLink = async (groupId) => {
  const res = await apiCall(`${API_BASE_URL}/groups/${groupId}/invites`, {
    method: 'POST',
  });
  return res?.data ?? res;
};

export const sendInviteEmail = async (groupId, email, message) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/invites/email`, {
    method: 'POST',
    body: JSON.stringify({ email, message }),
  });
};

export const updateMemberRole = async (groupId, memberId, role) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/members/${memberId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
};

export const removeMember = async (groupId, memberId) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/members/${memberId}`, {
    method: 'DELETE',
  });
};

export const getLeaderboard = async (groupId) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/leaderboard`);
};

export const syncLeaderboard = async (groupId) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/sync-leaderboard`, {
    method: 'POST',
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
    method: 'POST',
    body: formData, // Don't set Content-Type, let browser set it with boundary
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return await response.json();
};

export const uploadFiles = async (groupId, files = [], metadata = {}) => {
  const formData = new FormData();

  files.forEach(file => {
    if (file) {
      formData.append('files', file);
    }
  });

  Object.entries(metadata || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/files`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return await response.json();
};

export const deleteFile = async (groupId, fileId) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/files/${fileId}`, {
    method: 'DELETE',
  });
};

export const getFilePreview = async (fileId, groupId) => {
  const storedGroupId = typeof localStorage !== 'undefined' ? localStorage.getItem('leka_groupId') : null;
  const resolvedGroupId = groupId || storedGroupId;
  if (!resolvedGroupId) {
    throw new Error('Missing groupId for file preview');
  }
  return `${API_BASE_URL}/groups/${resolvedGroupId}/files/${fileId}/preview`;
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
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
};

// ==================== Recurring Task APIs ====================

export const listRecurringTasks = async (groupId) => {
  const res = await apiCall(`${API_BASE_URL}/groups/${groupId}/recurring`);
  return res?.data ?? res ?? [];
};

export const getRecurringTask = async (groupIdOrId, maybeId) => {
  const hasGroup = typeof maybeId !== 'undefined';
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
    method: 'POST',
    body: JSON.stringify(recurringData),
  });
};

export const updateRecurringTask = async (groupIdOrId, maybeId, updates) => {
  const hasGroup = typeof maybeId !== 'undefined';
  const groupId = hasGroup ? groupIdOrId : null;
  const id = hasGroup ? maybeId : groupIdOrId;
  const endpoint = hasGroup
    ? `${API_BASE_URL}/groups/${groupId}/recurring/${id}`
    : `${API_BASE_URL}/recurring/${id}`;

  return apiCall(endpoint, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteRecurringTask = async (groupIdOrId, maybeId) => {
  const hasGroup = typeof maybeId !== 'undefined';
  const groupId = hasGroup ? groupIdOrId : null;
  const id = hasGroup ? maybeId : groupIdOrId;
  const endpoint = hasGroup
    ? `${API_BASE_URL}/groups/${groupId}/recurring/${id}`
    : `${API_BASE_URL}/recurring/${id}`;

  return apiCall(endpoint, {
    method: 'DELETE',
  });
};

export const toggleRecurringTask = async (groupId, taskId, enabled) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/recurring/${taskId}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
};

export const getRecurringHistory = async (groupIdOrId, maybeId) => {
  const hasGroup = typeof maybeId !== 'undefined';
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
  const res = await apiCall(`${API_BASE_URL}/groups/${groupId}/recurring/stats`);
  return res?.data ?? res;
};

// ==================== Report APIs ====================

export const getReports = async (groupId, params = {}) => {
  try {
    const url = buildUrl(`/groups/${groupId}/reports`, params);
    const res = await apiCall(url);
    return res?.data ?? res;
  } catch (error) {
    console.warn('⚠️ getReports fallback to summary/by-users:', error);
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
export const normalizeTask = (task) => {
  return {
    id: task.id,
    title: task.title || task.description || 'Untitled',
    description: task.description,
    status: task.status || 'new',
    priority: task.priority || 'medium',
    assignee: task.assignees && task.assignees.length > 0 ? {
      name: task.assignees[0].displayName || task.assignees[0].lineUserId,
      avatar: task.assignees[0].pictureUrl,
      lineUserId: task.assignees[0].lineUserId
    } : null,
    assignees: task.assignees || [],
    scheduledDate: task.scheduledDate || task.dueDate,
    dueDate: task.dueDate,
    estimatedTime: task.estimatedTime || task.timeEstimate,
    tags: task.tags || [],
    createdBy: task.createdBy,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt,
    files: task.files || [],
    type: task.type || 'operational',
  };
};

// Convert tasks array
export const normalizeTasks = (tasks) => {
  if (!Array.isArray(tasks)) return [];
  return tasks.map(normalizeTask);
};

// Calculate task statistics
export const calculateStats = (tasks) => {
  const now = new Date();
  
  return {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'completed').length,
    inProgressTasks: tasks.filter(t => t.status === 'in-progress' || t.status === 'in_progress').length,
    overdueTasks: tasks.filter(t => {
      if (t.status === 'completed') return false;
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < now;
    }).length,
    newTasks: tasks.filter(t => t.status === 'new').length,
    scheduledTasks: tasks.filter(t => t.status === 'scheduled').length,
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
};
