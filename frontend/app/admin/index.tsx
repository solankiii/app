import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { Colors } from '@/src/constants/colors';
import MetricCard from '@/src/components/MetricCard';
import api from '@/src/api/client';

function DayBars({ series }: { series: { date: string; calls: number; connected: number }[] }) {
  const max = Math.max(1, ...series.map(d => d.calls));
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };
  return (
    <View style={barStyles.wrap}>
      <View style={barStyles.legend}>
        <View style={barStyles.legendItem}><View style={[barStyles.legendDot, { backgroundColor: Colors.primary }]} /><Text style={barStyles.legendText}>Calls</Text></View>
        <View style={barStyles.legendItem}><View style={[barStyles.legendDot, { backgroundColor: Colors.success }]} /><Text style={barStyles.legendText}>Connected</Text></View>
      </View>
      <View style={barStyles.row}>
        {series.map(d => (
          <View key={d.date} style={barStyles.col}>
            <View style={barStyles.barStack}>
              <View style={[barStyles.bar, { height: (d.calls / max) * 60, backgroundColor: Colors.primary, opacity: 0.25 }]} />
              <View style={[barStyles.barOverlay, { height: (d.connected / max) * 60, backgroundColor: Colors.success }]} />
            </View>
            <Text style={barStyles.label}>{fmt(d.date)}</Text>
            <Text style={barStyles.count}>{d.calls}/{d.connected}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  wrap: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  legend: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: Colors.textMuted },
  row: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  col: { alignItems: 'center', flex: 1 },
  barStack: { width: 24, height: 60, justifyContent: 'flex-end' },
  bar: { width: 24, borderRadius: 3 },
  barOverlay: { width: 24, borderRadius: 3, position: 'absolute', bottom: 0 },
  label: { fontSize: 10, color: Colors.textMuted, marginTop: 4 },
  count: { fontSize: 10, color: Colors.text, fontWeight: '600' },
});

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/dashboard/admin');
      setData(res.data);
    } catch (e) {
      console.error('Failed to load admin dashboard', e);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Admin Dashboard</Text>
            <Text style={styles.role}>{user?.full_name}</Text>
          </View>
          <TouchableOpacity testID="admin-logout-btn" onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color={Colors.textMuted} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard label="Calls Today" value={data?.total_calls_today ?? 0} color={Colors.info}
            icon={<Ionicons name="call" size={20} color={Colors.info} />} />
          <MetricCard label="Connected" value={data?.connected_calls_today ?? 0} color={Colors.success}
            icon={<Ionicons name="checkmark-circle" size={20} color={Colors.success} />} />
        </View>
        <View style={styles.metricsGrid}>
          <MetricCard label="Total Leads" value={data?.total_leads ?? 0} color={Colors.primary}
            icon={<Ionicons name="people" size={20} color={Colors.primary} />} />
          <MetricCard label="Pending Follow-ups" value={data?.pending_follow_ups ?? 0} color={Colors.warning}
            icon={<Ionicons name="calendar" size={20} color={Colors.warning} />} />
        </View>
        <View style={styles.metricsGrid}>
          <MetricCard label="Recordings" value={data?.uploaded_recordings ?? 0} color={Colors.danger}
            icon={<Ionicons name="mic" size={20} color={Colors.danger} />} />
          <View style={{ flex: 1 }} />
        </View>

        <Text style={styles.sectionTitle}>Salesperson Performance</Text>
        {(data?.salesperson_performance || []).map((sp: any) => (
          <TouchableOpacity
            key={sp.user_id}
            style={styles.perfCard}
            activeOpacity={0.7}
            onPress={() => router.push(`/salesperson/${sp.user_id}`)}
          >
            <View style={styles.perfHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{sp.full_name?.charAt(0)}</Text>
              </View>
              <Text style={styles.perfName}>{sp.full_name}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
            </View>
            <View style={styles.perfStats}>
              <View style={styles.perfStat}>
                <Text style={styles.perfStatVal}>{sp.calls_today}</Text>
                <Text style={styles.perfStatLabel}>Calls Today</Text>
              </View>
              <View style={styles.perfStat}>
                <Text style={styles.perfStatVal}>{sp.total_leads}</Text>
                <Text style={styles.perfStatLabel}>Leads</Text>
              </View>
              <View style={styles.perfStat}>
                <Text style={styles.perfStatVal}>{sp.connected_calls}</Text>
                <Text style={styles.perfStatLabel}>Connected</Text>
              </View>
            </View>
            {sp.last_3_days && sp.last_3_days.length > 0 && (
              <DayBars series={sp.last_3_days} />
            )}
          </TouchableOpacity>
        ))}
        {(!data?.salesperson_performance || data.salesperson_performance.length === 0) && (
          <Text style={styles.emptyText}>No salesperson data available</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 22, fontWeight: '700', color: Colors.text },
  role: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  logoutText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  metricsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginTop: 24, marginBottom: 12 },
  perfCard: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 14, marginBottom: 10,
  },
  perfHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  perfName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  perfStats: { flexDirection: 'row', justifyContent: 'space-around' },
  perfStat: { alignItems: 'center' },
  perfStatVal: { fontSize: 20, fontWeight: '700', color: Colors.text },
  perfStatLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 20 },
});
