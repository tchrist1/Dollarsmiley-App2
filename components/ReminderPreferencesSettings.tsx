import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Alert } from 'react-native';
import { Bell, Mail, Smartphone, MessageSquare, Clock } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  getReminderPreferences,
  updateReminderPreferences,
  ReminderPreferences,
} from '@/lib/booking-reminders';
import { Button } from '@/components/Button';

interface PreferenceSetting {
  key: keyof ReminderPreferences;
  label: string;
  description: string;
  icon: any;
}

const REMINDER_SETTINGS: PreferenceSetting[] = [
  {
    key: '24_hour_reminder',
    label: '24-Hour Reminders',
    description: 'Get notified 24 hours before your booking',
    icon: Clock,
  },
  {
    key: '1_hour_reminder',
    label: '1-Hour Reminders',
    description: 'Get notified 1 hour before your booking',
    icon: Bell,
  },
  {
    key: 'day_of_reminder',
    label: 'Day-Of Reminders',
    description: 'Get notified on the morning of your booking',
    icon: Bell,
  },
];

const CHANNEL_SETTINGS: PreferenceSetting[] = [
  {
    key: 'push_reminders',
    label: 'Push Notifications',
    description: 'Receive reminders via push notifications',
    icon: Smartphone,
  },
  {
    key: 'email_reminders',
    label: 'Email Notifications',
    description: 'Receive reminders via email',
    icon: Mail,
  },
  {
    key: 'sms_reminders',
    label: 'SMS Notifications',
    description: 'Receive reminders via text message',
    icon: MessageSquare,
  },
];

export function ReminderPreferencesSettings() {
  const [preferences, setPreferences] = useState<ReminderPreferences>({
    '24_hour_reminder': true,
    '1_hour_reminder': true,
    'day_of_reminder': true,
    'email_reminders': true,
    'push_reminders': true,
    'sms_reminders': false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await getReminderPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('Error', 'Failed to load reminder preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof ReminderPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      await updateReminderPreferences(preferences);
      Alert.alert('Success', 'Reminder preferences updated successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save reminder preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Bell size={32} color={colors.primary} />
        <Text style={styles.headerTitle}>Reminder Preferences</Text>
        <Text style={styles.headerSubtitle}>
          Customize when and how you receive booking reminders
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reminder Timing</Text>
        <Text style={styles.sectionDescription}>
          Choose when you want to receive reminders about your bookings
        </Text>

        {REMINDER_SETTINGS.map((setting) => {
          const Icon = setting.icon;
          return (
            <View key={setting.key} style={styles.settingCard}>
              <View style={styles.settingIcon}>
                <Icon size={24} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{setting.label}</Text>
                <Text style={styles.settingDescription}>{setting.description}</Text>
              </View>
              <Switch
                value={preferences[setting.key]}
                onValueChange={() => handleToggle(setting.key)}
                trackColor={{ false: colors.border, true: colors.primary + '50' }}
                thumbColor={preferences[setting.key] ? colors.primary : colors.textSecondary}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Channels</Text>
        <Text style={styles.sectionDescription}>
          Select how you want to receive your reminders
        </Text>

        {CHANNEL_SETTINGS.map((setting) => {
          const Icon = setting.icon;
          return (
            <View key={setting.key} style={styles.settingCard}>
              <View style={styles.settingIcon}>
                <Icon size={24} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{setting.label}</Text>
                <Text style={styles.settingDescription}>{setting.description}</Text>
              </View>
              <Switch
                value={preferences[setting.key]}
                onValueChange={() => handleToggle(setting.key)}
                trackColor={{ false: colors.border, true: colors.primary + '50' }}
                thumbColor={preferences[setting.key] ? colors.primary : colors.textSecondary}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>About Reminders</Text>
        <Text style={styles.infoText}>
          • 24-hour reminders are sent the day before your booking{'\n'}
          • 1-hour reminders are sent exactly 1 hour before{'\n'}
          • Day-of reminders are sent in the morning of your booking{'\n'}
          • You can disable any reminder type at any time
        </Text>
      </View>

      <Button
        title={saving ? 'Saving...' : 'Save Preferences'}
        onPress={handleSave}
        loading={saving}
        disabled={saving}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  header: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  section: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  settingDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.4,
  },
  infoCard: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.info + '10',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.info + '30',
  },
  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.info,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.info,
    lineHeight: fontSize.sm * 1.6,
  },
});
