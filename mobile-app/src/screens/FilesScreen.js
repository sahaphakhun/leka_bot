/**
 * Files Screen
 * File management with upload capability
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../contexts/AuthContext';
import { getGroupFiles, uploadFile, deleteFile } from '../services/api';
import colors from '../utils/colors';

export default function FilesScreen() {
  const { groupId } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [groupId]);

  const loadFiles = async () => {
    if (!groupId) return;

    try {
      const data = await getGroupFiles(groupId);
      setFiles(data?.data || []);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFiles();
  }, [groupId]);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.type === 'success' || !result.canceled) {
        const file = result.assets ? result.assets[0] : result;
        await handleUploadFile(file);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเลือกไฟล์ได้');
    }
  };

  const handleUploadFile = async (file) => {
    if (!groupId || !file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('attachments', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      });

      await uploadFile(groupId, formData);
      Alert.alert('สำเร็จ', 'อัปโหลดไฟล์เรียบร้อยแล้ว');
      loadFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('ข้อผิดพลาด', error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = (fileId, fileName) => {
    Alert.alert(
      'ลบไฟล์',
      `ต้องการลบไฟล์ "${fileName}" หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFile(fileId);
              Alert.alert('สำเร็จ', 'ลบไฟล์เรียบร้อยแล้ว');
              loadFiles();
            } catch (error) {
              Alert.alert('ข้อผิดพลาด', error.message);
            }
          },
        },
      ]
    );
  };

  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (['pdf'].includes(ext)) return 'document-text';
    if (['doc', 'docx'].includes(ext)) return 'document';
    if (['xls', 'xlsx'].includes(ext)) return 'grid';
    if (['zip', 'rar', '7z'].includes(ext)) return 'archive';
    return 'document-outline';
  };

  const getFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const FileItem = ({ file }) => (
    <View style={styles.fileCard}>
      <View style={styles.fileIcon}>
        <Ionicons name={getFileIcon(file.name)} size={32} color={colors.primary} />
      </View>

      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {file.name || 'Untitled'}
        </Text>
        <View style={styles.fileMeta}>
          <Text style={styles.fileSize}>{getFileSize(file.size)}</Text>
          <Text style={styles.fileDot}>•</Text>
          <Text style={styles.fileDate}>
            {file.createdAt ? new Date(file.createdAt).toLocaleDateString('th-TH') : '-'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteFile(file.id, file.name)}
      >
        <Ionicons name="trash-outline" size={20} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statItem}>
          <Ionicons name="folder-open" size={24} color={colors.primary} />
          <Text style={styles.statValue}>{files.length}</Text>
          <Text style={styles.statLabel}>ไฟล์ทั้งหมด</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Ionicons name="cloud-upload" size={24} color={colors.success} />
          <Text style={styles.statValue}>
            {files.filter(f => new Date(f.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
          </Text>
          <Text style={styles.statLabel}>7 วันล่าสุด</Text>
        </View>
      </View>

      {/* Files List */}
      <FlatList
        data={files}
        renderItem={({ item }) => <FileItem file={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>ยังไม่มีไฟล์</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={handlePickFile}>
              <Text style={styles.uploadButtonText}>อัปโหลดไฟล์แรก</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Upload FAB */}
      {files.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, uploading && styles.fabDisabled]}
          onPress={handlePickFile}
          disabled={uploading}
        >
          <Ionicons name={uploading ? 'cloud-upload' : 'add'} size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  statsHeader: {
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
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
  fileCard: {
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
  fileIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  fileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileSize: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  fileDot: {
    fontSize: 12,
    color: colors.textSecondary,
    marginHorizontal: 8,
  },
  fileDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  deleteButton: {
    padding: 8,
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
    marginBottom: 24,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  fabDisabled: {
    opacity: 0.6,
  },
});
