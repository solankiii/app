import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import { useAuth } from '@/src/context/AuthContext';
import api from '@/src/api/client';

const SOURCES = ['website', 'referral', 'cold_call', 'trade_show', 'social_media', 'direct', 'other'];

export default function AddLead() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [salesUsers, setSalesUsers] = useState<any[]>([]);
  const [form, setForm] = useState({
    full_name: '', phone_number: '', alternate_phone: '',
    company_name: '', source: 'direct', city: '',
    assigned_to: '', notes: '',
  });

  React.useEffect(() => {
    api.get('/users/sales').then(res => setSalesUsers(res.data || [])).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.phone_number.trim()) {
      Alert.alert('Error', 'Name and phone number are required');
      return;
    }
    setLoading(true);
    try {
      await api.post('/leads', {
        ...form,
        assigned_to: form.assigned_to || undefined,
        notes: form.notes || undefined,
      });
      Alert.alert('Success', 'Lead created successfully');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput testID="add-lead-name" style={styles.input} value={form.full_name}
            onChangeText={v => update('full_name', v)} placeholder="Enter full name" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput testID="add-lead-phone" style={styles.input} value={form.phone_number}
            onChangeText={v => update('phone_number', v)} placeholder="+91..." keyboardType="phone-pad" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Alternate Phone</Text>
          <TextInput testID="add-lead-alt-phone" style={styles.input} value={form.alternate_phone}
            onChangeText={v => update('alternate_phone', v)} placeholder="Optional" keyboardType="phone-pad" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Company Name</Text>
          <TextInput testID="add-lead-company" style={styles.input} value={form.company_name}
            onChangeText={v => update('company_name', v)} placeholder="Optional" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Source</Text>
          <View style={styles.chipRow}>
            {SOURCES.map(s => (
              <TouchableOpacity key={s}
                style={[styles.chip, form.source === s && styles.chipActive]}
                onPress={() => update('source', s)}
              >
                <Text style={[styles.chipText, form.source === s && styles.chipTextActive]}>
                  {s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>City</Text>
          <TextInput testID="add-lead-city" style={styles.input} value={form.city}
            onChangeText={v => update('city', v)} placeholder="Optional" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Assign To</Text>
          <View style={styles.chipRow}>
            {salesUsers.map(u => (
              <TouchableOpacity key={u.id}
                style={[styles.chip, form.assigned_to === u.id && styles.chipActive]}
                onPress={() => update('assigned_to', u.id)}
              >
                <Text style={[styles.chipText, form.assigned_to === u.id && styles.chipTextActive]}>
                  {u.full_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Initial Note</Text>
          <TextInput testID="add-lead-notes" style={[styles.input, styles.textArea]}
            value={form.notes} onChangeText={v => update('notes', v)}
            placeholder="Optional initial note..." multiline numberOfLines={3} />
        </View>

        <TouchableOpacity
          testID="save-lead-btn"
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : (
            <Text style={styles.saveBtnText}>Save Lead</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 12, fontSize: 14, color: Colors.text, height: 44,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '500', color: Colors.textMuted },
  chipTextActive: { color: '#FFFFFF' },
  saveBtn: {
    backgroundColor: Colors.primary, height: 48, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
