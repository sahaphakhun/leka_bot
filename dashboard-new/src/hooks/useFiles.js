import { useState, useEffect } from 'react';

export function useFiles(groupId) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (groupId) {
      loadFiles();
    }
  }, [groupId]);

  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const { getFiles } = await import('../services/api');
      const response = await getFiles(groupId);
      setFiles(response.files || response);
    } catch (err) {
      console.error('Failed to load files:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file, taskId) => {
    try {
      const { uploadFile: apiUploadFile } = await import('../services/fileService');
      const result = await apiUploadFile(groupId, file, taskId);
      await loadFiles();
      return result;
    } catch (err) {
      console.error('Failed to upload file:', err);
      throw err;
    }
  };

  const deleteFile = async (fileId) => {
    try {
      const { deleteFile: apiDeleteFile } = await import('../services/api');
      await apiDeleteFile(groupId, fileId);
      await loadFiles();
    } catch (err) {
      console.error('Failed to delete file:', err);
      throw err;
    }
  };

  return {
    files,
    loading,
    error,
    loadFiles,
    uploadFile,
    deleteFile,
  };
}
