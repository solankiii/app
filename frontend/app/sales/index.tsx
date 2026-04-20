import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { Colors } from '@/src/constants/colors';
import MetricCard from '@/src/components/MetricCard';
import api from '@/src/api/client';

export default function SalesDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState({ calls_today: 0, follow_ups_due: 0, assigned_leads: 0, pending_recordings: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadMetrics = async () => {
    try {
      const res = await api.get('/dashboard/sales');
      setMetrics(res.data);
    } catch (e) {
      console.error('Failed to load metrics', e);
    }
  };

  useFocusEffect(useCallback(() => { loadMetrics(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMetrics();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.full_name || 'Sales'}</Text>
            <Text style={styles.role}>Sales Dashboard</Text>
          </View>
          <TouchableOpacity testID="logout-btn" onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color={Colors.textMuted} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            label="Calls Today"
            value={metrics.calls_today}
            color={Colors.info}
            icon={<Ionicons name="call" size={20} color={Colors.info} />}
          />
          <MetricCard
            label="Follow-ups Due"
            value={metrics.follow_ups_due}
            color={Colors.warning}
            icon={<Ionicons name="calendar" size={20} color={Colors.warning} />}
          />
        </View>
        <View style={styles.metricsGrid}>
          <MetricCard
            label="Assigned Leads"
            value={metrics.assigned_leads}
            color={Colors.success}
            icon={<Ionicons name="people" size={20} color={Colors.success} />}
          />
          <MetricCard
            label="Pending Sync"
            value={metrics.pending_recordings}
            color={Colors.danger}
            icon={<Ionicons name="cloud-upload" size={20} color={Colors.danger} />}
          />
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { icon: 'add-circle', label: 'Add Lead', route: '/add-lead', color: Colors.primary },
            { icon: 'people', label: 'My Leads', route: '/sales/leads', color: Colors.info },
            { icon: 'calendar', label: 'Follow-ups', route: '/sales/follow-ups', color: Colors.warning },
            { icon: 'cloud-upload', label: 'Sync', route: '/sales/sync', color: Colors.success },
          ].map((action, i) => (
            <TouchableOpacity
              key={i}
              testID={`quick-action-${action.label.toLowerCase().replace(' ', '-')}`}
              style={styles.actionCard}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.7}
            >
              <Ionicons name={action.icon as any} size={28} color={action.color} />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: Colors.text },
  role: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  logoutText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  metricsGrid: {
    flexDirection: 'row', gap: 12, marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16, fontWeight: '600', color: Colors.text,
    marginTop: 24, marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  actionCard: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 16, alignItems: 'center', justifyContent: 'center',
    width: '47%', gap: 8,
  },
  actionLabel: { fontSize: 13, fontWeight: '500', color: Colors.text },
});
