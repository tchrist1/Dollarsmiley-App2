import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import {
  Bell,
  BellOff,
  Mail,
  Smartphone,
  MessageSquare,
  Clock,
  Settings,
  Sparkles,
  CheckCircle,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
  type NotificationChannel,
  type NotificationCategory,
  type FrequencyPreference,
} from '@/lib/smart-notifications';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function NotificationPreferencesManager() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const prefs = await getNotificationPreferences(user.id);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!user?.id || !preferences) return;

    setSaving(true);
    try {
      const result = await updateNotificationPreferences(user.id, updates);
      if (result.success) {
        setPreferences({ ...preferences, ...updates });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = (channel: NotificationChannel) => {
    if (!preferences) return;

    const newChannelPrefs = {
      ...preferences.channel_preferences,
      [channel]: !preferences.channel_preferences[channel],
    };

    savePreferences({ channel_preferences: newChannelPrefs });
  };

  const toggleCategory = (category: NotificationCategory) => {
    if (!preferences) return;

    const newCategories = preferences.categories_enabled.includes(category)
      ? preferences.categories_enabled.filter((c) => c !== category)
      : [...preferences.categories_enabled, category];

    savePreferences({ categories_enabled: newCategories });
  };

  const setFrequency = (frequency: FrequencyPreference) => {
    savePreferences({ frequency_preference: frequency });
  };

  const toggleSmartSuggestions = () => {
    if (!preferences) return;
    savePreferences({
      smart_suggestions_enabled: !preferences.smart_suggestions_enabled,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  if (!preferences) {
    return (
      <View style={styles.errorContainer}>
        <BellOff size={48} color={colors.textSecondary} />
        <Text style={styles.errorText}>Unable to load preferences</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Success Message */}
      {showSuccess && (
        <View style={styles.successBanner}>
          <CheckCircle size={20} color={colors.success} />
          <Text style={styles.successText}>Preferences saved</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Bell size={32} color={colors.primary} />
        <Text style={styles.headerTitle}>Notification Preferences</Text>
        <Text style={styles.headerSubtitle}>
          Customize how and when you receive notifications
        </Text>
      </View>

      {/* Smart Suggestions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Sparkles size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Smart Suggestions</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Let our AI suggest the best times to notify you based on your activity
        </Text>
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceLeft}>
            <Text style={styles.preferenceLabel}>Enable Smart Suggestions</Text>
            <Text style={styles.preferenceDescription}>
              AI-powered notification timing
            </Text>
          </View>
          <Switch
            value={preferences.smart_suggestions_enabled}
            onValueChange={toggleSmartSuggestions}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      {/* Notification Channels */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Settings size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Channels</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Choose how you want to receive notifications
        </Text>

        <View style={styles.channelList}>
          <View style={styles.channelRow}>
            <Mail size={20} color={colors.text} />
            <View style={styles.channelInfo}>
              <Text style={styles.channelLabel}>Email</Text>
              <Text style={styles.channelDescription}>Receive notifications via email</Text>
            </View>
            <Switch
              value={preferences.channel_preferences.email}
              onValueChange={() => toggleChannel('email')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.channelRow}>
            <Smartphone size={20} color={colors.text} />
            <View style={styles.channelInfo}>
              <Text style={styles.channelLabel}>Push Notifications</Text>
              <Text style={styles.channelDescription}>
                Receive push notifications on your device
              </Text>
            </View>
            <Switch
              value={preferences.channel_preferences.push}
              onValueChange={() => toggleChannel('push')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.channelRow}>
            <MessageSquare size={20} color={colors.text} />
            <View style={styles.channelInfo}>
              <Text style={styles.channelLabel}>SMS</Text>
              <Text style={styles.channelDescription}>
                Receive text message notifications
              </Text>
            </View>
            <Switch
              value={preferences.channel_preferences.sms}
              onValueChange={() => toggleChannel('sms')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.channelRow}>
            <Bell size={20} color={colors.text} />
            <View style={styles.channelInfo}>
              <Text style={styles.channelLabel}>In-App</Text>
              <Text style={styles.channelDescription}>
                Show notifications within the app
              </Text>
            </View>
            <Switch
              value={preferences.channel_preferences.in_app}
              onValueChange={() => toggleChannel('in_app')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>
      </View>

      {/* Frequency */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Clock size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Frequency</Text>
        </View>
        <Text style={styles.sectionDescription}>
          How often do you want to receive notifications?
        </Text>

        <View style={styles.frequencyList}>
          {(['instant', 'hourly', 'daily', 'weekly'] as FrequencyPreference[]).map(
            (freq) => (
              <TouchableOpacity
                key={freq}
                style={[
                  styles.frequencyOption,
                  preferences.frequency_preference === freq &&
                    styles.frequencyOptionActive,
                ]}
                onPress={() => setFrequency(freq)}
              >
                <Text
                  style={[
                    styles.frequencyLabel,
                    preferences.frequency_preference === freq &&
                      styles.frequencyLabelActive,
                  ]}
                >
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Bell size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Categories</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Choose which types of notifications you want to receive
        </Text>

        <View style={styles.categoryList}>
          {(
            [
              { key: 'booking', label: 'Bookings', description: 'Updates about your bookings' },
              { key: 'message', label: 'Messages', description: 'New messages from providers' },
              { key: 'payment', label: 'Payments', description: 'Payment confirmations and receipts' },
              { key: 'review', label: 'Reviews', description: 'Review requests and responses' },
              { key: 'recommendation', label: 'Recommendations', description: 'Personalized suggestions' },
              { key: 'promotion', label: 'Promotions', description: 'Special offers and deals' },
            ] as Array<{ key: NotificationCategory; label: string; description: string }>
          ).map(({ key, label, description }) => (
            <TouchableOpacity
              key={key}
              style={styles.categoryRow}
              onPress={() => toggleCategory(key)}
            >
              <View
                style={[
                  styles.categoryCheckbox,
                  preferences.categories_enabled.includes(key) &&
                    styles.categoryCheckboxActive,
                ]}
              >
                {preferences.categories_enabled.includes(key) && (
                  <CheckCircle size={16} color={colors.primary} />
                )}
              </View>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryLabel}>{label}</Text>
                <Text style={styles.categoryDescription}>{description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Saving Indicator */}
      {saving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.success + '20',
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  successText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.success,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
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
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  preferenceLeft: {
    flex: 1,
  },
  preferenceLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  preferenceDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  channelList: {
    gap: spacing.md,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  channelInfo: {
    flex: 1,
  },
  channelLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  channelDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  frequencyList: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  frequencyOptionActive: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  frequencyLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  frequencyLabelActive: {
    color: colors.primary,
  },
  categoryList: {
    gap: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryCheckbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCheckboxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  categoryDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  savingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
