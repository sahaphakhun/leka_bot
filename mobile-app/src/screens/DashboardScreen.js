/**
 * Dashboard Screen
 * Main dashboard with stats, recent tasks, and quick actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getGroupStats, fetchTasks, getLeaderboard } from '../services/api';
import colors from '../utils/colors';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const { groupId, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [topMembers, setTopMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [groupId]);

  const loadDashboardData = async () => {
    if (!groupId) return;

    try {
      const [statsData, tasksData, leaderboardData] = await Promise.all([
        getGroupStats(groupId),
        fetchTasks(groupId, { limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
        getLeaderboard(groupId, { limit: 3 }),
      ]);

      setStats(statsData);
      setRecentTasks(Array.isArray(tasksData) ? tasksData : tasksData?.data || []);
      setTopMembers(Array.isArray(leaderboardData) ? leaderboardData : leaderboardData?.data || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [groupId]);

  const StatCard = ({ icon, label, value, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value || 0}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  const TaskItem = ({ task }) => {
    const statusColors = {
      pending: colors.pending,
      in_progress: colors.inProgress,
      completed: colors.completed,
      overdue: colors.overdue,
    };

    const statusLabels = {
      pending: 'รอดำเนินการ',
      in_progress: 'กำลังทำ',
      completed: 'เสร็จสิ้น',
      overdue: 'เลยกำหนด',
    };

    return (
      <TouchableOpacity
        style={styles.taskItem}
        onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
      >
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle} numberOfLines={1}>
            {task.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[task.status] + '20' }]}>
            <Text style={[styles.statusText, { color: statusColors[task.status] }]}>
              {statusLabels[task.status]}
            </Text>
          </View>
        </View>
        {task.description && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {task.description}
          </Text>
        )}
        <View style={styles.taskFooter}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.taskDate}>
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString('th-TH') : 'ไม่มีกำหนด'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>กำลังโหลด...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>สวัสดี!</Text>
          <Text style={styles.userName}>{user?.displayName || 'ผู้ใช้งาน'}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Activity')}>
          <Ionicons name="notifications-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="checkbox-outline"
          label="งานทั้งหมด"
          value={stats?.totalTasks}
          color={colors.info}
        />
        <StatCard
          icon="checkmark-circle-outline"
          label="เสร็จสิ้น"
          value={stats?.completedTasks}
          color={colors.success}
        />
        <StatCard
          icon="time-outline"
          label="กำลังทำ"
          value={stats?.inProgressTasks}
          color={colors.warning}
        />
        <StatCard
          icon="alert-circle-outline"
          label="เลยกำหนด"
          value={stats?.overdueTasks}
          color={colors.error}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>เมนูด่วน</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Tasks')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="add-circle" size={32} color={colors.primary} />
            </View>
            <Text style={styles.actionLabel}>สร้างงาน</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Leaderboard')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="trophy" size={32} color={colors.warning} />
            </View>
            <Text style={styles.actionLabel}>กระดานผู้นำ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Files')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="cloud-upload" size={32} color={colors.success} />
            </View>
            <Text style={styles.actionLabel}>อัปโหลด</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Members')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="people" size={32} color={colors.error} />
            </View>
            <Text style={styles.actionLabel}>สมาชิก</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Tasks */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>งานล่าสุด</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
            <Text style={styles.seeAll}>ดูทั้งหมด</Text>
          </TouchableOpacity>
        </View>
        {recentTasks.length > 0 ? (
          recentTasks.map((task) => <TaskItem key={task.id} task={task} />)
        ) : (
          <Text style={styles.emptyText}>ไม่มีงาน</Text>
        )}
      </View>

      {/* Top Members */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>สมาชิกยอดนิยม</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')}>
            <Text style={styles.seeAll}>ดูทั้งหมด</Text>
          </TouchableOpacity>
        </View>
        {topMembers.slice(0, 3).map((member, index) => (
          <View key={member.userId} style={styles.memberItem}>
            <View style={styles.memberRank}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <Text style={styles.memberName}>{member.displayName || member.name}</Text>
            <Text style={styles.memberScore}>{member.totalScore || 0} คะแนน</Text>
          </View>
        ))}
        {topMembers.length === 0 && (
          <Text style={styles.emptyText}>ไม่มีข้อมูล</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: (width - 44) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  seeAll: {
    fontSize: 14,
    color: colors.primary,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
  },
  taskItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  taskDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  memberRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  memberName: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  memberScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    paddingVertical: 20,
  },
});
