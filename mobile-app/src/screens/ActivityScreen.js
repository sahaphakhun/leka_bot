/**
 * Activity Screen
 * Activity logs and notifications
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getActivityLogs } from '../services/api';
import colors from '../utils/colors';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function ActivityScreen() {
  const { groupId } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [groupId]);

  const loadActivities = async () => {
    if (!groupId) return;

    try {
      const data = await getActivityLogs(groupId, { limit: 50 });
      setActivities(data?.logs || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadActivities();
  }, [groupId]);

  const getActionIcon = (action) => {
    if (action.includes('created')) return 'add-circle';
    if (action.includes('updated')) return 'create';
    if (action.includes('deleted')) return 'trash';
    if (action.includes('approved')) return 'checkmark-circle';
    if (action.includes('submitted')) return 'paper-plane';
    if (action.includes('uploaded')) return 'cloud-upload';
    return 'information-circle';
  };

  const getActionColor = (action) => {
    if (action.includes('created')) return colors.success;
    if (action.includes('updated')) return colors.info;
    if (action.includes('deleted')) return colors.error;
    if (action.includes('approved')) return colors.success;
    if (action.includes('submitted')) return colors.primary;
    if (action.includes('uploaded')) return colors.warning;
    return colors.textSecondary;
  };

  const getActionLabel = (action) => {
    const labels = {
      'task.created': 'สร้างงาน',
      'task.updated': 'แก้ไขงาน',
      'task.deleted': 'ลบงาน',
      'task.submitted': 'ส่งงาน',
      'task.approved': 'อนุมัติงาน',
      'file.uploaded': 'อัปโหลดไฟล์',
      'file.deleted': 'ลบไฟล์',
      'member.added': 'เพิ่มสมาชิก',
      'member.removed': 'ลบสมาชิก',
    };
    return labels[action] || action;
  };

  const ActivityItem = ({ activity }) => (
    <View style={styles.activityCard}>
      <View style={[styles.iconContainer, { backgroundColor: getActionColor(activity.action) + '20' }]}>
        <Ionicons name={getActionIcon(activity.action)} size={24} color={getActionColor(activity.action)} />
      </View>

      <View style={styles.activityContent}>
        <Text style={styles.activityAction}>{getActionLabel(activity.action)}</Text>
        <Text style={styles.activityUser}>
          {activity.user?.displayName || activity.user?.name || 'Unknown'}
        </Text>
        {activity.details && (
          <Text style={styles.activityDetails} numberOfLines={2}>
            {JSON.stringify(activity.details)}
          </Text>
        )}
        <Text style={styles.activityTime}>
          {activity.createdAt ? format(new Date(activity.createdAt), 'dd MMM yyyy HH:mm', { locale: th }) : '-'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={activities}
        renderItem={({ item }) => <ActivityItem activity={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>ยังไม่มีกิจกรรม</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  listContainer: {
    padding: 16,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  activityUser: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  activityDetails: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 8,
  },
  activityTime: {
    fontSize: 11,
    color: colors.textLight,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
});
