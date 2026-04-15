import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/src/constants/colors';
import api from '@/src/api/client';

const showMessage = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function UploadLeadsScreen() {
  const [salesUsers, setSalesUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    api.get('/users/sales').then(res => setSalesUsers(res.data || [])).catch(() => {});
  }, []);

  const pickAndUpload = async () => {
    try {
      const doc = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });
      if (doc.canceled || !doc.assets?.length) return;
      const file = doc.assets[0];

      setUploading(true);
      setResult(null);

      const formData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        formData.append('file', blob, file.name || 'leads.csv');
      } else {
        formData.append('file', {
          uri: file.uri,
          name: file.name || 'leads.csv',
          type: 'text/csv',
        } as any);
      }

      if (selectedUser) {
        formData.append('assigned_to', selectedUser);
      }

      // Get auth token and backend URL
      const token = await AsyncStorage.getItem('auth_token');
      const baseURL = (api.defaults.baseURL || '').replace(/\/api$/, '');

      if (Platform.OS === 'web') {
        // Use native fetch on web — axios mangles FormData
        const fetchRes = await fetch(`${baseURL}/api/leads/upload-csv`, {
          method: 'POST',
          headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          body: formData,
        });
        const data = await fetchRes.json();
        if (!fetchRes.ok) throw new Error(data.detail || `Upload failed (${fetchRes.status})`);
        setResult(data);
        if (data.created > 0) showMessage('Success', `${data.created} leads imported!`);
      } else {
        const res = await api.post('/leads/upload-csv', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000,
        });
        setResult(res.data);
        if (res.data.created > 0) showMessage('Success', `${res.data.created} leads imported!`);
      }
    } catch (e: any) {
      console.error('Upload error:', e);
      showMessage('Error', e.response?.data?.detail || e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.infoCard}>
        <Ionicons name="cloud-upload" size={24} color={Colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>Bulk Import Leads</Text>
          <Text style={styles.infoText}>
            Upload a CSV file with columns: full_name, phone_number, company_name, city, source, industry, notes
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Assign To (Optional)</Text>
      <Text style={styles.hint}>Pre-assign all imported leads to a sales rep. You can also bulk-assign later from the Leads tab.</Text>

      <View style={styles.chipRow}>
        <TouchableOpacity
          style={[styles.chip, !selectedUser && styles.chipActive]}
          onPress={() => setSelectedUser(null)}
        >
          <Text style={[styles.chipText, !selectedUser && styles.chipTextActive]}>Unassigned</Text>
        </TouchableOpacity>
        {salesUsers.map(u => (
          <TouchableOpacity
            key={u.id}
            style={[styles.chip, selectedUser === u.id && styles.chipActive]}
            onPress={() => setSelectedUser(u.id)}
          >
            <Text style={[styles.chipText, selectedUser === u.id && styles.chipTextActive]}>
              {u.full_name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.uploadBtn, uploading && { opacity: 0.6 }]}
        onPress={pickAndUpload}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="document-attach" size={20} color="#FFFFFF" />
            <Text style={styles.uploadBtnText}>Select CSV File & Upload</Text>
          </>
        )}
      </TouchableOpacity>

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Import Results</Text>
          <View style={styles.resultRow}>
            <Text style={[styles.resultVal, { color: Colors.success }]}>{result.created}</Text>
            <Text style={styles.resultLabel}>Created</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={[styles.resultVal, { color: Colors.warning }]}>{result.skipped}</Text>
            <Text style={styles.resultLabel}>Skipped</Text>
          </View>
          {result.errors?.length > 0 && (
            <View style={styles.errorList}>
              {result.errors.map((err: string, i: number) => (
                <Text key={i} style={styles.errorItem}>{err}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.templateCard}>
        <Text style={styles.templateTitle}>CSV Template</Text>
        <Text style={styles.templateText}>
          {`full_name,phone_number,company_name,city,source,industry,notes\nJohn Doe,+919999999999,Acme Corp,Mumbai,website,Technology,Interested in demo\nJane Smith,+918888888888,Global Ltd,Delhi,referral,Finance,Follow up next week`}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  infoCard: {
    flexDirection: 'row', gap: 12, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    padding: 16, marginBottom: 20,
  },
  infoTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  infoText: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  hint: { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textMuted },
  chipTextActive: { color: '#FFFFFF' },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, height: 50, borderRadius: 8, marginBottom: 20,
  },
  uploadBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  resultCard: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 16, marginBottom: 16,
  },
  resultTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  resultVal: { fontSize: 20, fontWeight: '700' },
  resultLabel: { fontSize: 13, color: Colors.textMuted },
  errorList: { marginTop: 8, padding: 8, backgroundColor: Colors.dangerBg, borderRadius: 6 },
  errorItem: { fontSize: 11, color: Colors.danger, marginBottom: 2 },
  templateCard: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 16,
  },
  templateTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  templateText: { fontSize: 11, color: Colors.textMuted, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
});
