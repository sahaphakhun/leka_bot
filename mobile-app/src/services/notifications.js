/**
 * Push Notifications Service
 * Handles expo notifications setup and management
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications
 * @returns {Promise<string|null>} Expo Push Token
 */
export async function registerForPushNotifications() {
  let token = null;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Expo Push Token:', token);

    // Store token locally
    await AsyncStorage.setItem('expo_push_token', token);
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  // Android specific configuration
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
    });
  }

  return token;
}

/**
 * Schedule a local notification
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data
 * @param {number} seconds - Delay in seconds
 */
export async function scheduleLocalNotification(title, body, data = {}, seconds = 0) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: seconds > 0 ? { seconds } : null,
  });
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get notification badge count
 */
export async function getBadgeCount() {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set notification badge count
 * @param {number} count
 */
export async function setBadgeCount(count) {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear notification badge
 */
export async function clearBadge() {
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Add notification received listener
 * @param {Function} callback
 */
export function addNotificationReceivedListener(callback) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 * @param {Function} callback
 */
export function addNotificationResponseListener(callback) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Send task reminder notification
 * @param {Object} task - Task object
 */
export async function sendTaskReminder(task) {
  await scheduleLocalNotification(
    'แจ้งเตือนงาน',
    `งาน "${task.title}" ใกล้ถึงกำหนดส่ง`,
    { taskId: task.id, type: 'task_reminder' },
    0
  );
}

/**
 * Send task deadline notification
 * @param {Object} task - Task object
 */
export async function sendTaskDeadline(task) {
  await scheduleLocalNotification(
    'งานเลยกำหนด!',
    `งาน "${task.title}" เลยกำหนดส่งแล้ว`,
    { taskId: task.id, type: 'task_deadline' },
    0
  );
}

/**
 * Send task approved notification
 * @param {Object} task - Task object
 */
export async function sendTaskApproved(task) {
  await scheduleLocalNotification(
    'งานได้รับการอนุมัติ ✅',
    `งาน "${task.title}" ได้รับการอนุมัติแล้ว`,
    { taskId: task.id, type: 'task_approved' },
    0
  );
}

/**
 * Send new task assigned notification
 * @param {Object} task - Task object
 */
export async function sendTaskAssigned(task) {
  await scheduleLocalNotification(
    'งานใหม่ 📋',
    `คุณได้รับมอบหมายงาน "${task.title}"`,
    { taskId: task.id, type: 'task_assigned' },
    0
  );
}

export default {
  registerForPushNotifications,
  scheduleLocalNotification,
  cancelAllNotifications,
  getBadgeCount,
  setBadgeCount,
  clearBadge,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  sendTaskReminder,
  sendTaskDeadline,
  sendTaskApproved,
  sendTaskAssigned,
};
