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

  // Get URL parameters
  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      userId: params.get('userId') || params.get('userid'),
      groupId: params.get('groupId') || params.get('groupid'),
    };
  };

  // Initialize auth from URL
  useEffect(() => {
    const params = getUrlParams();
    
    // Set userId and groupId from URL
    if (params.userId) {
      setUserId(params.userId);
      localStorage.setItem('leka_userId', params.userId);
    } else {
      // Try to get from localStorage
      const storedUserId = localStorage.getItem('leka_userId');
      if (storedUserId) {
        setUserId(storedUserId);
      }
    }

    if (params.groupId) {
      setGroupId(params.groupId);
      localStorage.setItem('leka_groupId', params.groupId);
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
    return !!(userId && groupId);
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
    setUser,
    setGroup,
    updateUrl,
    logout,
    isAuthenticated,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

