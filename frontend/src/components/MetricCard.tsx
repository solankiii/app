import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface Props {
  label: string;
  value: number | string;
  color?: string;
  icon?: React.ReactNode;
}

export default function MetricCard({ label, value, color, icon }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {icon}
        <Text style={[styles.value, color ? { color } : null]}>{value}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    flex: 1,
    minWidth: 140,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  label: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
});
