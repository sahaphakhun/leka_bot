/**
 * Leka Bot Mobile API Service
 * Handles all API calls to the backend with retry logic and error handling
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://your-production-url.com/api';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;
const REQUEST_TIMEOUT = 30000;

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Calculate exponential backoff delay
const getRetryDelay = (attemptNumber) => {
  return INITIAL_RETRY_DELAY * Math.pow(2, attemptNumber - 1);
};

// Check if error is retryable
const isRetryableError = (error) => {
  if (error.message?.includes('Network request failed')) return true;
  if (error.message?.includes('timeout')) return true;
  if (error.status === 408) return true;
  if (error.status === 429) return true;
  if (error.status >= 500) return true;
  return false;
};

// Fetch with timeout
const fetchWithTimeout = (url, options = {}, timeout = REQUEST_TIMEOUT) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    ),
  ]);
};

// Get stored auth token
const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('auth_token');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// API call with retry logic
const apiCall = async (endpoint, options = {}, retryCount = 0) => {
  const attempt = retryCount + 1;

  try {
    const token = await getAuthToken();
    const isFormData = options.body instanceof FormData;

    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    if (isFormData && headers['Content-Type']) {
      delete headers['Content-Type'];
    }

    const response = await fetchWithTimeout(endpoint, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || 'Request failed' };
      }

      const error = new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
      error.status = response.status;
      error.data = errorData;

      // Retry if applicable
      if (isRetryableError(error) && retryCount < MAX_RETRIES - 1) {
        const delay = getRetryDelay(attempt);
        await sleep(delay);
        return apiCall(endpoint, options, retryCount + 1);
      }

      throw error;
    }

    return await response.json();
  } catch (error) {
    // Enhanced error messages
    if (error.message?.includes('Network request failed')) {
      error.message = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
    } else if (error.message?.includes('timeout')) {
      error.message = 'คำขอใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง';
    }

    // Retry if applicable
    if (isRetryableError(error) && retryCount < MAX_RETRIES - 1) {
      const delay = getRetryDelay(attempt);
      await sleep(delay);
      return apiCall(endpoint, options, retryCount + 1);
    }

    throw error;
  }
};

// Build URL with query parameters
const buildUrl = (endpoint, params = {}) => {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined) {
      url.searchParams.append(key, params[key]);
    }
  });
  return url.toString();
};

// ==================== Task APIs ====================

export const fetchTasks = async (groupId, filters = {}) => {
  const url = buildUrl(`/groups/${groupId}/tasks`, filters);
  const res = await apiCall(url);
  return res?.data ?? res;
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

export const deleteTask = async (groupId, taskId) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/tasks/${taskId}`, {
    method: 'DELETE',
  });
};

export const submitTask = async (groupId, taskId, formData) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/tasks/${taskId}/submit`, {
    method: 'POST',
    body: formData,
  });
};

export const approveTask = async (groupId, taskId, payload = {}) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/tasks/${taskId}/approve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
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

export const getLeaderboard = async (groupId, params = {}) => {
  const url = buildUrl(`/groups/${groupId}/leaderboard`, params);
  const res = await apiCall(url);
  return res?.data ?? res?.leaderboard ?? res;
};

// ==================== File APIs ====================

export const getGroupFiles = async (groupId, params = {}) => {
  const url = buildUrl(`/groups/${groupId}/files`, params);
  return apiCall(url);
};

export const uploadFile = async (groupId, formData) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/files/upload`, {
    method: 'POST',
    body: formData,
  });
};

export const deleteFile = async (fileId) => {
  return apiCall(`${API_BASE_URL}/files/${fileId}`, {
    method: 'DELETE',
  });
};

export const getFilePreview = (fileId, groupId) => {
  return `${API_BASE_URL}/groups/${groupId}/files/${fileId}/preview`;
};

// ==================== User APIs ====================

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

export const getUserStats = async (userId, groupId) => {
  const url = buildUrl(`/users/${userId}/stats`, { groupId });
  return apiCall(url);
};

export const getUserTasks = async (userId, params = {}) => {
  if (!userId) return [];
  const url = buildUrl(`/users/${userId}/tasks`, params);
  const res = await apiCall(url);
  return res?.data ?? res ?? [];
};

// ==================== Activity Logs ====================

export const getActivityLogs = async (groupId, params = {}) => {
  const queryParams = new URLSearchParams();

  if (params.userId) queryParams.append('userId', params.userId);
  if (params.action) queryParams.append('action', params.action);
  if (params.resourceType) queryParams.append('resourceType', params.resourceType);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.offset) queryParams.append('offset', params.offset);

  const queryString = queryParams.toString();
  const url = `${API_BASE_URL}/groups/${groupId}/activity-logs${queryString ? `?${queryString}` : ''}`;

  const response = await apiCall(url);
  return {
    logs: response?.data || [],
    total: response?.pagination?.total || 0,
  };
};

export const getActivityStats = async (groupId, days = 30) => {
  const response = await apiCall(
    `${API_BASE_URL}/groups/${groupId}/activity-logs/stats?days=${days}`
  );
  return response?.data || {};
};

// ==================== Recurring Tasks ====================

export const listRecurringTasks = async (groupId) => {
  const res = await apiCall(`${API_BASE_URL}/groups/${groupId}/recurring`);
  return res?.data ?? res ?? [];
};

export const createRecurringTask = async (groupId, recurringData) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/recurring`, {
    method: 'POST',
    body: JSON.stringify(recurringData),
  });
};

export const updateRecurringTask = async (groupId, id, updates) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/recurring/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteRecurringTask = async (groupId, id) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/recurring/${id}`, {
    method: 'DELETE',
  });
};

export default {
  fetchTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  submitTask,
  approveTask,
  getGroup,
  getGroupMembers,
  getGroupStats,
  getLeaderboard,
  getGroupFiles,
  uploadFile,
  deleteFile,
  getFilePreview,
  getUserProfile,
  updateUserProfile,
  getUserStats,
  getUserTasks,
  getActivityLogs,
  getActivityStats,
  listRecurringTasks,
  createRecurringTask,
  updateRecurringTask,
  deleteRecurringTask,
};
