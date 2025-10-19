/**
 * Tasks Screen
 * List view of all tasks with filters
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { fetchTasks } from '../services/api';
import colors, { getStatusColor } from '../utils/colors';

export default function TasksScreen({ navigation }) {
  const { groupId } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    loadTasks();
  }, [groupId]);

  useEffect(() => {
    filterTasks();
  }, [tasks, searchQuery, selectedFilter]);

  const loadTasks = async () => {
    if (!groupId) return;

    try {
      const data = await fetchTasks(groupId);
      setTasks(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterTasks = () => {
    let filtered = [...tasks];

    // Filter by status
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(task => task.status === selectedFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task =>
        task.title?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
      );
    }

    setFilteredTasks(filtered);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTasks();
  }, [groupId]);

  const statusFilters = [
    { key: 'all', label: 'ทั้งหมด', icon: 'apps' },
    { key: 'pending', label: 'รอดำเนินการ', icon: 'time' },
    { key: 'in_progress', label: 'กำลังทำ', icon: 'play' },
    { key: 'completed', label: 'เสร็จสิ้น', icon: 'checkmark-circle' },
    { key: 'overdue', label: 'เลยกำหนด', icon: 'alert-circle' },
  ];

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'รอดำเนินการ',
      in_progress: 'กำลังทำ',
      completed: 'เสร็จสิ้น',
      approved: 'อนุมัติแล้ว',
      submitted: 'ส่งแล้ว',
      overdue: 'เลยกำหนด',
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981',
    };
    return colors[priority?.toLowerCase()] || colors.medium;
  };

  const TaskItem = ({ task }) => (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
    >
      <View style={styles.taskHeader}>
        <View style={styles.taskTitleRow}>
          <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(task.priority) }]} />
          <Text style={styles.taskTitle} numberOfLines={1}>
            {task.title}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>
            {getStatusLabel(task.status)}
          </Text>
        </View>
      </View>

      {task.description && (
        <Text style={styles.taskDescription} numberOfLines={2}>
          {task.description}
        </Text>
      )}

      <View style={styles.taskFooter}>
        <View style={styles.taskMeta}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString('th-TH') : 'ไม่มีกำหนด'}
          </Text>
        </View>
        {task.assignee && (
          <View style={styles.taskMeta}>
            <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText} numberOfLines={1}>
              {task.assignee.name}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const FilterButton = ({ filter }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === filter.key && styles.filterButtonActive,
      ]}
      onPress={() => setSelectedFilter(filter.key)}
    >
      <Ionicons
        name={filter.icon}
        size={16}
        color={selectedFilter === filter.key ? '#fff' : colors.textSecondary}
      />
      <Text
        style={[
          styles.filterText,
          selectedFilter === filter.key && styles.filterTextActive,
        ]}
      >
        {filter.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="ค้นหางาน..."
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <FlatList
        horizontal
        data={statusFilters}
        renderItem={({ item }) => <FilterButton filter={item} />}
        keyExtractor={item => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      />

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        renderItem={({ item }) => <TaskItem task={item} />}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'ไม่พบงานที่ค้นหา' : 'ยังไม่มีงาน'}
            </Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: colors.text,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  taskCard: {
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
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
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
    marginBottom: 12,
    lineHeight: 20,
  },
  taskFooter: {
    flexDirection: 'row',
    gap: 16,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
