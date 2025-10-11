import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(null); // 'personal' | 'group'

  // Get URL parameters
  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      userId: params.get('userId') || params.get('userid') || params.get('lineUserId'),
      groupId: params.get('groupId') || params.get('groupid'),
      taskId: params.get('taskId') || params.get('taskid'),
      action: params.get('action'),
      view: params.get('view'),
    };
  };

  // Detect view mode from URL
  const detectViewMode = (params) => {
    // ถ้ามี userId → Personal mode (ปลอดภัยเพราะส่งในแชทส่วนตัว)
    if (params.userId) {
      return 'personal';
    }
    
    // ถ้ามีแค่ groupId → Group mode
    if (params.groupId) {
      return 'group';
    }
    
    // ถ้ามีแค่ taskId → ลองโหลดจาก localStorage
    if (params.taskId) {
      const storedGroupId = localStorage.getItem('leka_groupId');
      if (storedGroupId) {
        return 'group';
      }
    }
    
    return null;
  };

  // Initialize auth from URL
  useEffect(() => {
    const params = getUrlParams();
    console.log('🔍 URL Parameters:', params);
    
    // Detect mode
    const mode = detectViewMode(params);
    setViewMode(mode);
    console.log('📍 View Mode:', mode);
    
    // Set userId (only in personal mode)
    if (params.userId) {
      setUserId(params.userId);
      localStorage.setItem('leka_userId', params.userId);
      console.log('👤 User ID:', params.userId);
    } else {
      // Try to get from localStorage (for navigation within app)
      const storedUserId = localStorage.getItem('leka_userId');
      if (storedUserId && mode === 'personal') {
        setUserId(storedUserId);
      }
    }

    // Set groupId (in both modes)
    if (params.groupId) {
      setGroupId(params.groupId);
      localStorage.setItem('leka_groupId', params.groupId);
      console.log('👥 Group ID:', params.groupId);
    } else {
      // Try to get from localStorage
      const storedGroupId = localStorage.getItem('leka_groupId');
      if (storedGroupId) {
        setGroupId(storedGroupId);
      }
    }

    setLoading(false);
  }, []);

  // Update URL when userId or groupId changes
  const updateUrl = (newUserId, newGroupId) => {
    const params = new URLSearchParams(window.location.search);
    
    if (newUserId) {
      params.set('userId', newUserId);
      setUserId(newUserId);
      localStorage.setItem('leka_userId', newUserId);
    }
    
    if (newGroupId) {
      params.set('groupId', newGroupId);
      setGroupId(newGroupId);
      localStorage.setItem('leka_groupId', newGroupId);
    }

    // Update URL without reloading
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  };

  // Set user info
  const setUser = (user) => {
    setCurrentUser(user);
    if (user?.lineUserId) {
      updateUrl(user.lineUserId, groupId);
    }
  };

  // Set group info
  const setGroup = (group) => {
    setCurrentGroup(group);
    if (group?.id) {
      updateUrl(userId, group.id);
    }
  };

  // Logout
  const logout = () => {
    setUserId(null);
    setGroupId(null);
    setCurrentUser(null);
    setCurrentGroup(null);
    localStorage.removeItem('leka_userId');
    localStorage.removeItem('leka_groupId');
    
    // Clear URL params
    window.history.replaceState({}, '', window.location.pathname);
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    // Personal mode: ต้องมี userId + groupId
    if (viewMode === 'personal') {
      return !!(userId && groupId);
    }
    
    // Group mode: ต้องมีแค่ groupId (ไม่ต้องการ userId)
    if (viewMode === 'group') {
      return !!groupId;
    }
    
    // Fallback: ถ้ามี groupId ก็ถือว่า authenticated
    return !!groupId;
  };

  // Check if in personal mode
  const isPersonalMode = () => {
    return viewMode === 'personal' || !!userId;
  };

  // Check if in group mode
  const isGroupMode = () => {
    return viewMode === 'group' || (!userId && !!groupId);
  };

  // Check if user has permission (basic implementation)
  const hasPermission = (permission) => {
    // For now, all authenticated users have all permissions
    // Can be extended based on user roles
    return isAuthenticated();
  };

  const value = {
    userId,
    groupId,
    currentUser,
    currentGroup,
    loading,
    viewMode,
    setUser,
    setGroup,
    updateUrl,
    logout,
    isAuthenticated,
    isPersonalMode,
    isGroupMode,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

