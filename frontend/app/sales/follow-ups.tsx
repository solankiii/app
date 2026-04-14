import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import StatusBadge from '@/src/components/StatusBadge';
import EmptyState from '@/src/components/EmptyState';
import api from '@/src/api/client';

const TABS = ['overdue', 'today', 'upcoming'];

export default function FollowUpsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState('today');
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFollowUps = async () => {
    try {
      const res = await api.get('/follow-ups', { params: { tab } });
      setFollowUps(res.data.follow_ups || []);
    } catch (e) {
      console.error('Failed to load follow-ups', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { setLoading(true); loadFollowUps(); }, [tab]));

  const onRefresh = async () => { setRefreshing(true); await loadFollowUps(); setRefreshing(false); };

  const markDone = async (id: string) => {
    try {
      await api.patch(`/follow-ups/${id}/status`, { status: 'done' });
      loadFollowUps();
    } catch (e) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.leadName}>{item.lead_name}</Text>
          <Text style={styles.time}>{formatDate(item.follow_up_at)}</Text>
        </View>
        <StatusBadge status={item.status} small />
      </View>
      <View style={styles.typeRow}>
        <Ionicons
          name={item.follow_up_type === 'call' ? 'call-outline' : item.follow_up_type === 'meeting' ? 'people-outline' : 'chatbubble-outline'}
          size={14} color={Colors.textMuted}
        />
        <Text style={styles.typeText}>{item.follow_up_type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</Text>
      </View>
      {item.note ? <Text style={styles.note} numberOfLines={2}>{item.note}</Text> : null}
      <View style={styles.actions}>
        {item.status === 'pending' && (
          <TouchableOpacity testID={`mark-done-${item.id}`} style={styles.actionBtn} onPress={() => markDone(item.id)}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={[styles.actionText, { color: Colors.success }]}>Done</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          testID={`open-lead-${item.id}`}
          style={styles.actionBtn}
          onPress={() => router.push(`/lead/${item.lead_id}`)}
        >
          <Ionicons name="open-outline" size={16} color={Colors.info} />
          <Text style={[styles.actionText, { color: Colors.info }]}>View Lead</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t}
            testID={`tab-${t}`}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={followUps}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <EmptyState icon="calendar-outline" title={`No ${tab} follow-ups`} message="You're all caught up!" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabBar: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 14, marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: 8 },
  leadName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  time: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  typeText: { fontSize: 12, color: Colors.textMuted },
  note: { fontSize: 13, color: Colors.textMuted, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12, fontWeight: '500' },
});
