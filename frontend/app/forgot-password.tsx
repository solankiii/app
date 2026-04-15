import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import api from '@/src/api/client';

const showMsg = (title: string, msg: string) => {
  if (Platform.OS === 'web') window.alert(`${title}: ${msg}`);
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    if (!email.trim()) { setError('Please enter your email'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setStep('otp');
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      if (detail && typeof detail === 'string' && detail.includes('SMTP')) {
        setError('Email service not configured. Contact your admin to reset your password.');
      } else {
        // Always move to OTP step to prevent email enumeration
        setStep('otp');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) { setError('Please enter the OTP'); return; }
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/verify-reset-otp', {
        email: email.trim(),
        otp: otp.trim(),
        new_password: newPassword,
      });
      setStep('done');
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
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
              {step === 'email' && 'Enter your email to receive a one-time password'}
              {step === 'otp' && `We sent a 6-digit OTP to ${email}`}
              {step === 'done' && 'Your password has been reset!'}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {step === 'email' && (
            <View style={styles.form}>
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
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#FFF" size="small" /> : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {step === 'otp' && (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Enter OTP</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="key-outline" size={18} color={Colors.textMuted} />
                  <TextInput
                    style={[styles.input, { letterSpacing: 6, fontSize: 20, fontWeight: '700' }]}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="000000"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Min 6 characters"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#FFF" size="small" /> : (
                  <Text style={styles.buttonText}>Reset Password</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setStep('email'); setOtp(''); setError(''); }} style={styles.resendBtn}>
                <Text style={styles.resendText}>Didn't receive OTP? Go back & resend</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'done' && (
            <View style={styles.successCard}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
              <Text style={styles.successTitle}>Password Reset!</Text>
              <Text style={styles.successText}>
                You can now sign in with your new password.
              </Text>
              <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
                <Text style={styles.buttonText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          )}

          {step !== 'done' && (
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
    backgroundColor: Colors.dangerBg, padding: 12, borderRadius: 8, marginBottom: 12,
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
  resendBtn: { alignItems: 'center', marginTop: 4 },
  resendText: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
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
