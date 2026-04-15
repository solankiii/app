import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, RefreshControl, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import StatusBadge from '@/src/components/StatusBadge';
import EmptyState from '@/src/components/EmptyState';
import api from '@/src/api/client';

const STATUSES = ['all', 'new', 'contacted', 'interested', 'follow_up', 'won', 'lost'];

export default function AdminLeads() {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [industries, setIndustries] = useState<string[]>([]);
  const [salesUsers, setSalesUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Bulk assign
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    api.get('/leads/industries').then(r => setIndustries(r.data || [])).catch(() => {});
    api.get('/users/sales').then(r => setSalesUsers(r.data || [])).catch(() => {});
  }, []);

  const loadLeads = async () => {
    try {
      const params: any = { limit: 200 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (industryFilter !== 'all') params.industry = industryFilter;
      const res = await api.get('/leads', { params });
      setLeads(res.data.leads || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadLeads(); }, [search, statusFilter, industryFilter]));
  const onRefresh = async () => { setRefreshing(true); await loadLeads(); setRefreshing(false); };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === leads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leads.map(l => l.id)));
    }
  };

  const bulkAssign = (userId: string, userName: string) => {
    Alert.alert('Bulk Assign', `Assign ${selected.size} leads to ${userName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Assign', onPress: async () => {
          setAssigning(true);
          try {
            await api.post('/leads/bulk-assign', {
              lead_ids: Array.from(selected),
              assigned_to: userId,
            });
            Alert.alert('Done', `${selected.size} leads assigned to ${userName}`);
            setSelected(new Set());
            setSelectMode(false);
            loadLeads();
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.detail || 'Assign failed');
          } finally {
            setAssigning(false);
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.row, selectMode && selected.has(item.id) && styles.rowSelected]}
      onPress={() => selectMode ? toggleSelect(item.id) : router.push(`/lead/${item.id}`)}
      onLongPress={() => {
        if (!selectMode) {
          setSelectMode(true);
          setSelected(new Set([item.id]));
        }
      }}
    >
      {selectMode && (
        <Ionicons
          name={selected.has(item.id) ? 'checkbox' : 'square-outline'}
          size={22}
          color={selected.has(item.id) ? Colors.primary : Colors.textMuted}
          style={{ marginRight: 10 }}
        />
      )}
      <View style={{ flex: 1 }}>
        <View style={styles.rowMain}>
          <Text style={styles.name}>{item.full_name}</Text>
          <Text style={styles.phone}>{item.phone_number}</Text>
        </View>
        <View style={styles.rowMeta}>
          <StatusBadge status={item.status} small />
          {item.industry ? <Text style={styles.industry}>{item.industry}</Text> : null}
          <Text style={styles.assigned}>{item.assigned_name || 'Unassigned'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search leads..."
          placeholderTextColor={Colors.textMuted}
        />
        <TouchableOpacity onPress={() => { setSelectMode(!selectMode); setSelected(new Set()); }}>
          <Ionicons name={selectMode ? 'close' : 'checkbox-outline'} size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Status filters */}
      <FlatList
        horizontal data={STATUSES} keyExtractor={i => i}
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow} contentContainerStyle={styles.filterContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, statusFilter === item && styles.chipActive]}
            onPress={() => setStatusFilter(item)}
          >
            <Text style={[styles.chipText, statusFilter === item && styles.chipTextActive]}>
              {item === 'all' ? 'All Status' : item.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Industry filters */}
      {industries.length > 0 && (
        <FlatList
          horizontal data={['all', ...industries]} keyExtractor={i => i}
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow2} contentContainerStyle={styles.filterContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, styles.industryChip, industryFilter === item && styles.chipActive]}
              onPress={() => setIndustryFilter(item)}
            >
              <Text style={[styles.chipText, industryFilter === item && styles.chipTextActive]}>
                {item === 'all' ? 'All Industries' : item}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Bulk assign bar */}
      {selectMode && selected.size > 0 && (
        <View style={styles.bulkBar}>
          <TouchableOpacity onPress={selectAll} style={styles.selectAllBtn}>
            <Ionicons name="checkmark-done" size={16} color={Colors.primary} />
            <Text style={styles.selectAllText}>
              {selected.size === leads.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.bulkCount}>{selected.size} selected</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={styles.assignRow}>
              {salesUsers.map(u => (
                <TouchableOpacity
                  key={u.id} style={styles.assignChip}
                  onPress={() => bulkAssign(u.id, u.full_name)}
                  disabled={assigning}
                >
                  <Text style={styles.assignChipText}>{u.full_name.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {loading ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={leads} keyExtractor={i => i.id} renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<EmptyState icon="people-outline" title="No leads" message="Upload a CSV or add leads manually" />}
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
  filterRow: { maxHeight: 44, marginTop: 10 },
  filterRow2: { maxHeight: 44, marginTop: 4 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  industryChip: { borderStyle: 'dashed' as any },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 11, fontWeight: '500', color: Colors.textMuted },
  chipTextActive: { color: '#FFFFFF' },
  bulkBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.infoBg, paddingHorizontal: 12, paddingVertical: 8,
    marginHorizontal: 16, marginTop: 8, borderRadius: 8,
  },
  selectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  selectAllText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  bulkCount: { fontSize: 12, fontWeight: '600', color: Colors.text },
  assignRow: { flexDirection: 'row', gap: 6 },
  assignChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  assignChipText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 32 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 14, marginBottom: 8,
  },
  rowSelected: { borderColor: Colors.primary, backgroundColor: '#F0FDF4' },
  rowMain: { marginBottom: 6 },
  name: { fontSize: 14, fontWeight: '600', color: Colors.text },
  phone: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  industry: { fontSize: 11, color: Colors.accent, fontWeight: '500', backgroundColor: '#FDF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  assigned: { fontSize: 11, color: Colors.textMuted },
});
