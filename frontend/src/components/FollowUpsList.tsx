import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, Platform, Linking,
  TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import StatusBadge from '@/src/components/StatusBadge';
import EmptyState from '@/src/components/EmptyState';
import { useAuth } from '@/src/context/AuthContext';
import api from '@/src/api/client';

const TABS = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'this_week', label: 'This Week' },
  { key: 'upcoming', label: 'Upcoming' },
];

const sanitizeWa = (s: string) => (s || '').replace(/[^\d]/g, '');

const showMsg = (title: string, msg: string) => {
  if (Platform.OS === 'web') window.alert(`${title}: ${msg}`);
  else Alert.alert(title, msg);
};

export default function FollowUpsList() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('today');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [executiveFilter, setExecutiveFilter] = useState<string>('all');
  const [salesUsers, setSalesUsers] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reschedule modal
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleNote, setRescheduleNote] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      api.get('/users/sales').then(r => setSalesUsers(r.data || [])).catch(() => {});
    }
  }, [isAdmin]);

  const load = async () => {
    try {
      const params: any = { tab, limit: 200 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (isAdmin && executiveFilter !== 'all') params.assigned_to = executiveFilter;
      const res = await api.get('/follow-ups', { params });
      setFollowUps(res.data.follow_ups || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [tab, statusFilter, executiveFilter]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/follow-ups/${id}/status`, { status });
      load();
    } catch (e: any) {
      showMsg('Error', e.response?.data?.detail || 'Failed to update status');
    }
  };

  const submitReschedule = async () => {
    if (!rescheduleId || !rescheduleDate) return;
    try {
      const iso = new Date(rescheduleDate).toISOString();
      const body: any = { follow_up_at: iso, status: 'pending' };
      if (rescheduleNote.trim()) body.note = rescheduleNote.trim();
      await api.put(`/follow-ups/${rescheduleId}`, body);
      setRescheduleId(null);
      setRescheduleDate('');
      setRescheduleNote('');
      load();
    } catch (e: any) {
      showMsg('Error', e.response?.data?.detail || 'Failed to reschedule');
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  const renderItem = ({ item }: { item: any }) => {
    const title = item.lead_company || item.lead_name || '(no name)';
    const callTarget = item.lead_phone;
    const waTarget = item.lead_whatsapp || item.lead_phone;
    const isPending = item.status === 'pending';
    return (
      <View style={styles.card}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(`/lead/${item.lead_id}`)}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.leadName} numberOfLines={1}>{title}</Text>
              {item.lead_company && item.lead_name ? (
                <Text style={styles.contactName} numberOfLines={1}>{item.lead_name}</Text>
              ) : null}
              {callTarget ? <Text style={styles.phoneText}>{callTarget}</Text> : null}
              <Text style={styles.time}>{formatDate(item.follow_up_at)}</Text>
              {isAdmin ? (
                <Text style={styles.assignedText}>Assigned: {item.assigned_name}</Text>
              ) : null}
            </View>
            <StatusBadge status={item.status} small />
          </View>
          {item.note ? <Text style={styles.note} numberOfLines={2}>{item.note}</Text> : null}
        </TouchableOpacity>
        <View style={styles.actions}>
          {isPending && (
            <TouchableOpacity style={[styles.actionBtn, styles.doneBtn]} onPress={() => updateStatus(item.id, 'done')}>
              <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
              <Text style={styles.actionTextLight}>Done</Text>
            </TouchableOpacity>
          )}
          {isPending && (
            <TouchableOpacity style={[styles.actionBtn, styles.missedBtn]} onPress={() => updateStatus(item.id, 'missed')}>
              <Ionicons name="alert-circle" size={14} color="#FFFFFF" />
              <Text style={styles.actionTextLight}>Missed</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, styles.rescheduleBtn]}
            onPress={() => {
              setRescheduleId(item.id);
              const dt = new Date(item.follow_up_at || Date.now());
              setRescheduleDate(dt.toISOString().slice(0, 16));
              setRescheduleNote('');
            }}
          >
            <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
            <Text style={[styles.actionText, { color: Colors.primary }]}>Reschedule</Text>
          </TouchableOpacity>
          {callTarget ? (
            <TouchableOpacity style={[styles.actionBtn, styles.callBtn]} onPress={() => Linking.openURL(`tel:${callTarget}`).catch(() => {})}>
              <Ionicons name="call-outline" size={14} color="#FFFFFF" />
              <Text style={styles.actionTextLight}>Call</Text>
            </TouchableOpacity>
          ) : null}
          {waTarget ? (
            <TouchableOpacity style={[styles.actionBtn, styles.waBtn]} onPress={() => Linking.openURL(`https://wa.me/${sanitizeWa(waTarget)}`).catch(() => {})}>
              <Ionicons name="logo-whatsapp" size={14} color="#FFFFFF" />
              <Text style={styles.actionTextLight}>WhatsApp</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        horizontal data={TABS} keyExtractor={i => i.key}
        showsHorizontalScrollIndicator={false}
        style={styles.tabRow} contentContainerStyle={styles.tabContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.tabChip, tab === item.key && styles.tabChipActive]}
            onPress={() => setTab(item.key)}
          >
            <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        horizontal data={['all', 'pending', 'done', 'missed', 'cancelled']} keyExtractor={i => i}
        showsHorizontalScrollIndicator={false}
        style={styles.statusRow} contentContainerStyle={styles.tabContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.statusChip, statusFilter === item && styles.statusChipActive]}
            onPress={() => setStatusFilter(item)}
          >
            <Text style={[styles.statusText, statusFilter === item && styles.statusTextActive]}>
              {item === 'all' ? 'All Status' : item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {isAdmin && salesUsers.length > 0 && (
        <FlatList
          horizontal data={[{ id: 'all', full_name: 'All Reps' }, ...salesUsers]} keyExtractor={i => i.id}
          showsHorizontalScrollIndicator={false}
          style={styles.statusRow} contentContainerStyle={styles.tabContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.statusChip, executiveFilter === item.id && styles.statusChipActive]}
              onPress={() => setExecutiveFilter(item.id)}
            >
              <Text style={[styles.statusText, executiveFilter === item.id && styles.statusTextActive]}>
                {item.full_name}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {loading ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={followUps} keyExtractor={i => i.id} renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<EmptyState icon="calendar-outline" title="No follow-ups" message="Nothing matches the current filters." />}
        />
      )}

      {/* Reschedule modal */}
      <Modal visible={rescheduleId !== null} animationType="fade" transparent onRequestClose={() => setRescheduleId(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reschedule follow-up</Text>
            <Text style={styles.modalLabel}>New date/time (YYYY-MM-DDTHH:MM)</Text>
            <TextInput
              style={styles.modalInput}
              value={rescheduleDate}
              onChangeText={setRescheduleDate}
              placeholder="2026-05-01T11:00"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.modalLabel}>Note (optional)</Text>
            <TextInput
              style={[styles.modalInput, { height: 60 }]}
              value={rescheduleNote}
              onChangeText={setRescheduleNote}
              placeholder="Reason / next step"
              placeholderTextColor={Colors.textMuted}
              multiline
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={() => setRescheduleId(null)}>
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={submitReschedule}>
                <Text style={styles.modalBtnPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabRow: { minHeight: 36, maxHeight: 44, marginTop: 8 },
  statusRow: { minHeight: 36, maxHeight: 44, marginTop: 4 },
  tabContent: { paddingHorizontal: 16, gap: 8 },
  tabChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  tabChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 12, fontWeight: '500', color: Colors.textMuted },
  tabTextActive: { color: '#FFFFFF' },
  statusChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderStyle: 'dashed' as any,
  },
  statusChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary, borderStyle: 'solid' as any },
  statusText: { fontSize: 11, fontWeight: '500', color: Colors.textMuted },
  statusTextActive: { color: '#FFFFFF' },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 14, marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leadName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  contactName: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  phoneText: { fontSize: 12, color: Colors.text, marginTop: 2 },
  time: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  assignedText: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  note: { fontSize: 13, color: Colors.textMuted, marginTop: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
  },
  actionText: { fontSize: 12, fontWeight: '600' },
  actionTextLight: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  doneBtn: { backgroundColor: Colors.success },
  missedBtn: { backgroundColor: Colors.warning },
  rescheduleBtn: { borderWidth: 1, borderColor: Colors.primary },
  callBtn: { backgroundColor: Colors.primary },
  waBtn: { backgroundColor: '#25D366' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: {
    width: '100%', maxWidth: 420, backgroundColor: Colors.surface,
    borderRadius: 12, padding: 18,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  modalLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginBottom: 4, marginTop: 4 },
  modalInput: {
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 6, padding: 10, fontSize: 13, color: Colors.text, marginBottom: 8,
  },
  modalRow: { flexDirection: 'row', gap: 8, marginTop: 12, justifyContent: 'flex-end' },
  modalBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  modalBtnPrimary: { backgroundColor: Colors.primary },
  modalBtnPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  modalBtnSecondary: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  modalBtnSecondaryText: { color: Colors.text, fontSize: 13, fontWeight: '600' },
});
