import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Calendar, Info } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { WeeklyScheduleEditor } from '@/components/WeeklyScheduleEditor';
import { useAuth } from '@/contexts/AuthContext';

export default function ScheduleEditorScreen() {
  const { profile } = useAuth();

  if (!profile) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Availability Schedule</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.infoCard}>
        <Info size={20} color={colors.primary} />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Set Your Working Hours</Text>
          <Text style={styles.infoText}>
            Define when you're available to accept bookings. You can set different hours for each
            day and add multiple time slots per day.
          </Text>
        </View>
      </View>

      <WeeklyScheduleEditor
        providerId={profile.id}
        onSaved={() => {
          router.back();
        }}
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '10',
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  infoTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    lineHeight: fontSize.xs * 1.5,
  },
});
