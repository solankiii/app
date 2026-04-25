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

const showMsg = (title: string, msg: string) => {
  if (Platform.OS === 'web') window.alert(`${title}: ${msg}`);
  else Alert.alert(title, msg);
};

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

export default function PostCallForm() {
  const { id: sessionId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({
    outcome: '',
    duration_seconds: '',
    call_notes: '',
    lead_status: 'contacted',
    spoc_name: '',
    spoc_email: '',
    spoc_whatsapp: '',
    spoc_mobile: '',
  });
  const [fuDate, setFuDate] = useState('');
  const [fuTime, setFuTime] = useState('10:00');

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.outcome) {
      showMsg('Error', 'Please select a call outcome');
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
      if (fuDate) {
        payload.next_follow_up_at = new Date(`${fuDate}T${fuTime || '10:00'}`).toISOString();
      }
      (['spoc_name', 'spoc_email', 'spoc_whatsapp', 'spoc_mobile'] as const).forEach((k) => {
        const v = form[k]?.trim();
        if (v) payload[k] = v;
      });
      await api.put(`/call-sessions/${sessionId}`, payload);
      showMsg('Success', 'Call session updated');
      router.back();
    } catch (e: any) {
      showMsg('Error', e.response?.data?.detail || 'Failed to save');
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
          <Text style={styles.label}>SPOC Contact (optional)</Text>
          <TextInput
            style={styles.input}
            value={form.spoc_name}
            onChangeText={v => update('spoc_name', v)}
            placeholder="Name"
            autoCapitalize="words"
          />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={form.spoc_email}
            onChangeText={v => update('spoc_email', v)}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={form.spoc_whatsapp}
            onChangeText={v => update('spoc_whatsapp', v)}
            placeholder="WhatsApp number (+91...)"
            keyboardType="phone-pad"
          />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={form.spoc_mobile}
            onChangeText={v => update('spoc_mobile', v)}
            placeholder="Mobile number (+91...)"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Next Follow-up</Text>
          <View style={styles.quickDateRow}>
            {getQuickDates().map(qd => (
              <TouchableOpacity
                key={qd.value}
                style={[styles.quickDateChip, fuDate === qd.value && styles.quickDateChipActive]}
                onPress={() => setFuDate(fuDate === qd.value ? '' : qd.value)}
              >
                <Text style={[styles.quickDateLabel, fuDate === qd.value && styles.activeText]}>{qd.label}</Text>
                <Text style={[styles.quickDateSub, fuDate === qd.value && styles.activeSubText]}>{qd.sublabel}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={fuDate}
            onChangeText={setFuDate}
            placeholder="Or type: YYYY-MM-DD"
          />
          {fuDate ? (
            <View style={styles.timeRow}>
              {['09:00', '10:00', '11:00', '14:00', '16:00', '18:00'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.timeChip, fuTime === t && styles.chipActive]}
                  onPress={() => setFuTime(t)}
                >
                  <Text style={[styles.chipText, fuTime === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
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
  quickDateRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  quickDateChip: {
    flex: 1, minWidth: 70, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
  },
  quickDateChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  quickDateLabel: { fontSize: 12, fontWeight: '600', color: Colors.text },
  quickDateSub: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  activeText: { color: '#FFFFFF' },
  activeSubText: { color: 'rgba(255,255,255,0.8)' },
  timeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  timeChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.primary, height: 48, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
