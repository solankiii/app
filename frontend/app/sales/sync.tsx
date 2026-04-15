import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import { Colors } from '@/src/constants/colors';
import api from '@/src/api/client';

export default function SyncScreen() {
  const [pendingCount, setPendingCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [pendingSessions, setPendingSessions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingInstance, setRecordingInstance] = useState<Audio.Recording | null>(null);
  const [recordingSessionId, setRecordingSessionId] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingInstance) {
        recordingInstance.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [recordingInstance]);

  // Pulse animation for recording dot
  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const loadPending = async () => {
    try {
      const res = await api.get('/call-sessions', { params: { limit: 50 } });
      const sessions = (res.data.sessions || []).filter((s: any) => s.recording_status === 'pending');
      setPendingSessions(sessions);
      setPendingCount(sessions.length);
    } catch (e) {
      console.error('Failed to load pending', e);
    }
  };

  useFocusEffect(useCallback(() => { loadPending(); }, []));

  const onRefresh = async () => { setRefreshing(true); await loadPending(); setRefreshing(false); };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = async (sessionId: string) => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone access is needed to record audio.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecordingInstance(recording);
      setRecordingSessionId(sessionId);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to start recording');
    }
  };

  const stopAndUpload = async () => {
    if (!recordingInstance || !recordingSessionId) return;

    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      await recordingInstance.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recordingInstance.getURI();
      if (!uri) {
        Alert.alert('Error', 'Recording file not found');
        return;
      }

      setIsRecording(false);
      setUploading(true);

      const formData = new FormData();
      formData.append('call_session_id', recordingSessionId);
      formData.append('file', {
        uri,
        name: 'recording.m4a',
        type: 'audio/mp4',
      } as any);

      await api.post('/recordings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Recording uploaded!');
      loadPending();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Upload failed');
    } finally {
      setRecordingInstance(null);
      setRecordingSessionId(null);
      setRecordingDuration(0);
      setUploading(false);
    }
  };

  const cancelRecording = async () => {
    if (!recordingInstance) return;
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      await recordingInstance.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch (_) {}
    setRecordingInstance(null);
    setRecordingSessionId(null);
    setRecordingDuration(0);
    setIsRecording(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.infoCard}>
        <View style={styles.infoIcon}>
          <Ionicons name="information-circle" size={24} color={Colors.info} />
        </View>
        <View style={styles.infoTextWrap}>
          <Text style={styles.infoTitle}>Recording Sync</Text>
          <Text style={styles.infoText}>
            Tap "Record" on a pending session, speak into your microphone, then tap "Stop & Upload" to sync.
          </Text>
        </View>
      </View>

      <View style={styles.metricRow}>
        <View style={[styles.metricBox, { borderColor: Colors.warning }]}>
          <Text style={[styles.metricVal, { color: Colors.warning }]}>{pendingCount}</Text>
          <Text style={styles.metricLabel}>Pending</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Pending Call Sessions</Text>

      {uploading && <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />}

      {pendingSessions.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="checkmark-circle" size={40} color={Colors.success} />
          <Text style={styles.emptyTitle}>All synced!</Text>
          <Text style={styles.emptyMsg}>No pending recordings to upload</Text>
        </View>
      ) : (
        pendingSessions.map(session => {
          const isActiveSession = isRecording && recordingSessionId === session.id;

          return (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionLead}>{session.lead_name}</Text>
                <Text style={styles.sessionPhone}>{session.dialed_number}</Text>
                <Text style={styles.sessionDate}>
                  {new Date(session.call_started_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              {isActiveSession ? (
                <View style={styles.recordingControls}>
                  <View style={styles.recordingRow}>
                    <Animated.View style={[styles.recordingDot, { opacity: pulseAnim }]} />
                    <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
                  </View>
                  <View style={styles.recordingActions}>
                    <TouchableOpacity
                      style={styles.stopBtn}
                      onPress={stopAndUpload}
                    >
                      <Ionicons name="stop-circle" size={16} color="#FFFFFF" />
                      <Text style={styles.stopBtnText}>Stop & Upload</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={cancelRecording}
                    >
                      <Ionicons name="close" size={16} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  testID={`record-btn-${session.id}`}
                  style={styles.recordBtn}
                  onPress={() => startRecording(session.id)}
                  disabled={isRecording || uploading}
                >
                  <Ionicons name="mic" size={18} color="#FFFFFF" />
                  <Text style={styles.recordBtnText}>Record</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  infoCard: {
    flexDirection: 'row', backgroundColor: Colors.infoBg,
    borderRadius: 8, padding: 14, gap: 12, marginBottom: 16,
  },
  infoIcon: { marginTop: 2 },
  infoTextWrap: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  infoText: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  metricRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  metricBox: {
    flex: 1, backgroundColor: Colors.surface, borderWidth: 1,
    borderRadius: 8, padding: 16, alignItems: 'center',
  },
  metricVal: { fontSize: 28, fontWeight: '700' },
  metricLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  sessionCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 14, marginBottom: 10,
  },
  sessionInfo: { flex: 1 },
  sessionLead: { fontSize: 14, fontWeight: '600', color: Colors.text },
  sessionPhone: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  sessionDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  recordBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 6,
  },
  recordBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
  recordingControls: { alignItems: 'flex-end', gap: 6 },
  recordingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recordingDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444',
  },
  durationText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  recordingActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 6,
  },
  stopBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },
  cancelBtn: {
    padding: 6, borderRadius: 6,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginTop: 12 },
  emptyMsg: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
});
