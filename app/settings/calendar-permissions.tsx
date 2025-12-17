import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Calendar, Bell, CheckCircle, PlayCircle } from 'lucide-react-native';
import { CalendarPermissionCard } from '@/components/CalendarPermissionCard';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import CalendarOnboardingFlow from '@/components/CalendarOnboardingFlow';
import { useCalendarOnboarding } from '@/hooks/useCalendarOnboarding';

export default function CalendarPermissionsScreen() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const calendarOnboarding = useCalendarOnboarding();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar Permissions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoSection}>
          <Calendar size={48} color={colors.primary} />
          <Text style={styles.infoTitle}>Sync Bookings to Your Calendar</Text>
          <Text style={styles.infoDescription}>
            Enable calendar access to automatically add confirmed bookings to your device calendar
            with helpful reminders.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.onboardingButton}
          onPress={() => calendarOnboarding.showOnboarding()}
        >
          <PlayCircle size={24} color={colors.white} />
          <Text style={styles.onboardingButtonText}>View Setup Guide</Text>
        </TouchableOpacity>

        <CalendarPermissionCard
          onPermissionGranted={() => setPermissionGranted(true)}
          showDetails={true}
        />

        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>Why Enable Calendar Access?</Text>

          <View style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <Bell size={24} color={colors.primary} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Never Miss an Appointment</Text>
              <Text style={styles.benefitDescription}>
                Get reminders 1 hour and 1 day before your scheduled service.
              </Text>
            </View>
          </View>

          <View style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <Calendar size={24} color={colors.primary} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>All Details in One Place</Text>
              <Text style={styles.benefitDescription}>
                Service name, provider info, location, and price are included in the calendar event.
              </Text>
            </View>
          </View>

          <View style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <CheckCircle size={24} color={colors.primary} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Automatic Sync</Text>
              <Text style={styles.benefitDescription}>
                Confirmed bookings are automatically added to your calendar with one tap.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.privacySection}>
          <Text style={styles.privacyTitle}>Your Privacy Matters</Text>
          <Text style={styles.privacyText}>
            Calendar access is only used to add your bookings. We never read or access your other
            calendar events. You can revoke access at any time in your device settings.
          </Text>
        </View>
      </ScrollView>

      <CalendarOnboardingFlow
        visible={calendarOnboarding.shouldShow}
        onComplete={calendarOnboarding.markCompleted}
        onSkip={calendarOnboarding.markSkipped}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  infoSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  infoDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.md * 1.5,
    paddingHorizontal: spacing.lg,
  },
  benefitsSection: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  benefitsTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  benefit: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  benefitDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },
  privacySection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  privacyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  privacyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },
  onboardingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  onboardingButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
