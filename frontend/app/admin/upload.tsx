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
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    api.get('/users/sales').then(res => setSalesUsers(res.data || [])).catch(() => {});
  }, []);

  const pickAndUpload = async () => {
    setDebugLog([]);

    try {
      const baseURL = api.defaults.baseURL || '';
      const token = await AsyncStorage.getItem('auth_token');
      addLog(`baseURL: "${baseURL}"`);
      addLog(`token present: ${!!token}, length: ${token?.length || 0}`);
      addLog(`Platform: ${Platform.OS}`);

      const doc = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });
      if (doc.canceled || !doc.assets?.length) {
        addLog('File picker cancelled');
        return;
      }
      const file = doc.assets[0];
      addLog(`File: ${file.name}, size: ${file.size}, type: ${file.mimeType}`);
      addLog(`File URI: ${file.uri?.substring(0, 80)}...`);

      setUploading(true);
      setResult(null);

      const uploadUrl = `${baseURL}/leads/upload-csv`;
      addLog(`Upload URL: "${uploadUrl}"`);

      // First test: can we even reach the backend?
      try {
        const healthUrl = baseURL.replace(/\/api$/, '') + '/health';
        addLog(`Testing connectivity: ${healthUrl}`);
        const healthRes = await fetch(healthUrl);
        const healthData = await healthRes.text();
        addLog(`Health check: ${healthRes.status} - ${healthData}`);
      } catch (healthErr: any) {
        addLog(`Health check FAILED: ${healthErr.message}`);
      }

      const formData = new FormData();

      if (Platform.OS === 'web') {
        // Get the file as blob
        const response = await fetch(file.uri);
        const blob = await response.blob();
        addLog(`Blob created: size=${blob.size}, type=${blob.type}`);
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

      // Use XMLHttpRequest on web for maximum compatibility
      if (Platform.OS === 'web') {
        addLog('Using XMLHttpRequest for upload...');
        const xhrResult = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', uploadUrl);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.timeout = 60000;

          xhr.onload = () => {
            addLog(`XHR status: ${xhr.status}`);
            addLog(`XHR response: ${xhr.responseText.substring(0, 200)}`);
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch {
                reject(new Error(`Invalid JSON: ${xhr.responseText.substring(0, 100)}`));
              }
            } else {
              reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText.substring(0, 200)}`));
            }
          };

          xhr.onerror = () => {
            addLog(`XHR onerror triggered. readyState: ${xhr.readyState}, status: ${xhr.status}`);
            reject(new Error(`XHR Network Error (readyState: ${xhr.readyState})`));
          };

          xhr.ontimeout = () => {
            addLog('XHR timeout');
            reject(new Error('Upload timed out'));
          };

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              addLog(`Upload progress: ${Math.round((e.loaded / e.total) * 100)}%`);
            }
          };

          xhr.send(formData);
        });

        setResult(xhrResult);
        if (xhrResult.created > 0) showMessage('Success', `${xhrResult.created} leads imported!`);
      } else {
        // Mobile: use axios as before
        const res = await api.post('/leads/upload-csv', formData, {
          timeout: 60000,
        });
        setResult(res.data);
        if (res.data.created > 0) showMessage('Success', `${res.data.created} leads imported!`);
      }
    } catch (e: any) {
      console.error('Upload error:', e);
      addLog(`ERROR: ${e.message}`);
      if (e.response) {
        addLog(`Response status: ${e.response.status}`);
        addLog(`Response data: ${JSON.stringify(e.response.data).substring(0, 200)}`);
      }
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

      {debugLog.length > 0 && (
        <View style={styles.debugCard}>
          <Text style={styles.debugTitle}>Debug Log</Text>
          {debugLog.map((log, i) => (
            <Text key={i} style={styles.debugText} selectable>{log}</Text>
          ))}
        </View>
      )}

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
  debugCard: {
    backgroundColor: '#1a1a2e', borderRadius: 8, padding: 12, marginBottom: 16,
  },
  debugTitle: { fontSize: 13, fontWeight: '700', color: '#00ff88', marginBottom: 8 },
  debugText: { fontSize: 10, color: '#e0e0e0', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined, marginBottom: 2 },
});
