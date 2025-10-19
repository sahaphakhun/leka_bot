/**
 * Members Screen
 * List of group members with stats
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getGroupMembers } from '../services/api';
import colors from '../utils/colors';

export default function MembersScreen({ navigation }) {
  const { groupId } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [groupId]);

  const loadMembers = async () => {
    if (!groupId) return;

    try {
      const data = await getGroupMembers(groupId);
      setMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMembers();
  }, [groupId]);

  const MemberCard = ({ member }) => (
    <View style={styles.memberCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(member.displayName || member.name || 'U')[0].toUpperCase()}
        </Text>
      </View>

      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.displayName || member.name || 'Unknown'}</Text>
        <View style={styles.memberMeta}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={styles.metaText}>
            {member.completedTasks || 0} งานสำเร็จ
          </Text>
        </View>
      </View>

      {member.role && (
        <View style={[styles.roleBadge, member.role === 'admin' && styles.adminBadge]}>
          <Text style={[styles.roleText, member.role === 'admin' && styles.adminText]}>
            {member.role === 'admin' ? 'แอดมิน' : 'สมาชิก'}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.header}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{members.length}</Text>
          <Text style={styles.statLabel}>สมาชิกทั้งหมด</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {members.filter(m => m.role === 'admin').length}
          </Text>
          <Text style={styles.statLabel}>แอดมิน</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {members.filter(m => m.isActive).length || members.length}
          </Text>
          <Text style={styles.statLabel}>ออนไลน์</Text>
        </View>
      </View>

      {/* Members List */}
      <FlatList
        data={members}
        renderItem={({ item }) => <MemberCard member={item} />}
        keyExtractor={(item, index) => item.lineUserId || item.id || index.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>ไม่มีสมาชิก</Text>
          </View>
        }
      />

      {/* Leaderboard Button */}
      <TouchableOpacity
        style={styles.leaderboardButton}
        onPress={() => navigation.navigate('Leaderboard')}
      >
        <Ionicons name="trophy" size={20} color="#fff" />
        <Text style={styles.leaderboardButtonText}>กระดานผู้นำ</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  header: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
  },
  listContainer: {
    padding: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.backgroundGray,
  },
  adminBadge: {
    backgroundColor: colors.warning + '20',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  adminText: {
    color: colors.warning,
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
  leaderboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  leaderboardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
