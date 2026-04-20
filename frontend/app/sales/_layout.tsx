import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';

export default function SalesLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarPosition: 'top',
      tabBarStyle: {
        backgroundColor: Colors.surface,
        borderBottomColor: Colors.border,
        borderBottomWidth: 1,
        borderTopWidth: 0,
        height: 56,
        paddingTop: 4,
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
