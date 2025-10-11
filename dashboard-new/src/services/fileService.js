import api from './api';

export async function uploadFile(groupId, file, taskId = null) {
  const formData = new FormData();
  formData.append('file', file);
  if (taskId) formData.append('taskId', taskId);

  const response = await api.post(`/groups/${groupId}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function getFiles(groupId, filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await api.get(`/groups/${groupId}/files?${params}`);
  return response.data;
}

export async function getFilesByTask(groupId, taskId) {
  const response = await api.get(`/groups/${groupId}/tasks/${taskId}/files`);
  return response.data;
}

export async function deleteFile(groupId, fileId) {
  const response = await api.delete(`/groups/${groupId}/files/${fileId}`);
  return response.data;
}

export async function downloadFile(groupId, fileId) {
  const response = await api.get(`/groups/${groupId}/files/${fileId}/download`, {
    responseType: 'blob',
  });
  return response.data;
}

export async function getFilePreview(groupId, fileId) {
  const response = await api.get(`/groups/${groupId}/files/${fileId}/preview`);
  return response.data;
}
