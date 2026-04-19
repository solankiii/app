import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';

export default function AdminLayout() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: Colors.surface },
      headerTintColor: Colors.text,
      headerTitleStyle: { fontWeight: '600' },
      tabBarStyle: {
        backgroundColor: Colors.surface,
        borderTopColor: Colors.border,
        height: 60,
        paddingBottom: 6,
      },
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.textMuted,
      tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Dashboard',
        tabBarIcon: ({ color, size }) => <Ionicons name="analytics-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="leads" options={{
        title: 'Leads',
        tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="upload" options={{
        title: 'Upload',
        tabBarIcon: ({ color, size }) => <Ionicons name="cloud-upload-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="calls" options={{
        title: 'Calls',
        tabBarIcon: ({ color, size }) => <Ionicons name="call-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="users" options={{
        title: 'Team',
        tabBarIcon: ({ color, size }) => <Ionicons name="shield-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="bulklead" options={{
        title: 'BulkLead',
        tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="share" options={{
        title: 'QR Share',
        tabBarIcon: ({ color, size }) => <Ionicons name="qr-code-outline" size={size} color={color} />,
        href: null,
      }} />
      <Tabs.Screen name="recordings" options={{
        title: 'Recordings',
        tabBarIcon: ({ color, size }) => <Ionicons name="mic-outline" size={size} color={color} />,
        href: null,
      }} />
      <Tabs.Screen name="follow-ups" options={{
        title: 'Follow-ups',
        tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        href: null,
      }} />
    </Tabs>
  );
}
