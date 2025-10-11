// Leka Bot API Service
// Handles all API calls to the backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Helper function to build URL with query parameters
const buildUrl = (endpoint, params = {}) => {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
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
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
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
  return apiCall(url);
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

export const deleteTask = async (taskId) => {
  return apiCall(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'DELETE',
  });
};

export const completeTask = async (taskId) => {
  return apiCall(`${API_BASE_URL}/tasks/${taskId}/complete`, {
    method: 'POST',
  });
};

export const submitTask = async (groupId, taskId, submitData) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/tasks/${taskId}/submit`, {
    method: 'POST',
    body: JSON.stringify(submitData),
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
  return apiCall(`${API_BASE_URL}/groups/${groupId}`);
};

export const getGroupMembers = async (groupId) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/members`);
};

export const getGroupStats = async (groupId) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/stats`);
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

// ==================== Recurring Task APIs ====================

export const listRecurringTasks = async (groupId) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/recurring`);
};

export const getRecurringTask = async (id) => {
  return apiCall(`${API_BASE_URL}/recurring/${id}`);
};

export const createRecurringTask = async (groupId, recurringData) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/recurring`, {
    method: 'POST',
    body: JSON.stringify(recurringData),
  });
};

export const updateRecurringTask = async (id, updates) => {
  return apiCall(`${API_BASE_URL}/recurring/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteRecurringTask = async (id) => {
  return apiCall(`${API_BASE_URL}/recurring/${id}`, {
    method: 'DELETE',
  });
};

export const getRecurringHistory = async (id) => {
  return apiCall(`${API_BASE_URL}/recurring/${id}/history`);
};

export const getRecurringStats = async (id) => {
  return apiCall(`${API_BASE_URL}/recurring/${id}/stats`);
};

export const getGroupRecurringStats = async (groupId) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/recurring/stats`);
};

// ==================== Report APIs ====================

export const getReportsSummary = async (groupId, params = {}) => {
  const url = buildUrl(`/groups/${groupId}/reports/summary`, params);
  return apiCall(url);
};

export const getReportsByUsers = async (groupId, params = {}) => {
  const url = buildUrl(`/groups/${groupId}/reports/by-users`, params);
  return apiCall(url);
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
  approveExtension,
  getCalendarEvents,
  getGroup,
  getGroupMembers,
  getGroupStats,
  getLeaderboard,
  syncLeaderboard,
  getGroupFiles,
  getFileInfo,
  getTaskFiles,
  downloadFile,
  previewFile,
  uploadFile,
  getUserStats,
  getUserScoreHistory,
  getUserAverageScore,
  listRecurringTasks,
  getRecurringTask,
  createRecurringTask,
  updateRecurringTask,
  deleteRecurringTask,
  getRecurringHistory,
  getRecurringStats,
  getGroupRecurringStats,
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

