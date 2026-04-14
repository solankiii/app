import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';

export default function SalesLayout() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: Colors.surface },
      headerTintColor: Colors.text,
      headerTitleStyle: { fontWeight: '600' },
      tabBarStyle: {
        backgroundColor: Colors.surface,
        borderTopColor: Colors.border,
        height: 56,
        paddingBottom: 6,
      },
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.textMuted,
      tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Dashboard',
        tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="leads" options={{
        title: 'Leads',
        tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="follow-ups" options={{
        title: 'Follow-ups',
        tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="sync" options={{
        title: 'Sync',
        tabBarIcon: ({ color, size }) => <Ionicons name="cloud-upload-outline" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
