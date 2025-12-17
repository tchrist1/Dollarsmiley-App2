import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Briefcase, Clipboard } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

export default function CreateScreen() {
  const { profile } = useAuth();
  const canCreateListing = profile?.user_type === 'Provider' || profile?.user_type === 'Hybrid';
  const canCreateJob = profile?.user_type === 'Customer' || profile?.user_type === 'Hybrid';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create</Text>
        <Text style={styles.subtitle}>Post a job or create a service listing</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {canCreateJob && (
          <TouchableOpacity
            style={styles.optionCard}
            activeOpacity={0.7}
            onPress={() => router.push('/post-job' as any)}
          >
            <View style={styles.iconContainer}>
              <Clipboard size={32} color={colors.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Post a Job</Text>
              <Text style={styles.optionDescription}>
                Describe what you need and get quotes from local providers
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {canCreateListing && (
          <TouchableOpacity
            style={styles.optionCard}
            activeOpacity={0.7}
            onPress={() => router.push('/create-listing' as any)}
          >
            <View style={styles.iconContainer}>
              <Briefcase size={32} color={colors.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Create Service Listing</Text>
              <Text style={styles.optionDescription}>
                Showcase your services and attract customers
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {!canCreateJob && !canCreateListing && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Please update your profile type to start creating content
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  optionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
