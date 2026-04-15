import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Share, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import QRCode from 'react-native-qrcode-svg';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function ShareScreen() {
  const [appUrl, setAppUrl] = useState(WEB_URL);
  const [expoUrl, setExpoUrl] = useState(
    BACKEND_URL ? BACKEND_URL.replace('https://', 'exp://').replace('http://', 'exp://') : ''
  );

  const shareLink = async (url: string) => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(url);
        Alert.alert('Copied!', 'Link copied to clipboard');
      } else {
        await Share.share({ message: `Open AHM Sales CRM: ${url}` });
      }
    } catch (_) {}
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>ah</Text>
        </View>
        <Text style={styles.title}>Share AHM Sales CRM</Text>
        <Text style={styles.subtitle}>Let your team scan this QR to open the app</Text>
      </View>

      {/* Expo Go QR */}
      <View style={styles.qrCard}>
        <Text style={styles.qrLabel}>Mobile (Expo Go)</Text>
        <Text style={styles.qrHint}>Scan with Expo Go app on iOS / Android</Text>
        <View style={styles.qrWrap}>
          <QRCode value={expoUrl} size={200} backgroundColor="#FFFFFF" color="#0A0A0A" />
        </View>
        <Text style={styles.urlText}>{expoUrl}</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={() => shareLink(expoUrl)}>
          <Ionicons name="share-outline" size={16} color="#FFFFFF" />
          <Text style={styles.shareBtnText}>Share Link</Text>
        </TouchableOpacity>
      </View>

      {/* Web QR */}
      <View style={styles.qrCard}>
        <Text style={styles.qrLabel}>Web Browser</Text>
        <Text style={styles.qrHint}>Open this URL in any browser</Text>
        <View style={styles.qrWrap}>
          <QRCode value={appUrl} size={200} backgroundColor="#FFFFFF" color="#0A0A0A" />
        </View>
        <Text style={styles.urlText}>{appUrl}</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={() => shareLink(appUrl)}>
          <Ionicons name="copy-outline" size={16} color="#FFFFFF" />
          <Text style={styles.shareBtnText}>Copy Link</Text>
        </TouchableOpacity>
      </View>

      {/* Custom URL */}
      <View style={styles.customCard}>
        <Text style={styles.customTitle}>Custom URL</Text>
        <Text style={styles.qrHint}>Set a deployed URL (Vercel, Netlify, etc.) to generate a shareable QR</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.urlInput}
            value={appUrl}
            onChangeText={(v) => {
              setAppUrl(v);
              setExpoUrl(v.replace('http://', 'exp://').replace('https://', 'exp://'));
            }}
            placeholder="https://your-app.vercel.app"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructTitle}>How to join</Text>
        <View style={styles.step}>
          <Text style={styles.stepNum}>1</Text>
          <Text style={styles.stepText}>Install "Expo Go" from App Store / Play Store</Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNum}>2</Text>
          <Text style={styles.stepText}>Scan the QR code above with Expo Go</Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNum}>3</Text>
          <Text style={styles.stepText}>Sign up with your email and start using the CRM</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24 },
  logoBox: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: { fontSize: 24, fontWeight: '300', color: '#FFFFFF', fontStyle: 'italic', letterSpacing: -1 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  qrCard: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 20, marginBottom: 16, alignItems: 'center',
  },
  qrLabel: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  qrHint: { fontSize: 12, color: Colors.textMuted, marginBottom: 16, textAlign: 'center' },
  qrWrap: {
    padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  urlText: {
    fontSize: 12, color: Colors.textMuted, marginTop: 12,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    textAlign: 'center',
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 8, marginTop: 12,
  },
  shareBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  customCard: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 16, marginBottom: 16,
  },
  customTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  inputRow: { marginTop: 10 },
  urlInput: {
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 14, color: Colors.text,
  },
  instructions: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 16,
  },
  instructTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary,
    color: '#FFFFFF', fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 28,
    overflow: 'hidden',
  },
  stepText: { flex: 1, fontSize: 13, color: Colors.text },
});
