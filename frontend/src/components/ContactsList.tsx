import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, RefreshControl, ActivityIndicator, Linking, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import EmptyState from '@/src/components/EmptyState';
import api from '@/src/api/client';

const sanitizeForWa = (s: string) => (s || '').replace(/[^\d]/g, '');

const openLink = async (url: string) => {
  try {
    await Linking.openURL(url);
  } catch (e) {
    const msg = `Could not open ${url}`;
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Error', msg);
  }
};

export default function ContactsList() {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const params: any = { limit: 200 };
      if (search) params.search = search;
      const res = await api.get('/contacts', { params });
      setContacts(res.data.contacts || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, [search]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const renderItem = ({ item }: { item: any }) => {
    const callTarget = item.spoc_mobile;
    const waTarget = item.spoc_whatsapp || item.spoc_mobile;
    const emailTarget = item.spoc_email;
    const title = item.company_name || item.full_name || '(no name)';
    const subtitle = item.spoc_name
      ? `SPOC: ${item.spoc_name}`
      : (item.company_name && item.full_name ? item.full_name : null);

    return (
      <View style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.cardBody}
          onPress={() => router.push(`/lead/${item.id}`)}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{title?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text> : null}
            <View style={styles.detailRow}>
              {item.spoc_mobile ? <Text style={styles.detail} numberOfLines={1}>{item.spoc_mobile}</Text> : null}
              {item.spoc_whatsapp && item.spoc_whatsapp !== item.spoc_mobile ? (
                <Text style={styles.detail} numberOfLines={1}>WA: {item.spoc_whatsapp}</Text>
              ) : null}
              {emailTarget ? <Text style={styles.detail} numberOfLines={1}>{emailTarget}</Text> : null}
            </View>
            {(item.city || item.industry) ? (
              <Text style={styles.metaLine} numberOfLines={1}>
                {[item.city, item.industry].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, !callTarget && styles.actionDisabled]}
            disabled={!callTarget}
            onPress={() => callTarget && openLink(`tel:${callTarget}`)}
          >
            <Ionicons name="call-outline" size={16} color={callTarget ? '#FFFFFF' : Colors.textMuted} />
            <Text style={[styles.actionText, !callTarget && styles.actionTextDisabled]}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.waBtn, !waTarget && styles.actionDisabled]}
            disabled={!waTarget}
            onPress={() => waTarget && openLink(`https://wa.me/${sanitizeForWa(waTarget)}`)}
          >
            <Ionicons name="logo-whatsapp" size={16} color={waTarget ? '#FFFFFF' : Colors.textMuted} />
            <Text style={[styles.actionText, !waTarget && styles.actionTextDisabled]}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.emailBtn, !emailTarget && styles.actionDisabled]}
            disabled={!emailTarget}
            onPress={() => emailTarget && openLink(`mailto:${emailTarget}`)}
          >
            <Ionicons name="mail-outline" size={16} color={emailTarget ? '#FFFFFF' : Colors.textMuted} />
            <Text style={[styles.actionText, !emailTarget && styles.actionTextDisabled]}>Email</Text>
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
          placeholder="Search contacts..."
          placeholderTextColor={Colors.textMuted}
        />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <EmptyState
              icon="people-circle-outline"
              title="No contacts yet"
              message="Contacts appear here once a sales rep fills the SPOC section (email / WhatsApp / mobile) on the Post-Call Form."
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
  cardBody: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  detail: { fontSize: 12, color: Colors.text },
  metaLine: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 8, borderRadius: 6, backgroundColor: Colors.primary,
  },
  waBtn: { backgroundColor: '#25D366' },
  emailBtn: { backgroundColor: Colors.info },
  actionDisabled: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  actionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  actionTextDisabled: { color: Colors.textMuted },
});
