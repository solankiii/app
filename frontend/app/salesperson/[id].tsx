import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import StatusBadge from '@/src/components/StatusBadge';
import api from '@/src/api/client';

const OUTCOME_COLORS: Record<string, string> = {
  connected: Colors.success,
  no_answer: Colors.warning,
  busy: Colors.warning,
  declined: Colors.danger,
  wrong_number: Colors.danger,
  voicemail: Colors.info,
};

const OUTCOME_LABELS: Record<string, string> = {
  connected: 'Connected',
  no_answer: 'No Answer',
  busy: 'Busy',
  declined: 'Declined',
  wrong_number: 'Wrong Number',
  voicemail: 'Voicemail',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  interested: 'Interested',
  follow_up: 'Follow-up',
  won: 'Won',
  lost: 'Lost',
};

export default function SalespersonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.get(`/dashboard/salesperson/${id}`);
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [id]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) {
    return <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />;
  }
  if (!data) {
    return <Text style={styles.empty}>Could not load data</Text>;
  }

  const u = data.user;
  const series7 = data.last_7_days || [];
  const maxCalls = Math.max(1, ...series7.map((d: any) => d.calls));
  const totalConnected = series7.reduce((s: number, d: any) => s + d.connected, 0);
  const totalCalls = series7.reduce((s: number, d: any) => s + d.calls, 0);
  const connectRate = totalCalls > 0 ? Math.round((totalConnected / totalCalls) * 100) : 0;
  const outcomes = data.outcome_breakdown_7d || {};
  const outcomeTotal = Object.values(outcomes).reduce((s: number, v: any) => s + v, 0) as number;
  const statuses = data.lead_status_breakdown || {};

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const fmtTime = (iso: string) => new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{u.full_name?.[0]?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{u.full_name}</Text>
          <Text style={styles.email}>{u.email}</Text>
          {u.phone ? <Text style={styles.email}>{u.phone}</Text> : null}
        </View>
        <View style={[styles.roleBadge, u.role === 'admin' ? styles.adminBadge : styles.salesBadge]}>
          <Text style={[styles.roleText, u.role === 'admin' ? styles.adminText : styles.salesText]}>
            {u.role.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Top metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metric}><Text style={styles.metricVal}>{data.total_leads}</Text><Text style={styles.metricLabel}>Total Leads</Text></View>
        <View style={styles.metric}><Text style={styles.metricVal}>{totalCalls}</Text><Text style={styles.metricLabel}>7-Day Calls</Text></View>
        <View style={styles.metric}><Text style={styles.metricVal}>{totalConnected}</Text><Text style={styles.metricLabel}>Connected</Text></View>
        <View style={styles.metric}><Text style={styles.metricVal}>{connectRate}%</Text><Text style={styles.metricLabel}>Connect Rate</Text></View>
      </View>

      {/* 7-day chart */}
      <Text style={styles.sectionTitle}>Last 7 Days</Text>
      <View style={styles.chartCard}>
        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.primary, opacity: 0.25 }]} /><Text style={styles.legendText}>Calls</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.success }]} /><Text style={styles.legendText}>Connected</Text></View>
        </View>
        <View style={styles.chartRow}>
          {series7.map((d: any) => (
            <View key={d.date} style={styles.chartCol}>
              <View style={styles.barStack}>
                <View style={[styles.bar, { height: (d.calls / maxCalls) * 100, backgroundColor: Colors.primary, opacity: 0.25 }]} />
                <View style={[styles.barOverlay, { height: (d.connected / maxCalls) * 100, backgroundColor: Colors.success }]} />
              </View>
              <Text style={styles.dayLabel}>{fmtDate(d.date)}</Text>
              <Text style={styles.dayCount}>{d.calls}/{d.connected}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Outcome breakdown */}
      <Text style={styles.sectionTitle}>Call Outcomes (7 Days)</Text>
      <View style={styles.card}>
        {outcomeTotal === 0 ? (
          <Text style={styles.empty}>No calls in this window</Text>
        ) : (
          <>
            <View style={styles.stackedBar}>
              {Object.keys(outcomes).map((k) => {
                const v = outcomes[k] || 0;
                if (v === 0) return null;
                const pct = (v / outcomeTotal) * 100;
                return (
                  <View key={k} style={{ width: `${pct}%`, backgroundColor: OUTCOME_COLORS[k] || Colors.textMuted, height: '100%' }} />
                );
              })}
            </View>
            <View style={{ marginTop: 10 }}>
              {Object.keys(outcomes).map((k) => {
                const v = outcomes[k] || 0;
                const pct = outcomeTotal > 0 ? Math.round((v / outcomeTotal) * 100) : 0;
                return (
                  <View key={k} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: OUTCOME_COLORS[k] || Colors.textMuted }]} />
                    <Text style={styles.legendRowLabel}>{OUTCOME_LABELS[k] || k}</Text>
                    <Text style={styles.legendRowVal}>{v} ({pct}%)</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>

      {/* Lead status breakdown */}
      <Text style={styles.sectionTitle}>Assigned Leads by Status</Text>
      <View style={styles.statusGrid}>
        {Object.keys(statuses).map((k) => (
          <View key={k} style={styles.statusCell}>
            <Text style={styles.statusVal}>{statuses[k]}</Text>
            <Text style={styles.statusLabel}>{STATUS_LABELS[k] || k}</Text>
          </View>
        ))}
      </View>

      {/* Recent calls */}
      <Text style={styles.sectionTitle}>Recent Calls</Text>
      {(data.recent_calls || []).length === 0 ? (
        <Text style={styles.empty}>No recent calls</Text>
      ) : (
        (data.recent_calls || []).map((c: any) => (
          <TouchableOpacity
            key={c.id}
            style={styles.callCard}
            onPress={() => c.lead_id ? router.push(`/lead/${c.lead_id}`) : null}
            activeOpacity={0.7}
          >
            <View style={styles.callTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.callName} numberOfLines={1}>
                  {c.lead_company || c.lead_name || c.dialed_number}
                </Text>
                <Text style={styles.callSub}>{c.dialed_number}</Text>
              </View>
              {c.outcome ? <StatusBadge status={c.outcome} small /> : <Text style={styles.callPending}>In Progress</Text>}
            </View>
            <View style={styles.callMeta}>
              <Text style={styles.callMetaItem}>{fmtTime(c.call_started_at || c.created_at)}</Text>
              {c.duration_seconds != null && <Text style={styles.callMetaItem}>{c.duration_seconds}s</Text>}
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 14, marginBottom: 12,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  name: { fontSize: 17, fontWeight: '700', color: Colors.text },
  email: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  adminBadge: { backgroundColor: '#FEF2F2' },
  salesBadge: { backgroundColor: '#ECFDF5' },
  roleText: { fontSize: 10, fontWeight: '700' },
  adminText: { color: '#DC2626' },
  salesText: { color: '#059669' },
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  metric: {
    flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 10, alignItems: 'center',
  },
  metricVal: { fontSize: 18, fontWeight: '700', color: Colors.text },
  metricLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, marginTop: 18, marginBottom: 8 },
  chartCard: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 14,
  },
  legend: { flexDirection: 'row', gap: 14, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: Colors.textMuted },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  chartCol: { alignItems: 'center', flex: 1 },
  barStack: { width: 22, height: 100, justifyContent: 'flex-end' },
  bar: { width: 22, borderRadius: 3 },
  barOverlay: { width: 22, borderRadius: 3, position: 'absolute', bottom: 0 },
  dayLabel: { fontSize: 9, color: Colors.textMuted, marginTop: 4 },
  dayCount: { fontSize: 9, color: Colors.text, fontWeight: '600' },
  card: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 14,
  },
  stackedBar: {
    flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  legendRowLabel: { flex: 1, fontSize: 12, color: Colors.text },
  legendRowVal: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusCell: {
    flexBasis: '31%', flexGrow: 1,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 10, alignItems: 'center',
  },
  statusVal: { fontSize: 18, fontWeight: '700', color: Colors.text },
  statusLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  callCard: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 12, marginBottom: 8,
  },
  callTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  callName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  callSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  callPending: { fontSize: 11, color: Colors.warning, fontWeight: '600' },
  callMeta: { flexDirection: 'row', gap: 12, marginTop: 6 },
  callMetaItem: { fontSize: 11, color: Colors.textMuted },
  empty: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', padding: 20 },
});
