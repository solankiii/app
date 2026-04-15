import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { Colors } from '@/src/constants/colors';

function RootNavigator() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inSales = segments[0] === 'sales';
    const inAdmin = segments[0] === 'admin';
    const inApp = inSales || inAdmin;

    if (!user && inApp) {
      router.replace('/');
    } else if (user && !inApp && segments[0] !== 'lead' && segments[0] !== 'add-lead' && segments[0] !== 'post-call' && segments[0] !== 'signup') {
      if (user.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/sales');
      }
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="signup" options={{
          headerShown: true, title: 'Sign Up',
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
        }} />
        <Stack.Screen name="sales" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="add-lead" options={{
          headerShown: true, title: 'Add Lead', presentation: 'modal',
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
        }} />
        <Stack.Screen name="lead/[id]" options={{
          headerShown: true, title: 'Lead Detail',
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
        }} />
        <Stack.Screen name="post-call/[id]" options={{
          headerShown: true, title: 'Post Call Form', presentation: 'modal',
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
        }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
