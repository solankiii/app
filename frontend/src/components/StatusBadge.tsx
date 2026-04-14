import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusColors } from '../constants/colors';

interface Props {
  status: string;
  small?: boolean;
}

export default function StatusBadge({ status, small }: Props) {
  const colors = StatusColors[status] || { bg: '#F3F4F6', text: '#6B7280' };
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, small && styles.small]}>
      <Text style={[styles.text, { color: colors.text }, small && styles.smallText]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  smallText: {
    fontSize: 10,
  },
});
