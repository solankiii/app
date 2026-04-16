import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import StatusBadge from '@/src/components/StatusBadge';
import EmptyState from '@/src/components/EmptyState';
import api from '@/src/api/client';

export default function AdminCalls() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/call-sessions', { params: { limit: 100 } });
      setSessions(res.data.sessions || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => item.lead_id ? router.push(`/lead/${item.lead_id}`) : null}
      activeOpacity={0.7}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={styles.leadName}>{item.lead_name}</Text>
          <Text style={styles.phone}>{item.dialed_number}</Text>
        </View>
        {item.outcome ? <StatusBadge status={item.outcome} small /> : (
          <Text style={styles.pending}>In Progress</Text>
        )}
      </View>
      <View style={styles.cardMeta}>
        <Text style={styles.metaItem}>By: {item.user_name}</Text>
        <Text style={styles.metaItem}>{formatDate(item.call_started_at)}</Text>
        {item.duration_seconds != null && (
          <Text style={styles.metaItem}>{item.duration_seconds}s</Text>
        )}
      </View>
      <View style={styles.cardBottom}>
        <StatusBadge status={item.recording_status || 'pending'} small />
        <View style={styles.goLink}>
          <Text style={styles.goLinkText}>View Lead</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />;

  return (
    <FlatList
      data={sessions} keyExtractor={i => i.id} renderItem={renderItem}
      style={styles.container} contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={<EmptyState icon="call-outline" title="No call sessions" message="No calls have been made yet" />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 14, marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: 8 },
  leadName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  phone: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  pending: { fontSize: 12, color: Colors.warning, fontWeight: '500' },
  cardMeta: { flexDirection: 'row', gap: 16, marginTop: 8 },
  metaItem: { fontSize: 12, color: Colors.textMuted },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  goLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  goLinkText: { fontSize: 12, color: Colors.primary, fontWeight: '500' },
});
