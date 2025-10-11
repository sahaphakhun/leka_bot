import { useState, useEffect } from 'react';

export function useRecurringTasks(groupId) {
  const [recurringTasks, setRecurringTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (groupId) {
      loadRecurringTasks();
    }
  }, [groupId]);

  const loadRecurringTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const { getRecurringTasks } = await import('../services/recurringService');
      const tasks = await getRecurringTasks(groupId);
      setRecurringTasks(tasks);
    } catch (err) {
      console.error('Failed to load recurring tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createRecurringTask = async (taskData) => {
    try {
      const { createRecurringTask: apiCreate } = await import('../services/recurringService');
      await apiCreate(groupId, taskData);
      await loadRecurringTasks();
    } catch (err) {
      console.error('Failed to create recurring task:', err);
      throw err;
    }
  };

  const updateRecurringTask = async (taskId, taskData) => {
    try {
      const { updateRecurringTask: apiUpdate } = await import('../services/recurringService');
      await apiUpdate(groupId, taskId, taskData);
      await loadRecurringTasks();
    } catch (err) {
      console.error('Failed to update recurring task:', err);
      throw err;
    }
  };

  const deleteRecurringTask = async (taskId) => {
    try {
      const { deleteRecurringTask: apiDelete } = await import('../services/recurringService');
      await apiDelete(groupId, taskId);
      await loadRecurringTasks();
    } catch (err) {
      console.error('Failed to delete recurring task:', err);
      throw err;
    }
  };

  const toggleRecurringTask = async (taskId, enabled) => {
    try {
      const { toggleRecurringTask: apiToggle } = await import('../services/recurringService');
      await apiToggle(groupId, taskId, enabled);
      await loadRecurringTasks();
    } catch (err) {
      console.error('Failed to toggle recurring task:', err);
      throw err;
    }
  };

  return {
    recurringTasks,
    loading,
    error,
    loadRecurringTasks,
    createRecurringTask,
    updateRecurringTask,
    deleteRecurringTask,
    toggleRecurringTask,
  };
}
