import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import StatusBadge from '@/src/components/StatusBadge';
import EmptyState from '@/src/components/EmptyState';
import api from '@/src/api/client';

export default function AdminLeads() {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLeads = async () => {
    try {
      const params: any = { limit: 100 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/leads', { params });
      setLeads(res.data.leads || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadLeads(); }, [search, statusFilter]));
  const onRefresh = async () => { setRefreshing(true); await loadLeads(); setRefreshing(false); };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      testID={`admin-lead-${item.id}`}
      style={styles.row}
      onPress={() => router.push(`/lead/${item.id}`)}
    >
      <View style={styles.rowMain}>
        <Text style={styles.name}>{item.full_name}</Text>
        <Text style={styles.phone}>{item.phone_number}</Text>
      </View>
      <View style={styles.rowMeta}>
        <StatusBadge status={item.status} small />
        <Text style={styles.assigned}>{item.assigned_name || 'Unassigned'}</Text>
        <Text style={styles.source}>{item.source}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          testID="admin-leads-search"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search all leads..."
          placeholderTextColor={Colors.textMuted}
        />
      </View>
      <FlatList
        horizontal data={['all', 'new', 'contacted', 'interested', 'follow_up', 'won', 'lost']}
        keyExtractor={i => i} showsHorizontalScrollIndicator={false}
        style={styles.filterRow} contentContainerStyle={styles.filterContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, statusFilter === item && styles.chipActive]}
            onPress={() => setStatusFilter(item)}
          >
            <Text style={[styles.chipText, statusFilter === item && styles.chipTextActive]}>
              {item === 'all' ? 'All' : item.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </Text>
          </TouchableOpacity>
        )}
      />
      {loading ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={leads} keyExtractor={i => i.id} renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<EmptyState icon="people-outline" title="No leads" message="No leads match the criteria" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, marginBottom: 0,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  filterRow: { maxHeight: 44, marginTop: 12 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '500', color: Colors.textMuted },
  chipTextActive: { color: '#FFFFFF' },
  list: { padding: 16, paddingBottom: 32 },
  row: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 14, marginBottom: 8,
  },
  rowMain: { marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.text },
  phone: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  assigned: { fontSize: 12, color: Colors.textMuted },
  source: { fontSize: 12, color: Colors.textMuted },
});
