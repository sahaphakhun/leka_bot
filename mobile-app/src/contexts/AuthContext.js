/**
 * Authentication Context
 * Manages user authentication state and LINE login
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load stored auth data on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedUserId, storedGroupId, storedUserData] = await Promise.all([
        AsyncStorage.getItem('leka_userId'),
        AsyncStorage.getItem('leka_groupId'),
        AsyncStorage.getItem('leka_userData'),
      ]);

      if (storedUserId && storedGroupId) {
        setUser(storedUserData ? JSON.parse(storedUserData) : { id: storedUserId });
        setGroupId(storedGroupId);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (userData, userGroupId) => {
    try {
      await Promise.all([
        AsyncStorage.setItem('leka_userId', userData.id),
        AsyncStorage.setItem('leka_groupId', userGroupId),
        AsyncStorage.setItem('leka_userData', JSON.stringify(userData)),
      ]);

      setUser(userData);
      setGroupId(userGroupId);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error saving auth data:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem('leka_userId'),
        AsyncStorage.removeItem('leka_groupId'),
        AsyncStorage.removeItem('leka_userData'),
        AsyncStorage.removeItem('auth_token'),
      ]);

      setUser(null);
      setGroupId(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const updateUser = async (userData) => {
    try {
      await AsyncStorage.setItem('leka_userData', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Error updating user data:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        groupId,
        loading,
        isAuthenticated,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
