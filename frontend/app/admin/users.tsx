import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  RefreshControl, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { Colors } from '@/src/constants/colors';
import api from '@/src/api/client';

const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: onConfirm },
    ]);
  }
};

const showMessage = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function UsersScreen() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadUsers(); }, []));
  const onRefresh = async () => { setRefreshing(true); await loadUsers(); setRefreshing(false); };

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'sales' : 'admin';
    confirmAction(
      'Change Role',
      `Change this user to ${newRole.toUpperCase()}?`,
      async () => {
        setUpdating(userId);
        try {
          await api.patch(`/users/${userId}/role`, { role: newRole });
          await loadUsers();
          showMessage('Success', `Role changed to ${newRole}`);
        } catch (e: any) {
          showMessage('Error', e.response?.data?.detail || 'Failed to update role');
        } finally {
          setUpdating(null);
        }
      }
    );
  };

  const resetPassword = (userId: string, userName: string) => {
    const newPw = Platform.OS === 'web'
      ? window.prompt(`Enter new password for ${userName} (min 6 chars):`)
      : null;

    if (Platform.OS === 'web') {
      if (!newPw) return;
      if (newPw.length < 6) {
        showMessage('Error', 'Password must be at least 6 characters');
        return;
      }
      api.post('/auth/reset-password', { user_id: userId, new_password: newPw })
        .then(() => showMessage('Success', `Password reset for ${userName}`))
        .catch((e: any) => showMessage('Error', e.response?.data?.detail || 'Failed to reset password'));
    } else if (Alert.prompt) {
      Alert.prompt(
        'Reset Password',
        `Enter new password for ${userName}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset', onPress: async (pw?: string) => {
              if (!pw || pw.length < 6) {
                Alert.alert('Error', 'Password must be at least 6 characters');
                return;
              }
              try {
                await api.post('/auth/reset-password', { user_id: userId, new_password: pw });
                Alert.alert('Success', `Password reset for ${userName}`);
              } catch (e: any) {
                Alert.alert('Error', e.response?.data?.detail || 'Failed to reset password');
              }
            }
          }
        ],
        'secure-text'
      );
    }
  };

  const renderUser = ({ item }: { item: any }) => {
    const isSelf = item.id === currentUser?.id;
    return (
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.full_name?.[0]?.toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>
            {item.full_name} {isSelf ? '(You)' : ''}
          </Text>
          <Text style={styles.email}>{item.email}</Text>
          {item.phone ? <Text style={styles.phone}>{item.phone}</Text> : null}
        </View>
        <View style={styles.actions}>
          <View style={[styles.roleBadge, item.role === 'admin' ? styles.adminBadge : styles.salesBadge]}>
            <Text style={[styles.roleText, item.role === 'admin' ? styles.adminText : styles.salesText]}>
              {item.role.toUpperCase()}
            </Text>
          </View>
          {!isSelf && (
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => resetPassword(item.id, item.full_name)}
              >
                <Ionicons name="key-outline" size={16} color={Colors.warning} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => toggleRole(item.id, item.role)}
                disabled={updating === item.id}
              >
                {updating === item.id ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="swap-horizontal" size={18} color={Colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <FlatList
      data={users}
      keyExtractor={i => i.id}
      renderItem={renderUser}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <Text style={styles.header}>{users.length} team members</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 32 },
  header: { fontSize: 13, color: Colors.textMuted, marginBottom: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 14, marginBottom: 8,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: Colors.text },
  email: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  phone: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  actions: { alignItems: 'flex-end', gap: 6 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  adminBadge: { backgroundColor: '#FEF2F2' },
  salesBadge: { backgroundColor: '#ECFDF5' },
  roleText: { fontSize: 10, fontWeight: '700' },
  adminText: { color: '#DC2626' },
  salesText: { color: '#059669' },
  btnRow: { flexDirection: 'row', gap: 6 },
  toggleBtn: {
    padding: 4, borderRadius: 6,
    backgroundColor: Colors.background,
  },
});
