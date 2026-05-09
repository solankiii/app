import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import api from '@/src/api/client';

// Allowed follow-up time slots (every 30 min, 09:00–20:00 IST)
const TIME_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 9; h <= 20; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 20) out.push(`${String(h).padStart(2, '0')}:30`);
  }
  return out;
})();

// DD-MM-YYYY <-> YYYY-MM-DD helpers
const isoToDdmm = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
};
const ddmmToIso = (ddmm: string) => {
  if (!ddmm) return '';
  const m = ddmm.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
};

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
  // Store the chip's value in DD-MM-YYYY (matches what the user types)
  const fmt = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };
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
    spoc_instagram: '',
    spoc_website: '',
  });
  const [fuDate, setFuDate] = useState('');
  const [fuTime, setFuTime] = useState('10:00');
  const [timePickerOpen, setTimePickerOpen] = useState(false);

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
        const iso = ddmmToIso(fuDate);
        if (!iso) {
          showMsg('Error', 'Follow-up date must be DD-MM-YYYY');
          setLoading(false);
          return;
        }
        payload.next_follow_up_at = new Date(`${iso}T${fuTime || '10:00'}`).toISOString();
      }
      (['spoc_name', 'spoc_email', 'spoc_whatsapp', 'spoc_mobile', 'spoc_instagram', 'spoc_website'] as const).forEach((k) => {
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
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={form.spoc_instagram}
            onChangeText={v => update('spoc_instagram', v)}
            placeholder="Instagram (@handle or URL)"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={form.spoc_website}
            onChangeText={v => update('spoc_website', v)}
            placeholder="Website URL"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
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
            placeholder="Or type: DD-MM-YYYY"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {fuDate ? (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.label}>Time</Text>
              <TouchableOpacity
                testID="fu-time-trigger"
                style={styles.timeTrigger}
                onPress={() => setTimePickerOpen(true)}
              >
                <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.timeTriggerText}>{fuTime}</Text>
                <Ionicons name="chevron-down" size={16} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Time picker modal */}
        <Modal visible={timePickerOpen} transparent animationType="fade" onRequestClose={() => setTimePickerOpen(false)}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setTimePickerOpen(false)}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select time</Text>
              <FlatList
                data={TIME_SLOTS}
                keyExtractor={t => t}
                style={{ maxHeight: 320 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.timeRow, fuTime === item && styles.timeRowActive]}
                    onPress={() => { setFuTime(item); setTimePickerOpen(false); }}
                  >
                    <Text style={[styles.timeRowText, fuTime === item && styles.timeRowTextActive]}>{item}</Text>
                    {fuTime === item ? <Ionicons name="checkmark" size={16} color={Colors.primary} /> : null}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

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
  timeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  timeRowActive: { backgroundColor: '#F0FDF4' },
  timeRowText: { fontSize: 14, color: Colors.text },
  timeRowTextActive: { color: Colors.primary, fontWeight: '600' },
  timeTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 12, height: 44, marginTop: 6,
  },
  timeTriggerText: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', maxWidth: 320, backgroundColor: Colors.surface,
    borderRadius: 12, paddingTop: 14, paddingBottom: 6,
  },
  modalTitle: {
    fontSize: 14, fontWeight: '700', color: Colors.text,
    paddingHorizontal: 14, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
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
