import { useState, useEffect } from 'react';

export function useMembers(groupId) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (groupId) {
      loadMembers();
    }
  }, [groupId]);

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { getGroupMembers } = await import('../services/api');
      const response = await getGroupMembers(groupId);
      setMembers(response.members || response);
    } catch (err) {
      console.error('Failed to load members:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRole = async (memberId, role) => {
    try {
      const { updateMemberRole: apiUpdateRole } = await import('../services/api');
      await apiUpdateRole(groupId, memberId, role);
      await loadMembers();
    } catch (err) {
      console.error('Failed to update member role:', err);
      throw err;
    }
  };

  const removeMember = async (memberId) => {
    try {
      const { removeMember: apiRemoveMember } = await import('../services/api');
      await apiRemoveMember(groupId, memberId);
      await loadMembers();
    } catch (err) {
      console.error('Failed to remove member:', err);
      throw err;
    }
  };

  return {
    members,
    loading,
    error,
    loadMembers,
    updateMemberRole,
    removeMember,
  };
}
