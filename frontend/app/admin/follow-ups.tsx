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

export default function AdminFollowUps() {
  const router = useRouter();
  const [tab, setTab] = useState('today');
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/follow-ups', { params: { tab } });
      setFollowUps(res.data.follow_ups || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [tab]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Assigned: {item.assigned_name}</Text>
        <Text style={styles.metaText}>Type: {item.follow_up_type}</Text>
      </View>
      {item.note ? <Text style={styles.note} numberOfLines={2}>{item.note}</Text> : null}
      <TouchableOpacity
        testID={`admin-view-lead-${item.id}`}
        style={styles.viewBtn}
        onPress={() => router.push(`/lead/${item.lead_id}`)}
      >
        <Text style={styles.viewText}>View Lead</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.info} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t} testID={`admin-tab-${t}`}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={followUps} keyExtractor={i => i.id} renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<EmptyState icon="calendar-outline" title={`No ${tab} follow-ups`} message="Nothing here" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
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
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  metaText: { fontSize: 12, color: Colors.textMuted },
  note: { fontSize: 13, color: Colors.textMuted, marginTop: 6 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  viewText: { fontSize: 13, fontWeight: '500', color: Colors.info },
});
