import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { Colors } from '@/src/constants/colors';
import MetricCard from '@/src/components/MetricCard';
import api from '@/src/api/client';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
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
            <Ionicons name="log-out-outline" size={22} color={Colors.textMuted} />
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
          <View key={sp.user_id} style={styles.perfCard}>
            <View style={styles.perfHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{sp.full_name?.charAt(0)}</Text>
              </View>
              <Text style={styles.perfName}>{sp.full_name}</Text>
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
          </View>
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
  logoutBtn: { padding: 8 },
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
