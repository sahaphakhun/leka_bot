import api from "./api";

const resolveUserId = (provided) => {
  if (provided) return provided;
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("leka_userId");
};

export async function uploadFile(groupId, file, taskId = null, userId) {
  const formData = new FormData();
  formData.append("attachments", file);
  if (taskId) formData.append("taskId", taskId);

  const resolvedUserId = resolveUserId(userId);
  if (resolvedUserId) {
    formData.append("userId", resolvedUserId);
  }

  const response = await api.post(`/groups/${groupId}/files/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function getFiles(groupId, filters = {}) {
  const response = await api.get(`/groups/${groupId}/files`, {
    params: filters,
  });
  return response.data;
}

export async function getFilesByTask(groupId, taskId) {
  const response = await api.get(`/groups/${groupId}/tasks/${taskId}/files`);
  return response.data;
}

export async function deleteFile(_groupId, fileId) {
  const response = await api.delete(`/files/${fileId}`);
  return response.data;
}

export async function downloadFile(_groupId, fileId) {
  const response = await api.get(`/files/${fileId}/download`, {
    responseType: "blob",
  });
  return response.data;
}

export async function getFilePreview(_groupId, fileId) {
  const response = await api.get(`/files/${fileId}/preview`);
  return response.data;
}
