import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  ActivityIndicator, TouchableOpacity, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import EmptyState from '@/src/components/EmptyState';
import api from '@/src/api/client';

const minutesUntil = (iso?: string) => {
  if (!iso) return 0;
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000));
};

const fmtDateTime = (iso?: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

const copy = async (text: string) => {
  if (Platform.OS === 'web' && navigator?.clipboard) {
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
  }
  return false;
};

export default function PasswordResets() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await api.get('/admin/pending-resets');
      setItems(res.data.pending || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleCopy = async (otp: string, id: string) => {
    const ok = await copy(otp);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(c => c === id ? null : c), 1500);
    } else if (Platform.OS !== 'web') {
      Alert.alert('OTP', otp);
    } else {
      window.alert(`OTP: ${otp}`);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const minsLeft = minutesUntil(item.expires_at);
    const expired = minsLeft <= 0;
    return (
      <View style={[styles.card, expired && styles.cardExpired]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.email}>{item.email}</Text>
            {item.full_name ? <Text style={styles.name}>{item.full_name}</Text> : null}
            <Text style={styles.meta}>Requested {fmtDateTime(item.created_at)}</Text>
          </View>
          <View style={styles.expiryPill}>
            <Ionicons name="time-outline" size={11} color={expired ? Colors.danger : Colors.textMuted} />
            <Text style={[styles.expiryText, expired && { color: Colors.danger }]}>
              {expired ? 'expired' : `${minsLeft} min`}
            </Text>
          </View>
        </View>
        <View style={styles.otpRow}>
          <Text style={styles.otpLabel}>OTP</Text>
          <Text style={styles.otp}>{item.otp}</Text>
          <TouchableOpacity
            style={[styles.copyBtn, copiedId === item.otp && styles.copyBtnActive]}
            onPress={() => handleCopy(item.otp, item.otp)}
          >
            <Ionicons
              name={copiedId === item.otp ? 'checkmark' : 'copy-outline'}
              size={14}
              color="#FFFFFF"
            />
            <Text style={styles.copyText}>{copiedId === item.otp ? 'Copied' : 'Copy'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={i => i.email + i.created_at}
      renderItem={renderItem}
      style={styles.container}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <View style={styles.notice}>
          <Ionicons name="information-circle" size={16} color={Colors.info} />
          <Text style={styles.noticeText}>
            When a user requests a password reset, the OTP appears here. Share
            it with them on WhatsApp/Slack and they enter it on the reset
            screen. OTPs expire in 10 minutes.
          </Text>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="key-outline"
          title="No pending resets"
          message="When a user clicks Forgot Password, their OTP will show up here for you to share."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 32 },
  notice: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: Colors.infoBg, padding: 12, borderRadius: 8, marginBottom: 12,
  },
  noticeText: { color: Colors.info, fontSize: 12, flex: 1, lineHeight: 17 },
  card: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 14, marginBottom: 10,
  },
  cardExpired: { opacity: 0.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  email: { fontSize: 14, fontWeight: '700', color: Colors.text },
  name: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  meta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  expiryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.background, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  expiryText: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  otpRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  otpLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  otp: {
    flex: 1, fontSize: 22, fontWeight: '700', color: Colors.text,
    letterSpacing: 4, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
  },
  copyBtnActive: { backgroundColor: Colors.success },
  copyText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});
