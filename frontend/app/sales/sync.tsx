import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '@/src/constants/colors';
import api from '@/src/api/client';

export default function SyncScreen() {
  const [pendingCount, setPendingCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [pendingSessions, setPendingSessions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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

  const pickAndUpload = async (sessionId: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      setUploading(true);
      const formData = new FormData();
      formData.append('call_session_id', sessionId);
      formData.append('file', {
        uri: file.uri,
        name: file.name || 'recording.mp3',
        type: file.mimeType || 'audio/mpeg',
      } as any);
      await api.post('/recordings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Success', 'Recording uploaded!');
      loadPending();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
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
            Match audio recordings from your device to pending call sessions. Tap a session below to attach a recording file.
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
        pendingSessions.map(session => (
          <View key={session.id} style={styles.sessionCard}>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionLead}>{session.lead_name}</Text>
              <Text style={styles.sessionPhone}>{session.dialed_number}</Text>
              <Text style={styles.sessionDate}>
                {new Date(session.call_started_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <TouchableOpacity
              testID={`upload-recording-${session.id}`}
              style={styles.uploadBtn}
              onPress={() => pickAndUpload(session.id)}
              disabled={uploading}
            >
              <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
              <Text style={styles.uploadText}>Upload</Text>
            </TouchableOpacity>
          </View>
        ))
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
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 6,
  },
  uploadText: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginTop: 12 },
  emptyMsg: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
});
