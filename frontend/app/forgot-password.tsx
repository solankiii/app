import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import api from '@/src/api/client';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
    } catch (_) {
      // Always show success to prevent email enumeration
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.iconBox}>
              <Ionicons name="lock-open-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              {submitted
                ? 'Your admin has been notified'
                : 'Enter your email and we\'ll notify your admin to reset your password'}
            </Text>
          </View>

          {submitted ? (
            <View style={styles.successCard}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
              <Text style={styles.successTitle}>Request Sent</Text>
              <Text style={styles.successText}>
                Contact your admin to get a new password. They can reset it from the Team management screen.
              </Text>
              <TouchableOpacity
                style={styles.button}
                onPress={() => router.replace('/')}
              >
                <Text style={styles.buttonText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@company.com"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Request Reset</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {!submitted && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>Remember your password?</Text>
              <TouchableOpacity onPress={() => router.replace('/')}>
                <Text style={styles.footerLink}> Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  iconBox: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.successBg, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  form: { gap: 16 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.dangerBg, padding: 12, borderRadius: 8,
  },
  errorText: { color: Colors.danger, fontSize: 13, flex: 1 },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 12, height: 48,
  },
  input: { flex: 1, fontSize: 15, color: Colors.text },
  button: {
    backgroundColor: Colors.primary, height: 48, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  successCard: { alignItems: 'center', gap: 12, padding: 24 },
  successTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  successText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  footer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 32,
  },
  footerText: { fontSize: 13, color: Colors.textMuted },
  footerLink: { fontSize: 13, fontWeight: '600', color: Colors.primary },
});
