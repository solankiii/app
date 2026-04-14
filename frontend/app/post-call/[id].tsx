import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import api from '@/src/api/client';

const OUTCOMES = [
  'connected', 'no_answer', 'busy', 'switched_off',
  'wrong_number', 'follow_up_booked', 'closed_won', 'closed_lost',
];
const LEAD_STATUSES = ['new', 'contacted', 'interested', 'follow_up', 'won', 'lost'];

export default function PostCallForm() {
  const { id: sessionId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    outcome: '',
    duration_seconds: '',
    call_notes: '',
    next_follow_up_at: '',
    lead_status: 'contacted',
  });

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.outcome) {
      Alert.alert('Error', 'Please select a call outcome');
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        outcome: form.outcome,
        call_notes: form.call_notes || undefined,
        lead_status: form.lead_status,
      };
      if (form.duration_seconds) {
        payload.duration_seconds = parseInt(form.duration_seconds, 10);
      }
      if (form.next_follow_up_at) {
        payload.next_follow_up_at = new Date(form.next_follow_up_at.replace(' ', 'T')).toISOString();
      }
      await api.put(`/call-sessions/${sessionId}`, payload);
      Alert.alert('Success', 'Call session updated');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Text style={styles.label}>Call Outcome *</Text>
          <View style={styles.chipRow}>
            {OUTCOMES.map(o => (
              <TouchableOpacity key={o}
                testID={`outcome-${o}`}
                style={[styles.chip, form.outcome === o && styles.chipActive]}
                onPress={() => update('outcome', o)}
              >
                <Text style={[styles.chipText, form.outcome === o && styles.chipTextActive]}>
                  {o.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Duration (seconds)</Text>
          <TextInput
            testID="duration-input"
            style={styles.input}
            value={form.duration_seconds}
            onChangeText={v => update('duration_seconds', v)}
            placeholder="e.g. 120"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Call Notes</Text>
          <TextInput
            testID="call-notes-input"
            style={[styles.input, styles.textArea]}
            value={form.call_notes}
            onChangeText={v => update('call_notes', v)}
            placeholder="What was discussed..."
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Next Follow-up (YYYY-MM-DD HH:MM)</Text>
          <TextInput
            testID="follow-up-date-input"
            style={styles.input}
            value={form.next_follow_up_at}
            onChangeText={v => update('next_follow_up_at', v)}
            placeholder="Leave empty if none"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Update Lead Status</Text>
          <View style={styles.chipRow}>
            {LEAD_STATUSES.map(s => (
              <TouchableOpacity key={s}
                style={[styles.chip, form.lead_status === s && styles.chipActive]}
                onPress={() => update('lead_status', s)}
              >
                <Text style={[styles.chipText, form.lead_status === s && styles.chipTextActive]}>
                  {s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          testID="save-post-call-btn"
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : (
            <Text style={styles.saveBtnText}>Save Call Details</Text>
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
  textArea: { height: 100, textAlignVertical: 'top' },
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
