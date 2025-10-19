/**
 * Login Screen
 * Handles LINE Login and manual group/user entry for testing
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import colors from '../utils/colors';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [userId, setUserId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!userId.trim() || !groupId.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอก User ID และ Group ID');
      return;
    }

    setLoading(true);
    try {
      // In production, this would be LINE login
      // For now, we'll use direct credentials
      const userData = {
        id: userId.trim(),
        displayName: 'User ' + userId.trim().slice(0, 8),
        pictureUrl: null,
      };

      await login(userData, groupId.trim());
      // Navigation is handled automatically by AuthContext change
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleLINELogin = () => {
    Alert.alert(
      'LINE Login',
      'LINE Login will be implemented in production version',
      [{ text: 'OK' }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.gradient}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>🤖</Text>
            </View>
            <Text style={styles.title}>Leka Bot</Text>
            <Text style={styles.subtitle}>Task Management System</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>เข้าสู่ระบบ</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>User ID</Text>
                <TextInput
                  style={styles.input}
                  placeholder="กรอก LINE User ID"
                  placeholderTextColor={colors.textLight}
                  value={userId}
                  onChangeText={setUserId}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Group ID</Text>
                <TextInput
                  style={styles.input}
                  placeholder="กรอก LINE Group ID"
                  placeholderTextColor={colors.textLight}
                  value={groupId}
                  onChangeText={setGroupId}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>เข้าสู่ระบบ</Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>หรือ</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.lineButton}
                onPress={handleLINELogin}
              >
                <Text style={styles.lineButtonText}>
                  🟢 เข้าสู่ระบบด้วย LINE
                </Text>
              </TouchableOpacity>

              <Text style={styles.helpText}>
                สำหรับการทดสอบ กรุณากรอก User ID และ Group ID โดยตรง
              </Text>
            </View>
          </View>
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  gradient: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.backgroundDark,
  },
  button: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: colors.textSecondary,
    fontSize: 14,
  },
  lineButton: {
    height: 50,
    backgroundColor: '#00B900',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    marginTop: 16,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
