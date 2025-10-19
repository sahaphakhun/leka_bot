/**
 * Leaderboard Screen
 * Ranking of members by score
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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { getLeaderboard } from '../services/api';
import colors from '../utils/colors';

export default function LeaderboardScreen() {
  const { groupId } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, [groupId]);

  const loadLeaderboard = async () => {
    if (!groupId) return;

    try {
      const data = await getLeaderboard(groupId);
      setLeaderboard(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadLeaderboard();
  }, [groupId]);

  const getMedalIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const getMedalColor = (rank) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return colors.textLight;
  };

  const TopThree = ({ members }) => {
    if (members.length === 0) return null;

    const positions = [
      { member: members[1], rank: 2, height: 140 },
      { member: members[0], rank: 1, height: 180 },
      { member: members[2], rank: 3, height: 120 },
    ].filter(p => p.member);

    return (
      <View style={styles.podium}>
        {positions.map((position) => (
          <View key={position.rank} style={[styles.podiumItem, { height: position.height }]}>
            <View style={styles.crownContainer}>
              {position.rank === 1 && <Text style={styles.crown}>👑</Text>}
            </View>
            <View style={[styles.podiumAvatar, { borderColor: getMedalColor(position.rank) }]}>
              <Text style={styles.podiumAvatarText}>
                {(position.member.displayName || position.member.name || 'U')[0].toUpperCase()}
              </Text>
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>
              {position.member.displayName || position.member.name}
            </Text>
            <Text style={styles.podiumScore}>
              {position.member.totalScore || 0} คะแนน
            </Text>
            <View style={[styles.podiumBase, { backgroundColor: getMedalColor(position.rank) }]}>
              <Text style={styles.podiumRank}>{getMedalIcon(position.rank)}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const LeaderboardItem = ({ item, index }) => {
    const rank = index + 1;
    const medal = getMedalIcon(rank);

    return (
      <View style={styles.listItem}>
        <View style={[styles.rankBadge, { backgroundColor: getMedalColor(rank) + '20' }]}>
          <Text style={[styles.rankText, { color: getMedalColor(rank) }]}>
            {medal || rank}
          </Text>
        </View>

        <View style={styles.listAvatar}>
          <Text style={styles.listAvatarText}>
            {(item.displayName || item.name || 'U')[0].toUpperCase()}
          </Text>
        </View>

        <View style={styles.listInfo}>
          <Text style={styles.listName}>{item.displayName || item.name || 'Unknown'}</Text>
          <Text style={styles.listStats}>
            {item.completedTasks || 0} งานสำเร็จ
          </Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreValue}>{item.totalScore || 0}</Text>
          <Text style={styles.scoreLabel}>คะแนน</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>กระดานผู้นำ</Text>
        <Text style={styles.headerSubtitle}>ผู้ทำงานยอดเยี่ยม</Text>
      </LinearGradient>

      <FlatList
        data={leaderboard}
        renderItem={({ item, index }) => <LeaderboardItem item={item} index={index} />}
        keyExtractor={(item, index) => item.userId || item.lineUserId || index.toString()}
        ListHeaderComponent={<TopThree members={leaderboard.slice(0, 3)} />}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>ยังไม่มีข้อมูล</Text>
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
  header: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 16,
  },
  podiumItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  crownContainer: {
    height: 30,
    justifyContent: 'center',
  },
  crown: {
    fontSize: 24,
  },
  podiumAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  podiumAvatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  podiumName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  podiumScore: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  podiumBase: {
    width: '100%',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  podiumRank: {
    fontSize: 24,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  listItem: {
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
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  listStats: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  scoreLabel: {
    fontSize: 11,
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
});
