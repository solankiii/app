import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  ActivityIndicator, TouchableOpacity, TextInput, Linking, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import EmptyState from '@/src/components/EmptyState';
import api from '@/src/api/client';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const fmtDateTime = (d?: string) => {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const fmtSize = (bytes?: number) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const fmtDuration = (s?: number | null) => {
  if (s == null) return null;
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
};

export default function RecordingsList() {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const params: any = { limit: 200 };
      if (search) params.search = search;
      const res = await api.get('/recordings', { params });
      setRecordings(res.data.recordings || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, [search]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const playRecording = (id: string) => {
    const url = `${BACKEND_URL}/api/recordings/${id}/audio`;
    Linking.openURL(url).catch(() => {
      const msg = 'Could not open audio file';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Playback failed', msg);
    });
  };

  const renderItem = ({ item }: { item: any }) => {
    const title = item.lead_company || item.lead_name || item.dialed_number || 'Unknown';
    const duration = fmtDuration(item.duration_seconds);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {item.lead_phone ? <Text style={styles.sub}>{item.lead_phone}</Text> : null}
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{item.upload_status || 'uploaded'}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaCell}>
            <Ionicons name="person-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>{item.user_name}</Text>
          </View>
          <View style={styles.metaCell}>
            <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>{fmtDateTime(item.call_started_at || item.uploaded_at)}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          {duration ? (
            <View style={styles.metaCell}>
              <Ionicons name="hourglass-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}>{duration}</Text>
            </View>
          ) : null}
          <View style={styles.metaCell}>
            <Ionicons name="document-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>{fmtSize(item.file_size_bytes)}</Text>
          </View>
          {item.outcome ? (
            <View style={styles.metaCell}>
              <Ionicons name="checkmark-circle-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item.outcome}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            testID={`play-recording-${item.id}`}
            style={styles.playBtn}
            onPress={() => playRecording(item.id)}
          >
            <Ionicons name="play-circle" size={18} color="#FFFFFF" />
            <Text style={styles.playText}>Play / Open</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, phone, exec..."
          placeholderTextColor={Colors.textMuted}
        />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={recordings}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <EmptyState
              icon="mic-outline"
              title="No recordings"
              message="Recordings appear here once a call is made and the audio uploads."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, marginBottom: 8,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  list: { padding: 16, paddingTop: 4, paddingBottom: 32 },
  card: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 12, marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statusPill: { backgroundColor: Colors.background, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  metaCell: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: Colors.textMuted },
  actionsRow: { marginTop: 10 },
  playBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: 6, backgroundColor: Colors.primary,
  },
  playText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});
