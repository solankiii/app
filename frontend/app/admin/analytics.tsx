import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import api from '@/src/api/client';

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last_7', label: 'Last 7 days' },
  { key: 'this_month', label: 'This month' },
  { key: 'custom', label: 'Custom' },
];

const localDay = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const computeRange = (preset: string, customStart: string, customEnd: string): { start: string; end: string } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === 'today') {
    return { start: localDay(today), end: localDay(today) };
  }
  if (preset === 'yesterday') {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return { start: localDay(y), end: localDay(y) };
  }
  if (preset === 'last_7') {
    const s = new Date(today);
    s.setDate(s.getDate() - 6);
    return { start: localDay(s), end: localDay(today) };
  }
  if (preset === 'this_month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: localDay(first), end: localDay(today) };
  }
  // custom
  return { start: customStart, end: customEnd };
};

export default function AdminAnalytics() {
  const [preset, setPreset] = useState('today');
  const [customStart, setCustomStart] = useState(localDay(new Date()));
  const [customEnd, setCustomEnd] = useState(localDay(new Date()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { start, end } = computeRange(preset, customStart, customEnd);
      if (!start || !end) {
        setLoading(false);
        return;
      }
      const res = await api.get('/analytics/range', { params: { start, end } });
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [preset, customStart, customEnd]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const totals = data?.totals || {};
  const perUser: any[] = data?.per_user || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.heading}>Analytics</Text>

      {/* Preset chips */}
      <View style={styles.presetRow}>
        {PRESETS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.presetChip, preset === p.key && styles.presetChipActive]}
            onPress={() => setPreset(p.key)}
          >
            <Text style={[styles.presetText, preset === p.key && styles.presetTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom date inputs */}
      {preset === 'custom' && (
        <View style={styles.customRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>From</Text>
            <TextInput
              style={styles.input}
              value={customStart}
              onChangeText={setCustomStart}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>To</Text>
            <TextInput
              style={styles.input}
              value={customEnd}
              onChangeText={setCustomEnd}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Totals */}
          <View style={styles.totalsGrid}>
            <Stat label="Calls" value={totals.calls ?? 0} color={Colors.info} />
            <Stat label="Connected" value={totals.connected ?? 0} color={Colors.success} />
            <Stat label="Not Connected" value={totals.not_connected ?? 0} color={Colors.warning} />
            <Stat label="Leads Added" value={totals.leads_added ?? 0} color={Colors.primary} />
            <Stat label="FU Pending" value={totals.follow_ups_pending ?? 0} color={Colors.warning} />
            <Stat label="FU Completed" value={totals.follow_ups_completed ?? 0} color={Colors.success} />
            <Stat label="Recordings" value={totals.recordings ?? 0} color={Colors.danger} />
          </View>

          {/* Per-rep table */}
          <Text style={styles.sectionTitle}>By Salesperson</Text>
          <View style={styles.tableWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={[styles.tableRow, styles.tableHeaderRow]}>
                  <TableCell w={140}><Text style={styles.thText}>Executive</Text></TableCell>
                  <TableCell w={70}><Text style={styles.thText}>Calls</Text></TableCell>
                  <TableCell w={90}><Text style={styles.thText}>Connected</Text></TableCell>
                  <TableCell w={110}><Text style={styles.thText}>Not Connected</Text></TableCell>
                  <TableCell w={90}><Text style={styles.thText}>Leads</Text></TableCell>
                  <TableCell w={90}><Text style={styles.thText}>FU Pending</Text></TableCell>
                  <TableCell w={100}><Text style={styles.thText}>FU Done</Text></TableCell>
                  <TableCell w={90}><Text style={styles.thText}>Recordings</Text></TableCell>
                </View>
                {perUser.length === 0 ? (
                  <View style={[styles.tableRow, { padding: 14 }]}>
                    <Text style={styles.muted}>No data for this range.</Text>
                  </View>
                ) : (
                  perUser.map((u, idx) => (
                    <View key={u.user_id} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}>
                      <TableCell w={140}><Text style={styles.tdText} numberOfLines={1}>{u.full_name}</Text></TableCell>
                      <TableCell w={70}><Text style={styles.tdText}>{u.calls}</Text></TableCell>
                      <TableCell w={90}><Text style={styles.tdText}>{u.connected}</Text></TableCell>
                      <TableCell w={110}><Text style={styles.tdText}>{u.not_connected}</Text></TableCell>
                      <TableCell w={90}><Text style={styles.tdText}>{u.leads_added}</Text></TableCell>
                      <TableCell w={90}><Text style={styles.tdText}>{u.follow_ups_pending}</Text></TableCell>
                      <TableCell w={100}><Text style={styles.tdText}>{u.follow_ups_completed}</Text></TableCell>
                      <TableCell w={90}><Text style={styles.tdText}>{u.recordings}</Text></TableCell>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TableCell({ children, w }: { children: React.ReactNode; w: number }) {
  return <View style={{ width: w, paddingVertical: 8, paddingHorizontal: 8 }}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  presetChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  presetChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  presetText: { fontSize: 12, fontWeight: '500', color: Colors.textMuted },
  presetTextActive: { color: '#FFFFFF' },
  customRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  label: { fontSize: 11, color: Colors.textMuted, marginBottom: 4, fontWeight: '600' },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: Colors.text,
  },
  totalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard: {
    flexBasis: '31%', flexGrow: 1, minWidth: 90,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 4, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 12,
  },
  statVal: { fontSize: 18, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, marginTop: 8, marginBottom: 8 },
  tableWrap: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border },
  tableHeaderRow: { backgroundColor: Colors.background },
  tableRowAlt: { backgroundColor: 'rgba(0,0,0,0.015)' },
  thText: { fontSize: 11, fontWeight: '700', color: Colors.text },
  tdText: { fontSize: 12, color: Colors.text },
  muted: { fontSize: 12, color: Colors.textMuted },
});
