import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Shield, ExternalLink } from 'lucide-react-native';
import { router } from 'expo-router';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface AdminModeToggleProps {
  isAdminMode: boolean;
  onToggle: (value: boolean) => void;
  loading?: boolean;
}

export default function AdminModeToggle({ isAdminMode, onToggle, loading }: AdminModeToggleProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Shield size={24} color={colors.error} />
          <Text style={styles.title}>Admin Mode</Text>
        </View>
        <Switch
          value={isAdminMode}
          onValueChange={onToggle}
          disabled={loading}
          trackColor={{ false: colors.border, true: colors.error }}
          thumbColor={isAdminMode ? colors.white : colors.textLight}
        />
      </View>

      <Text style={styles.description}>
        {isAdminMode
          ? 'Admin tools are active. Account type switcher is hidden.'
          : 'Switch to access admin dashboard and platform management tools.'}
      </Text>

      {isAdminMode && (
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={() => router.push('/admin')}
          activeOpacity={0.7}
        >
          <Text style={styles.dashboardButtonText}>Go to Admin Dashboard</Text>
          <ExternalLink size={16} color={colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  dashboardButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
