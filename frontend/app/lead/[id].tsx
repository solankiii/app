import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, Alert, Linking, TextInput, Modal,
  Platform, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import { Colors } from '@/src/constants/colors';
import StatusBadge from '@/src/components/StatusBadge';
import api from '@/src/api/client';

const LEAD_STATUSES = ['new', 'contacted', 'interested', 'follow_up', 'won', 'lost'];
const FOLLOW_UP_TYPES = ['call', 'whatsapp', 'meeting', 'proposal'];

export default function LeadDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('calls');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [fuDate, setFuDate] = useState('');
  const [fuType, setFuType] = useState('call');
  const [fuNote, setFuNote] = useState('');

  // Recording state
  const [recordingSessionId, setRecordingSessionId] = useState<string | null>(null);
  const [recordingInstance, setRecordingInstance] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploadingRecording, setUploadingRecording] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingInstance) recordingInstance.stopAndUnloadAsync().catch(() => {});
    };
  }, [recordingInstance]);

  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]));
      loop.start();
      return () => loop.stop();
    } else { pulseAnim.setValue(1); }
  }, [isRecording]);

  const formatRecTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const startRecording = async (sessionId: string) => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Required', 'Microphone access needed'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecordingInstance(recording);
      setRecordingSessionId(sessionId);
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to start recording'); }
  };

  const stopAndUpload = async () => {
    if (!recordingInstance || !recordingSessionId) return;
    try {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      await recordingInstance.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingInstance.getURI();
      if (!uri) { Alert.alert('Error', 'Recording file not found'); return; }
      setIsRecording(false);
      setUploadingRecording(recordingSessionId);
      const formData = new FormData();
      formData.append('call_session_id', recordingSessionId);
      if (Platform.OS === 'web') {
        const resp = await fetch(uri);
        const blob = await resp.blob();
        formData.append('file', blob, 'recording.m4a');
      } else {
        formData.append('file', { uri, name: 'recording.m4a', type: 'audio/mp4' } as any);
      }
      await api.post('/recordings/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      Alert.alert('Success', 'Recording uploaded!');
      loadLead();
    } catch (e: any) { Alert.alert('Error', e.message || 'Upload failed'); }
    finally {
      setRecordingInstance(null);
      setRecordingSessionId(null);
      setRecordingDuration(0);
      setUploadingRecording(null);
    }
  };

  const cancelRecording = async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recordingInstance) {
      await recordingInstance.stopAndUnloadAsync().catch(() => {});
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
    }
    setRecordingInstance(null); setRecordingSessionId(null);
    setRecordingDuration(0); setIsRecording(false);
  };

  const loadLead = async () => {
    try {
      const res = await api.get(`/leads/${id}`);
      setLead(res.data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load lead');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadLead(); }, [id]));
  const onRefresh = async () => { setRefreshing(true); await loadLead(); setRefreshing(false); };

  const handleCallNow = async () => {
    if (!lead) return;
    try {
      const res = await api.post('/call-sessions', {
        lead_id: lead.id,
        dialed_number: lead.phone_number,
      });
      const sessionId = res.data.id;
      Linking.openURL(`tel:${lead.phone_number}`);
      setTimeout(() => {
        router.push(`/post-call/${sessionId}` as any);
      }, 1000);
    } catch (e) {
      Alert.alert('Error', 'Failed to create call session');
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      await api.post('/lead-notes', { lead_id: id, note_text: noteText });
      setNoteText('');
      setShowNoteModal(false);
      loadLead();
    } catch (e) {
      Alert.alert('Error', 'Failed to add note');
    }
  };

  const handleScheduleFollowUp = async () => {
    if (!fuDate.trim()) {
      Alert.alert('Error', 'Please enter a date (YYYY-MM-DD HH:MM)');
      return;
    }
    try {
      const isoDate = new Date(fuDate.replace(' ', 'T')).toISOString();
      await api.post('/follow-ups', {
        lead_id: id, follow_up_at: isoDate,
        follow_up_type: fuType, note: fuNote,
      });
      setFuDate('');
      setFuNote('');
      setShowFollowUpModal(false);
      loadLead();
    } catch (e) {
      Alert.alert('Error', 'Failed to schedule follow-up. Use format: YYYY-MM-DD HH:MM');
    }
  };

  const handleChangeStatus = async (status: string) => {
    try {
      await api.patch(`/leads/${id}/status`, { status });
      setShowStatusModal(false);
      loadLead();
    } catch (e) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <ActivityIndicator size="large" color={Colors.primary} style={{ flex: 1, justifyContent: 'center' }} />;
  if (!lead) return <Text style={{ textAlign: 'center', marginTop: 40 }}>Lead not found</Text>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Lead Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.nameRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{lead.full_name?.charAt(0)}</Text>
          </View>
          <View style={styles.nameInfo}>
            <Text style={styles.leadName}>{lead.full_name}</Text>
            <Text style={styles.leadPhone}>{lead.phone_number}</Text>
          </View>
          <StatusBadge status={lead.status} />
        </View>
        {lead.company_name ? <Text style={styles.detail}>Company: {lead.company_name}</Text> : null}
        {lead.city ? <Text style={styles.detail}>City: {lead.city}</Text> : null}
        <Text style={styles.detail}>Source: {lead.source}</Text>
        {lead.assigned_user ? <Text style={styles.detail}>Assigned: {lead.assigned_user.full_name}</Text> : null}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity testID="call-now-btn" style={styles.callBtn} onPress={handleCallNow}>
          <Ionicons name="call" size={18} color="#FFFFFF" />
          <Text style={styles.callBtnText}>Call Now</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="add-note-btn" style={styles.actionBtn} onPress={() => setShowNoteModal(true)}>
          <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity testID="schedule-fu-btn" style={styles.actionBtn} onPress={() => setShowFollowUpModal(true)}>
          <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity testID="change-status-btn" style={styles.actionBtn} onPress={() => setShowStatusModal(true)}>
          <Ionicons name="swap-horizontal-outline" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {['calls', 'notes', 'follow-ups'].map(t => (
          <TouchableOpacity key={t} testID={`detail-tab-${t}`}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'follow-ups' ? 'Follow-ups' : t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'calls' && (
        (lead.call_sessions || []).length === 0 ? (
          <Text style={styles.emptyTabText}>No call history yet</Text>
        ) : (lead.call_sessions || []).map((s: any) => {
          const isActiveRec = isRecording && recordingSessionId === s.id;
          const isUploading = uploadingRecording === s.id;
          return (
            <View key={s.id} style={styles.historyCard}>
              <View style={styles.historyTop}>
                <Text style={styles.historyDate}>{formatDate(s.call_started_at)}</Text>
                {s.outcome ? <StatusBadge status={s.outcome} small /> : <Text style={styles.inProgress}>In Progress</Text>}
              </View>
              <Text style={styles.historyDetail}>Duration: {s.duration_seconds ? `${s.duration_seconds}s` : '-'}</Text>
              {s.call_notes ? <Text style={styles.historyDetail}>Note: {s.call_notes}</Text> : null}
              <Text style={styles.historyDetail}>
                Recording: {s.recording_status === 'uploaded' ? 'Uploaded' : 'Pending'}
              </Text>
              {s.recording_status === 'pending' && (
                <View style={styles.recRow}>
                  {isActiveRec ? (
                    <View style={styles.recActiveRow}>
                      <Animated.View style={[styles.recDot, { opacity: pulseAnim }]} />
                      <Text style={styles.recTimer}>{formatRecTime(recordingDuration)}</Text>
                      <TouchableOpacity style={styles.recStopBtn} onPress={stopAndUpload}>
                        <Ionicons name="stop-circle" size={14} color="#FFF" />
                        <Text style={styles.recStopText}>Stop & Upload</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.recCancelBtn} onPress={cancelRecording}>
                        <Ionicons name="close" size={14} color={Colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ) : isUploading ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <TouchableOpacity
                      style={styles.recBtn}
                      onPress={() => startRecording(s.id)}
                      disabled={isRecording}
                    >
                      <Ionicons name="mic" size={14} color="#FFF" />
                      <Text style={styles.recBtnText}>Record</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })
      )}

      {activeTab === 'notes' && (
        (lead.notes_list || []).length === 0 ? (
          <Text style={styles.emptyTabText}>No notes yet</Text>
        ) : (lead.notes_list || []).map((n: any) => (
          <View key={n.id} style={styles.historyCard}>
            <Text style={styles.historyDate}>{formatDate(n.created_at)}</Text>
            <Text style={styles.noteAuthor}>By: {n.user_name}</Text>
            <Text style={styles.historyDetail}>{n.note_text}</Text>
          </View>
        ))
      )}

      {activeTab === 'follow-ups' && (
        (lead.follow_ups || []).length === 0 ? (
          <Text style={styles.emptyTabText}>No follow-ups scheduled</Text>
        ) : (lead.follow_ups || []).map((f: any) => (
          <View key={f.id} style={styles.historyCard}>
            <View style={styles.historyTop}>
              <Text style={styles.historyDate}>{formatDate(f.follow_up_at)}</Text>
              <StatusBadge status={f.status} small />
            </View>
            <Text style={styles.historyDetail}>Type: {f.follow_up_type}</Text>
            {f.note ? <Text style={styles.historyDetail}>{f.note}</Text> : null}
          </View>
        ))
      )}

      {/* Add Note Modal */}
      <Modal visible={showNoteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Note</Text>
            <TextInput
              testID="note-input"
              style={styles.modalInput}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Enter note..."
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity testID="cancel-note-btn" style={styles.modalCancel} onPress={() => setShowNoteModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="save-note-btn" style={styles.modalSave} onPress={handleAddNote}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Follow-up Modal */}
      <Modal visible={showFollowUpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Schedule Follow-up</Text>
            <Text style={styles.fieldLabel}>Date & Time (YYYY-MM-DD HH:MM)</Text>
            <TextInput
              testID="fu-date-input"
              style={styles.modalInputSingle}
              value={fuDate}
              onChangeText={setFuDate}
              placeholder="2026-04-15 10:00"
            />
            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.typeRow}>
              {FOLLOW_UP_TYPES.map(t => (
                <TouchableOpacity key={t}
                  style={[styles.typeChip, fuType === t && styles.typeChipActive]}
                  onPress={() => setFuType(t)}
                >
                  <Text style={[styles.typeChipText, fuType === t && styles.typeChipTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              testID="fu-note-input"
              style={styles.modalInput}
              value={fuNote}
              onChangeText={setFuNote}
              placeholder="Optional note..."
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowFollowUpModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="save-fu-btn" style={styles.modalSave} onPress={handleScheduleFollowUp}>
                <Text style={styles.modalSaveText}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Modal */}
      <Modal visible={showStatusModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Status</Text>
            {LEAD_STATUSES.map(s => (
              <TouchableOpacity key={s} testID={`status-option-${s}`}
                style={[styles.statusOption, lead.status === s && styles.statusOptionActive]}
                onPress={() => handleChangeStatus(s)}
              >
                <StatusBadge status={s} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowStatusModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  infoCard: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 16, marginBottom: 16,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  nameInfo: { flex: 1, marginHorizontal: 12 },
  leadName: { fontSize: 18, fontWeight: '700', color: Colors.text },
  leadPhone: { fontSize: 14, color: Colors.textMuted, marginTop: 2 },
  detail: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  callBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.success, paddingVertical: 12, borderRadius: 8,
  },
  callBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  actionBtn: {
    width: 44, height: 44, borderRadius: 8, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12, overflow: 'hidden',
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: Colors.textMuted },
  tabTextActive: { color: '#FFFFFF' },
  historyCard: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 12, marginBottom: 8,
  },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyDate: { fontSize: 12, color: Colors.textMuted },
  historyDetail: { fontSize: 13, color: Colors.text, marginTop: 4 },
  noteAuthor: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  inProgress: { fontSize: 12, color: Colors.warning, fontWeight: '500' },
  emptyTabText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 24 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 20, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 10 },
  modalInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    padding: 12, fontSize: 14, color: Colors.text, minHeight: 80, textAlignVertical: 'top',
  },
  modalInputSingle: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    padding: 12, fontSize: 14, color: Colors.text, height: 44,
  },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
  },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeChipText: { fontSize: 12, color: Colors.textMuted },
  typeChipTextActive: { color: '#FFFFFF' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  modalCancelText: { fontSize: 14, fontWeight: '500', color: Colors.textMuted },
  modalSave: {
    flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  modalSaveText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  statusOption: {
    paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, marginBottom: 4,
  },
  statusOptionActive: { backgroundColor: Colors.background },
  recRow: {
    marginTop: 8, flexDirection: 'row', alignItems: 'center',
  },
  recActiveRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1,
  },
  recDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.danger,
  },
  recTimer: {
    fontSize: 13, fontWeight: '600', color: Colors.danger, fontVariant: ['tabular-nums'],
  },
  recStopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.danger, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
  },
  recStopText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  recCancelBtn: {
    padding: 4, borderRadius: 6, backgroundColor: Colors.background,
  },
  recBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
  },
  recBtnText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
});
