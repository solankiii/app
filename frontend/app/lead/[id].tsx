import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, Alert, Linking, TextInput, Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
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
  const [fuTime, setFuTime] = useState('10:00');
  const [fuType, setFuType] = useState('call');
  const [fuNote, setFuNote] = useState('');

  // Upload & playback state
  const [uploadingRecording, setUploadingRecording] = useState<string | null>(null);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const showMsg = (title: string, msg: string) => {
    if (Platform.OS === 'web') window.alert(`${title}: ${msg}`);
    else Alert.alert(title, msg);
  };

  const pickAndUploadRecording = async (sessionId: string) => {
    try {
      const doc = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', '*/*'],
        copyToCacheDirectory: true,
      });
      if (doc.canceled || !doc.assets?.length) return;
      const file = doc.assets[0];
      setUploadingRecording(sessionId);

      if (Platform.OS === 'web') {
        // Web: read file as base64 and send as JSON to avoid multipart issues
        const resp = await fetch(file.uri);
        const blob = await resp.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // strip data:...;base64, prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        await api.post('/recordings/upload-base64', {
          call_session_id: sessionId,
          file_name: file.name || 'recording.mp3',
          file_data: base64,
          content_type: file.mimeType || 'audio/mpeg',
        }, { timeout: 60000 });
      } else {
        const formData = new FormData();
        formData.append('call_session_id', sessionId);
        formData.append('file', { uri: file.uri, name: file.name || 'recording.mp3', type: file.mimeType || 'audio/mpeg' } as any);
        await api.post('/recordings/upload', formData, { timeout: 60000 });
      }
      showMsg('Success', 'Recording uploaded!');
      loadLead();
    } catch (e: any) {
      showMsg('Error', e.response?.data?.detail || e.message || 'Upload failed');
    } finally {
      setUploadingRecording(null);
    }
  };

  const playRecording = async (recordingId: string) => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
        if (playingRecordingId === recordingId) { setPlayingRecordingId(null); return; }
      }
      setPlayingRecordingId(recordingId);
      const backendUrl = api.defaults.baseURL?.replace(/\/api$/, '') || '';
      const audioUrl = `${backendUrl}/api/recordings/${recordingId}/audio`;
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setPlayingRecordingId(null);
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
      });
      await sound.playAsync();
    } catch (e: any) {
      setPlayingRecordingId(null);
      showMsg('Error', 'Failed to play recording');
    }
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
      showMsg('Error', 'Please select a date');
      return;
    }
    try {
      const dateStr = `${fuDate}T${fuTime || '10:00'}`;
      const isoDate = new Date(dateStr).toISOString();
      await api.post('/follow-ups', {
        lead_id: id, follow_up_at: isoDate,
        follow_up_type: fuType, note: fuNote,
      });
      setFuDate('');
      setFuTime('10:00');
      setFuNote('');
      setShowFollowUpModal(false);
      loadLead();
    } catch (e) {
      showMsg('Error', 'Failed to schedule follow-up');
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

  // Generate quick date options for follow-up
  const getQuickDates = () => {
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const in3days = new Date(today); in3days.setDate(today.getDate() + 3);
    const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
    const in2weeks = new Date(today); in2weeks.setDate(today.getDate() + 14);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const label = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' });
    return [
      { label: 'Tomorrow', sublabel: label(tomorrow), value: fmt(tomorrow) },
      { label: 'In 3 days', sublabel: label(in3days), value: fmt(in3days) },
      { label: 'Next week', sublabel: label(nextWeek), value: fmt(nextWeek) },
      { label: 'In 2 weeks', sublabel: label(in2weeks), value: fmt(in2weeks) },
    ];
  };

  if (loading) return <ActivityIndicator size="large" color={Colors.primary} style={{ flex: 1, justifyContent: 'center' }} />;
  if (!lead) return <Text style={{ textAlign: 'center', marginTop: 40 }}>Lead not found</Text>;

  const callSessions = (lead.call_sessions || []).slice().sort(
    (a: any, b: any) => new Date(a.call_started_at).getTime() - new Date(b.call_started_at).getTime()
  );
  const totalCalls = callSessions.length;

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
              {t === 'calls' ? `Calls (${totalCalls})` : t === 'follow-ups' ? 'Follow-ups' : t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'calls' && (
        callSessions.length === 0 ? (
          <Text style={styles.emptyTabText}>No call history yet</Text>
        ) : callSessions.map((s: any, idx: number) => {
          const callNumber = idx + 1;
          const isUploading = uploadingRecording === s.id;
          const sessionRecordings = (lead.recordings || []).filter((r: any) => r.call_session_id === s.id);
          return (
            <View key={s.id} style={styles.historyCard}>
              <View style={styles.historyTop}>
                <View style={styles.callNumberRow}>
                  <View style={styles.callBadge}>
                    <Text style={styles.callBadgeText}>Call #{callNumber}</Text>
                  </View>
                  <Text style={styles.historyDate}>{formatDate(s.call_started_at)}</Text>
                </View>
                {s.outcome ? <StatusBadge status={s.outcome} small /> : <Text style={styles.inProgress}>In Progress</Text>}
              </View>
              <Text style={styles.historyDetail}>Duration: {s.duration_seconds ? `${s.duration_seconds}s` : '-'}</Text>
              {s.call_notes ? <Text style={styles.historyDetail}>Note: {s.call_notes}</Text> : null}

              {/* Uploaded recordings - play them */}
              {sessionRecordings.map((rec: any) => (
                <TouchableOpacity
                  key={rec.id}
                  style={styles.recPlayRow}
                  onPress={() => playRecording(rec.id)}
                >
                  <Ionicons
                    name={playingRecordingId === rec.id ? 'pause-circle' : 'play-circle'}
                    size={24}
                    color={Colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recFileName}>{rec.file_name || 'Recording'}</Text>
                    <Text style={styles.recFileInfo}>
                      {rec.file_size_bytes ? `${(rec.file_size_bytes / 1024).toFixed(0)} KB` : ''}
                      {rec.uploaded_at ? ` • ${formatDate(rec.uploaded_at)}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                </TouchableOpacity>
              ))}

              {/* Always show upload button — can upload multiple recordings per call */}
              <View style={styles.recRow}>
                {isUploading ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <TouchableOpacity
                    style={styles.recBtn}
                    onPress={() => pickAndUploadRecording(s.id)}
                  >
                    <Ionicons name="cloud-upload" size={14} color="#FFF" />
                    <Text style={styles.recBtnText}>
                      {sessionRecordings.length > 0 ? 'Upload Another Recording' : 'Upload Recording'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
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

      {/* Follow-up Modal with Calendar-like Date Picker */}
      <Modal visible={showFollowUpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Schedule Follow-up</Text>

            <Text style={styles.fieldLabel}>Quick Pick</Text>
            <View style={styles.quickDateRow}>
              {getQuickDates().map(qd => (
                <TouchableOpacity
                  key={qd.value}
                  style={[styles.quickDateChip, fuDate === qd.value && styles.quickDateChipActive]}
                  onPress={() => setFuDate(qd.value)}
                >
                  <Text style={[styles.quickDateLabel, fuDate === qd.value && styles.quickDateLabelActive]}>{qd.label}</Text>
                  <Text style={[styles.quickDateSub, fuDate === qd.value && styles.quickDateSubActive]}>{qd.sublabel}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Or enter date</Text>
            <TextInput
              testID="fu-date-input"
              style={styles.modalInputSingle}
              value={fuDate}
              onChangeText={setFuDate}
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.fieldLabel}>Time</Text>
            <View style={styles.timeRow}>
              {['09:00', '10:00', '11:00', '14:00', '16:00', '18:00'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.timeChip, fuTime === t && styles.typeChipActive]}
                  onPress={() => setFuTime(t)}
                >
                  <Text style={[styles.timeChipText, fuTime === t && styles.typeChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

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
  callNumberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  callBadge: {
    backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
  callBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
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
    padding: 20, paddingBottom: 40, maxHeight: '90%',
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
  quickDateRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  quickDateChip: {
    flex: 1, minWidth: 70, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
  },
  quickDateChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  quickDateLabel: { fontSize: 12, fontWeight: '600', color: Colors.text },
  quickDateLabelActive: { color: '#FFFFFF' },
  quickDateSub: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  quickDateSubActive: { color: 'rgba(255,255,255,0.8)' },
  timeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  timeChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
  },
  timeChipText: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
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
  recBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6,
  },
  recBtnText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  recPlayRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 8, padding: 10, backgroundColor: Colors.background,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
  },
  recFileName: { fontSize: 13, fontWeight: '500', color: Colors.text },
  recFileInfo: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});
