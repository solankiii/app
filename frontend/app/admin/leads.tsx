import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, RefreshControl, ActivityIndicator, Alert, ScrollView, Platform,
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
  const [cityFilter, setCityFilter] = useState('all');
  const [cities, setCities] = useState<string[]>([]);
  const [salesUsers, setSalesUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalMatching, setTotalMatching] = useState(0);

  // Bulk assign
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    api.get('/leads/industries').then(r => setIndustries(r.data || [])).catch(() => {});
    api.get('/leads/cities').then(r => setCities(r.data || [])).catch(() => {});
    api.get('/users/sales').then(r => setSalesUsers(r.data || [])).catch(() => {});
  }, []);

  const loadLeads = async () => {
    try {
      const params: any = { limit: 200 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (industryFilter !== 'all') params.industry = industryFilter;
      if (cityFilter !== 'all') params.city = cityFilter;
      const res = await api.get('/leads', { params });
      setLeads(res.data.leads || []);
      setTotalMatching(res.data.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const currentFilterParams = () => {
    const params: any = {};
    if (search) params.search = search;
    if (statusFilter !== 'all') params.status = statusFilter;
    if (industryFilter !== 'all') params.industry = industryFilter;
    if (cityFilter !== 'all') params.city = cityFilter;
    return params;
  };

  useFocusEffect(useCallback(() => { loadLeads(); }, [search, statusFilter, industryFilter, cityFilter]));
  const onRefresh = async () => { setRefreshing(true); await loadLeads(); setRefreshing(false); };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = async () => {
    if (selected.size >= totalMatching && totalMatching > 0) {
      setSelected(new Set());
      return;
    }
    try {
      const res = await api.get('/leads/ids', { params: currentFilterParams() });
      setSelected(new Set(res.data.ids || []));
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Failed to select all';
      if (Platform.OS === 'web') window.alert(`Error: ${msg}`);
      else Alert.alert('Error', msg);
    }
  };

  const bulkAssign = (userId: string, userName: string) => {
    const doAssign = async () => {
      setAssigning(true);
      try {
        await api.post('/leads/bulk-assign', {
          lead_ids: Array.from(selected),
          assigned_to: userId,
        });
        if (Platform.OS === 'web') window.alert(`${selected.size} leads assigned to ${userName}`);
        else Alert.alert('Done', `${selected.size} leads assigned to ${userName}`);
        setSelected(new Set());
        setSelectMode(false);
        loadLeads();
      } catch (e: any) {
        const msg = e.response?.data?.detail || 'Assign failed';
        if (Platform.OS === 'web') window.alert(`Error: ${msg}`);
        else Alert.alert('Error', msg);
      } finally {
        setAssigning(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Assign ${selected.size} leads to ${userName}?`)) doAssign();
    } else {
      Alert.alert('Bulk Assign', `Assign ${selected.size} leads to ${userName}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Assign', onPress: doAssign },
      ]);
    }
  };

  const bulkDelete = () => {
    const msg = `Delete ${selected.size} leads? This cannot be undone.`;
    const doDelete = async () => {
      setAssigning(true);
      try {
        await api.post('/leads/bulk-delete', { lead_ids: Array.from(selected) });
        if (Platform.OS === 'web') window.alert(`${selected.size} leads deleted`);
        else Alert.alert('Done', `${selected.size} leads deleted`);
        setSelected(new Set());
        setSelectMode(false);
        loadLeads();
      } catch (e: any) {
        const errMsg = e.response?.data?.detail || 'Delete failed';
        if (Platform.OS === 'web') window.alert(`Error: ${errMsg}`);
        else Alert.alert('Error', errMsg);
      } finally {
        setAssigning(false);
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doDelete();
    } else {
      Alert.alert('Delete Leads', msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const distributeEqually = () => {
    if (salesUsers.length === 0) return;
    const selectedArr = Array.from(selected);
    const perUser = Math.floor(selectedArr.length / salesUsers.length);
    const remainder = selectedArr.length % salesUsers.length;
    const distribution = salesUsers.map((u, i) => ({
      name: u.full_name,
      count: perUser + (i < remainder ? 1 : 0),
    }));
    const summary = distribution.map(d => `${d.name}: ${d.count}`).join('\n');
    const msg = `Distribute ${selectedArr.length} leads equally?\n\n${summary}`;

    const doDistribute = async () => {
      setAssigning(true);
      try {
        let offset = 0;
        for (let i = 0; i < salesUsers.length; i++) {
          const count = perUser + (i < remainder ? 1 : 0);
          if (count === 0) continue;
          const chunk = selectedArr.slice(offset, offset + count);
          offset += count;
          await api.post('/leads/bulk-assign', {
            lead_ids: chunk,
            assigned_to: salesUsers[i].id,
          });
        }
        if (Platform.OS === 'web') window.alert(`${selectedArr.length} leads distributed across ${salesUsers.length} reps!`);
        else Alert.alert('Done', `${selectedArr.length} leads distributed across ${salesUsers.length} reps!`);
        setSelected(new Set());
        setSelectMode(false);
        loadLeads();
      } catch (e: any) {
        const errMsg = e.response?.data?.detail || 'Distribution failed';
        if (Platform.OS === 'web') window.alert(`Error: ${errMsg}`);
        else Alert.alert('Error', errMsg);
      } finally {
        setAssigning(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doDistribute();
    } else {
      Alert.alert('Distribute Equally', msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Distribute', onPress: doDistribute },
      ]);
    }
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
          <Text style={styles.name} numberOfLines={1}>
            {item.company_name || item.full_name || '(no name)'}
          </Text>
          <Text style={styles.phone}>{item.phone_number}</Text>
        </View>
        {item.company_name && item.full_name ? (
          <Text style={styles.contactName} numberOfLines={1}>{item.full_name}</Text>
        ) : null}
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

      {/* City filters */}
      {cities.length > 0 && (
        <FlatList
          horizontal data={['all', ...cities]} keyExtractor={i => i}
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow2} contentContainerStyle={styles.filterContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, styles.cityChip, cityFilter === item && styles.chipActive]}
              onPress={() => setCityFilter(item)}
            >
              <Text style={[styles.chipText, cityFilter === item && styles.chipTextActive]}>
                {item === 'all' ? 'All Cities' : item}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Bulk assign bar */}
      {selectMode && selected.size > 0 && (
        <View style={styles.bulkBar}>
          <View style={styles.bulkTopRow}>
            <TouchableOpacity onPress={selectAll} style={styles.selectAllBtn}>
              <Ionicons name="checkmark-done" size={16} color={Colors.primary} />
              <Text style={styles.selectAllText}>
                {selected.size >= totalMatching && totalMatching > 0
                  ? 'Deselect All'
                  : `Select All${totalMatching ? ` (${totalMatching})` : ''}`}
              </Text>
            </TouchableOpacity>
            <Text style={styles.bulkCount}>{selected.size} selected</Text>
            {salesUsers.length > 1 && (
              <TouchableOpacity
                style={styles.distributeBtn}
                onPress={distributeEqually}
                disabled={assigning}
              >
                <Ionicons name="git-branch-outline" size={14} color="#FFF" />
                <Text style={styles.distributeBtnText}>Distribute Equally</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.assignRow}>
              <Text style={styles.assignLabel}>Assign to:</Text>
              {salesUsers.map(u => (
                <TouchableOpacity
                  key={u.id} style={styles.assignChip}
                  onPress={() => bulkAssign(u.id, u.full_name)}
                  disabled={assigning}
                >
                  <Text style={styles.assignChipText}>{u.full_name.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.deleteChip}
                onPress={bulkDelete}
                disabled={assigning}
              >
                <Ionicons name="trash-outline" size={12} color="#FFF" />
                <Text style={styles.assignChipText}>Delete</Text>
              </TouchableOpacity>
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
  filterRow: { minHeight: 36, maxHeight: 44, marginTop: 10 },
  filterRow2: { minHeight: 36, maxHeight: 44, marginTop: 4 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  industryChip: { borderStyle: 'dashed' as any },
  cityChip: { borderStyle: 'dotted' as any },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 11, fontWeight: '500', color: Colors.textMuted },
  chipTextActive: { color: '#FFFFFF' },
  bulkBar: {
    backgroundColor: Colors.infoBg, paddingHorizontal: 12, paddingVertical: 8,
    marginHorizontal: 16, marginTop: 8, borderRadius: 8, gap: 8,
  },
  bulkTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  selectAllText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  bulkCount: { fontSize: 12, fontWeight: '600', color: Colors.text },
  distributeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' as any,
    backgroundColor: Colors.success, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
  },
  distributeBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  assignLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '500', alignSelf: 'center' as any },
  assignRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  assignChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  assignChipText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  deleteChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: Colors.danger,
  },
  list: { padding: 16, paddingBottom: 32 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 14, marginBottom: 8,
  },
  rowSelected: { borderColor: Colors.primary, backgroundColor: '#F0FDF4' },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text, flexShrink: 1 },
  phone: { fontSize: 12, color: Colors.textMuted },
  contactName: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  industry: { fontSize: 11, color: Colors.accent, fontWeight: '500', backgroundColor: '#FDF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  assigned: { fontSize: 11, color: Colors.textMuted },
});
