import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import StatusBadge from '@/src/components/StatusBadge';
import EmptyState from '@/src/components/EmptyState';
import api from '@/src/api/client';

export default function AdminRecordings() {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/recordings', { params: { limit: 100 } });
      setRecordings(res.data.recordings || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const playRecording = (id: string) => {
    Alert.alert('Audio Playback', 'Audio playback requires a native device. The recording file is stored and can be accessed via the API endpoint.');
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={styles.leadName}>{item.lead_name || 'Unknown Lead'}</Text>
          <Text style={styles.userName}>By: {item.user_name || 'Unknown'}</Text>
        </View>
        <StatusBadge status={item.upload_status || 'uploaded'} small />
      </View>
      <View style={styles.cardMeta}>
        <Text style={styles.metaItem}>{formatDate(item.uploaded_at)}</Text>
        <Text style={styles.metaItem}>{formatSize(item.file_size_bytes)}</Text>
        {item.outcome && <Text style={styles.metaItem}>{item.outcome}</Text>}
      </View>
      <Text style={styles.fileName} numberOfLines={1}>{item.file_name}</Text>
      <TouchableOpacity
        testID={`play-recording-${item.id}`}
        style={styles.playBtn}
        onPress={() => playRecording(item.id)}
      >
        <Ionicons name="play-circle" size={20} color={Colors.info} />
        <Text style={styles.playText}>Play Recording</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) return <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />;

  return (
    <FlatList
      data={recordings} keyExtractor={i => i.id} renderItem={renderItem}
      style={styles.container} contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={<EmptyState icon="mic-outline" title="No recordings" message="No recordings have been uploaded yet" />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 14, marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: 8 },
  leadName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  userName: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  cardMeta: { flexDirection: 'row', gap: 16, marginTop: 8 },
  metaItem: { fontSize: 12, color: Colors.textMuted },
  fileName: { fontSize: 12, color: Colors.textMuted, marginTop: 6, fontStyle: 'italic' },
  playBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    paddingVertical: 6,
  },
  playText: { fontSize: 13, fontWeight: '500', color: Colors.info },
});
