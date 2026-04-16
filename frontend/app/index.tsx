import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { Colors } from '@/src/constants/colors';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Invalid email or password');
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
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>AHM</Text>
            </View>
            <Text style={styles.title}>AHM Sales CRM</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={Colors.textMuted} />
                <TextInput
                  testID="login-email-input"
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
                <TextInput
                  testID="login-password-input"
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity testID="toggle-password-btn" onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              testID="login-submit-btn"
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/forgot-password')} style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.footerLink}> Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoBox: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 22, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: 1,
  },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
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
  forgotBtn: { alignItems: 'center', marginTop: 4 },
  forgotText: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
  footer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 48, paddingTop: 24,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  footerText: { fontSize: 13, color: Colors.textMuted },
  footerLink: { fontSize: 13, fontWeight: '600', color: Colors.primary },
});
