import api from './api';

export async function getRecurringTasks(groupId) {
  const response = await api.get(`/groups/${groupId}/recurring-tasks`);
  return response.data;
}

export async function createRecurringTask(groupId, taskData) {
  const response = await api.post(`/groups/${groupId}/recurring-tasks`, taskData);
  return response.data;
}

export async function updateRecurringTask(groupId, taskId, taskData) {
  const response = await api.put(`/groups/${groupId}/recurring-tasks/${taskId}`, taskData);
  return response.data;
}

export async function deleteRecurringTask(groupId, taskId) {
  const response = await api.delete(`/groups/${groupId}/recurring-tasks/${taskId}`);
  return response.data;
}

export async function toggleRecurringTask(groupId, taskId, enabled) {
  const response = await api.patch(`/groups/${groupId}/recurring-tasks/${taskId}/toggle`, {
    enabled,
  });
  return response.data;
}

export async function getRecurringTaskHistory(groupId, taskId) {
  const response = await api.get(`/groups/${groupId}/recurring-tasks/${taskId}/history`);
  return response.data;
}

export function parseRecurrencePattern(pattern) {
  // Parse recurrence pattern string
  // e.g., "DAILY", "WEEKLY:1,3,5", "MONTHLY:1,15", "CUSTOM:0 9 * * 1-5"
  const [type, value] = pattern.split(':');
  
  switch (type) {
    case 'DAILY':
      return { type: 'daily', description: 'ทุกวัน' };
    case 'WEEKLY':
      const days = value ? value.split(',').map(d => parseInt(d)) : [];
      const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
      return {
        type: 'weekly',
        days,
        description: `ทุก ${days.map(d => dayNames[d]).join(', ')}`,
      };
    case 'MONTHLY':
      const dates = value ? value.split(',').map(d => parseInt(d)) : [];
      return {
        type: 'monthly',
        dates,
        description: `ทุกวันที่ ${dates.join(', ')} ของเดือน`,
      };
    case 'QUARTERLY':
      return { type: 'quarterly', description: 'ทุก 3 เดือน' };
    case 'CUSTOM':
      return { type: 'custom', cron: value, description: 'กำหนดเอง' };
    default:
      return { type: 'unknown', description: pattern };
  }
}

export function generateRecurrencePattern(type, config) {
  switch (type) {
    case 'daily':
      return 'DAILY';
    case 'weekly':
      return `WEEKLY:${config.days.join(',')}`;
    case 'monthly':
      return `MONTHLY:${config.dates.join(',')}`;
    case 'quarterly':
      return 'QUARTERLY';
    case 'custom':
      return `CUSTOM:${config.cron}`;
    default:
      return '';
  }
}
