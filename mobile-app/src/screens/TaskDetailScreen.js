/**
 * Task Detail Screen
 * Detailed view of a single task with actions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getTask, updateTask, submitTask, approveTask } from '../services/api';
import colors, { getStatusColor, getPriorityColor } from '../utils/colors';

export default function TaskDetailScreen({ route, navigation }) {
  const { taskId } = route.params;
  const { groupId, user } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    if (!groupId || !taskId) return;

    try {
      const data = await getTask(groupId, taskId);
      setTask(data?.data || data);
    } catch (error) {
      console.error('Error loading task:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลงานได้');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    Alert.alert(
      'ส่งงาน',
      'คุณต้องการส่งงานนี้หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ส่ง',
          onPress: async () => {
            try {
              await submitTask(groupId, taskId, {});
              Alert.alert('สำเร็จ', 'ส่งงานเรียบร้อยแล้ว');
              loadTask();
            } catch (error) {
              Alert.alert('ข้อผิดพลาด', error.message);
            }
          },
        },
      ]
    );
  };

  const handleApprove = async () => {
    Alert.alert(
      'อนุมัติงาน',
      'คุณต้องการอนุมัติงานนี้หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'อนุมัติ',
          onPress: async () => {
            try {
              await approveTask(groupId, taskId);
              Alert.alert('สำเร็จ', 'อนุมัติงานเรียบร้อยแล้ว');
              loadTask();
            } catch (error) {
              Alert.alert('ข้อผิดพลาด', error.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>ไม่พบข้อมูลงาน</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>
                {task.status}
              </Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) + '20' }]}>
              <Text style={[styles.priorityText, { color: getPriorityColor(task.priority) }]}>
                {task.priority}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{task.title}</Text>

          {task.description && (
            <Text style={styles.description}>{task.description}</Text>
          )}
        </View>

        {/* Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>รายละเอียด</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>วันที่กำหนดส่ง</Text>
              <Text style={styles.detailValue}>
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }) : 'ไม่มีกำหนด'}
              </Text>
            </View>
          </View>

          {task.assignee && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="person-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>ผู้รับผิดชอบ</Text>
                <Text style={styles.detailValue}>{task.assignee.name}</Text>
              </View>
            </View>
          )}

          {task.createdByUser && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="person-add-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>ผู้สร้าง</Text>
                <Text style={styles.detailValue}>
                  {task.createdByUser.displayName || task.createdByUser.name}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>สร้างเมื่อ</Text>
              <Text style={styles.detailValue}>
                {task.createdAt ? new Date(task.createdAt).toLocaleDateString('th-TH') : '-'}
              </Text>
            </View>
          </View>
        </View>

        {/* Files Card */}
        {task.files && task.files.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>ไฟล์แนบ ({task.files.length})</Text>
            {task.files.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                <Ionicons name="document-outline" size={24} color={colors.primary} />
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name || 'ไฟล์ ' + (index + 1)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {task.status === 'pending' && (
          <TouchableOpacity style={[styles.actionButton, styles.submitButton]} onPress={handleSubmit}>
            <Text style={styles.actionButtonText}>ส่งงาน</Text>
          </TouchableOpacity>
        )}
        {task.status === 'submitted' && (
          <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={handleApprove}>
            <Text style={styles.actionButtonText}>อนุมัติ</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  headerCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.backgroundGray,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  actions: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  actionButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
