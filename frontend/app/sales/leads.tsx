import React, { useState, useCallback, useEffect } from 'react';
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

const STATUSES = ['all', 'new', 'contacted', 'interested', 'follow_up', 'won', 'lost'];

export default function LeadsScreen() {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [industries, setIndustries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    api.get('/leads/industries').then(r => setIndustries(r.data || [])).catch(() => {});
  }, []);

  const loadLeads = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (industryFilter !== 'all') params.industry = industryFilter;
      const res = await api.get('/leads', { params });
      setLeads(res.data.leads || []);
    } catch (e) {
      console.error('Failed to load leads', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadLeads(); }, [search, statusFilter, industryFilter]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeads();
    setRefreshing(false);
  };

  const renderLead = ({ item }: { item: any }) => (
    <TouchableOpacity
      testID={`lead-item-${item.id}`}
      style={styles.leadCard}
      onPress={() => router.push(`/lead/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.leadHeader}>
        <View style={styles.leadInfo}>
          <Text style={styles.leadName}>{item.full_name}</Text>
          <Text style={styles.leadPhone}>{item.phone_number}</Text>
        </View>
        <StatusBadge status={item.status} small />
      </View>
      {item.company_name ? (
        <Text style={styles.leadCompany}>{item.company_name}</Text>
      ) : null}
      <View style={styles.leadMeta}>
        {item.industry ? (
          <View style={styles.metaItem}>
            <Ionicons name="business-outline" size={12} color={Colors.accent} />
            <Text style={[styles.metaText, { color: Colors.accent }]}>{item.industry}</Text>
          </View>
        ) : null}
        {item.city ? (
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>{item.city}</Text>
          </View>
        ) : null}
        {item.source ? (
          <View style={styles.metaItem}>
            <Ionicons name="globe-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>{item.source}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          testID="leads-search-input"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search leads..."
          placeholderTextColor={Colors.textMuted}
        />
      </View>
      {/* Status filter */}
      <FlatList
        horizontal
        data={STATUSES}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`filter-${item}`}
            style={[styles.filterChip, statusFilter === item && styles.filterChipActive]}
            onPress={() => setStatusFilter(item)}
          >
            <Text style={[styles.filterText, statusFilter === item && styles.filterTextActive]}>
              {item === 'all' ? 'All' : item.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </Text>
          </TouchableOpacity>
        )}
      />
      {/* Industry filter */}
      {industries.length > 0 && (
        <FlatList
          horizontal
          data={['all', ...industries]}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow2}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, styles.industryChip, industryFilter === item && styles.filterChipActive]}
              onPress={() => setIndustryFilter(item)}
            >
              <Text style={[styles.filterText, industryFilter === item && styles.filterTextActive]}>
                {item === 'all' ? 'All Industries' : item}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item) => item.id}
          renderItem={renderLead}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <EmptyState icon="people-outline" title="No leads found" message="Add a new lead to get started" />
          }
        />
      )}
      <TouchableOpacity
        testID="add-lead-fab"
        style={styles.fab}
        onPress={() => router.push('/add-lead')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, marginBottom: 0, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  filterRow: { minHeight: 36, maxHeight: 44, marginTop: 12 },
  filterRow2: { minHeight: 36, maxHeight: 44, marginTop: 4 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  industryChip: { borderStyle: 'dashed' as any },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 12, fontWeight: '500', color: Colors.textMuted },
  filterTextActive: { color: '#FFFFFF' },
  list: { padding: 16, paddingBottom: 140 },
  leadCard: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 14, marginBottom: 10,
  },
  leadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leadInfo: { flex: 1, marginRight: 8 },
  leadName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  leadPhone: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  leadCompany: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  leadMeta: { flexDirection: 'row', gap: 16, marginTop: 8, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.textMuted },
  fab: {
    position: 'absolute', bottom: 80, right: 16,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    elevation: 4,
  },
});
