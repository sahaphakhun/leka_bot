/**
 * Color palette for Leka Bot Mobile
 */

export const colors = {
  // Primary colors
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  primaryLight: '#60a5fa',

  // Background colors
  background: '#ffffff',
  backgroundDark: '#f8fafc',
  backgroundGray: '#f1f5f9',

  // Text colors
  text: '#1e293b',
  textSecondary: '#64748b',
  textLight: '#94a3b8',

  // Status colors
  success: '#10b981',
  successLight: '#d1fae5',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  error: '#ef4444',
  errorLight: '#fee2e2',
  info: '#3b82f6',
  infoLight: '#dbeafe',

  // Task status colors
  pending: '#94a3b8',
  inProgress: '#3b82f6',
  completed: '#10b981',
  overdue: '#ef4444',

  // Priority colors
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',

  // UI elements
  border: '#e2e8f0',
  borderDark: '#cbd5e1',
  divider: '#f1f5f9',
  shadow: '#00000010',

  // Dark mode colors
  dark: {
    background: '#0f172a',
    backgroundLight: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#334155',
  },
};

export const getStatusColor = (status) => {
  const statusMap = {
    pending: colors.pending,
    in_progress: colors.inProgress,
    completed: colors.completed,
    approved: colors.completed,
    submitted: colors.info,
    overdue: colors.overdue,
    cancelled: colors.textLight,
  };
  return statusMap[status] || colors.textLight;
};

export const getPriorityColor = (priority) => {
  const priorityMap = {
    high: colors.high,
    medium: colors.medium,
    low: colors.low,
  };
  return priorityMap[priority?.toLowerCase()] || colors.medium;
};

export default colors;
