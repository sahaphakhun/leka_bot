/**
 * Profile Screen
 * User profile and settings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, getUserStats } from '../services/api';
import colors from '../utils/colors';

export default function ProfileScreen() {
  const { user, groupId, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [user, groupId]);

  const loadProfile = async () => {
    if (!user?.id || !groupId) return;

    try {
      const [profileData, statsData] = await Promise.all([
        getUserProfile(user.id, groupId),
        getUserStats(user.id, groupId),
      ]);

      setProfile(profileData?.data || profileData);
      setStats(statsData?.data || statsData);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'ออกจากระบบ',
      'คุณต้องการออกจากระบบหรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ออกจากระบบ',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const SettingItem = ({ icon, label, onPress, showArrow = true, color = colors.text }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={[styles.settingIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.settingLabel, { color }]}>{label}</Text>
      {showArrow && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.displayName || 'U')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.displayName || 'ผู้ใช้งาน'}</Text>
        <Text style={styles.userId}>ID: {user?.id?.slice(0, 12) || 'N/A'}</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.totalTasks || 0}</Text>
          <Text style={styles.statLabel}>งานทั้งหมด</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.completedTasks || 0}</Text>
          <Text style={styles.statLabel}>สำเร็จ</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.totalScore || 0}</Text>
          <Text style={styles.statLabel}>คะแนน</Text>
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>การตั้งค่า</Text>
        <View style={styles.card}>
          <SettingItem
            icon="person-outline"
            label="แก้ไขโปรไฟล์"
            onPress={() => Alert.alert('แก้ไขโปรไฟล์', 'ฟีเจอร์นี้จะพร้อมใช้งานเร็วๆ นี้')}
          />
          <SettingItem
            icon="notifications-outline"
            label="การแจ้งเตือน"
            onPress={() => Alert.alert('การแจ้งเตือน', 'ฟีเจอร์นี้จะพร้อมใช้งานเร็วๆ นี้')}
          />
          <SettingItem
            icon="language-outline"
            label="ภาษา"
            onPress={() => Alert.alert('ภาษา', 'ฟีเจอร์นี้จะพร้อมใช้งานเร็วๆ นี้')}
          />
          <SettingItem
            icon="color-palette-outline"
            label="ธีม"
            onPress={() => Alert.alert('ธีม', 'ฟีเจอร์นี้จะพร้อมใช้งานเร็วๆ นี้')}
          />
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>เกี่ยวกับ</Text>
        <View style={styles.card}>
          <SettingItem
            icon="help-circle-outline"
            label="ช่วยเหลือ"
            onPress={() => Alert.alert('ช่วยเหลือ', 'ฟีเจอร์นี้จะพร้อมใช้งานเร็วๆ นี้')}
          />
          <SettingItem
            icon="information-circle-outline"
            label="เกี่ยวกับแอป"
            onPress={() => Alert.alert('Leka Bot Mobile', 'Version 1.0.0\n\nTask Management System')}
          />
          <SettingItem
            icon="document-text-outline"
            label="นโยบายความเป็นส่วนตัว"
            onPress={() => Alert.alert('นโยบายความเป็นส่วนตัว', 'ฟีเจอร์นี้จะพร้อมใช้งานเร็วๆ นี้')}
          />
        </View>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <View style={styles.card}>
          <SettingItem
            icon="log-out-outline"
            label="ออกจากระบบ"
            onPress={handleLogout}
            showArrow={false}
            color={colors.error}
          />
        </View>
      </View>

      {/* Version Info */}
      <Text style={styles.versionText}>Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 40,
    paddingBottom: 32,
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.primary,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userId: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textLight,
    paddingVertical: 20,
  },
});
