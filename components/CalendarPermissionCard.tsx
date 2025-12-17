import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Calendar from 'expo-calendar';
import { Calendar as CalendarIcon, Check, X, Settings } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import * as Linking from 'expo-linking';

interface CalendarPermissionCardProps {
  onPermissionGranted?: () => void;
  showDetails?: boolean;
}

export function CalendarPermissionCard({
  onPermissionGranted,
  showDetails = true
}: CalendarPermissionCardProps) {
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const { status } = await Calendar.getCalendarPermissionsAsync();

      if (status === 'granted') {
        setPermissionStatus('granted');
      } else if (status === 'denied') {
        setPermissionStatus('denied');
      } else {
        setPermissionStatus('unknown');
      }
    } catch (error) {
      console.error('Error checking calendar permissions:', error);
      setPermissionStatus('unknown');
    }
  };

  const requestPermissions = async () => {
    setLoading(true);

    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();

      if (status === 'granted') {
        setPermissionStatus('granted');
        Alert.alert(
          'Calendar Access Granted',
          'You can now add bookings to your calendar with automatic reminders.',
          [{ text: 'OK' }]
        );
        onPermissionGranted?.();
      } else {
        setPermissionStatus('denied');
        Alert.alert(
          'Calendar Access Denied',
          'Calendar access is required to sync your bookings. You can enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings()
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting calendar permissions:', error);
      Alert.alert('Error', 'Failed to request calendar permissions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openSettings = () => {
    Alert.alert(
      'Enable Calendar Access',
      'To use calendar features, please enable calendar access in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => Linking.openSettings()
        }
      ]
    );
  };

  const getStatusIcon = () => {
    switch (permissionStatus) {
      case 'granted':
        return <Check size={20} color={colors.success} />;
      case 'denied':
        return <X size={20} color={colors.error} />;
      default:
        return <CalendarIcon size={20} color={colors.primary} />;
    }
  };

  const getStatusText = () => {
    switch (permissionStatus) {
      case 'granted':
        return 'Calendar access granted';
      case 'denied':
        return 'Calendar access denied';
      default:
        return 'Calendar access not configured';
    }
  };

  const getStatusColor = () => {
    switch (permissionStatus) {
      case 'granted':
        return colors.success;
      case 'denied':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: getStatusColor() + '15' }]}>
          {getStatusIcon()}
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Calendar Sync</Text>
          <Text style={[styles.status, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>

      {showDetails && (
        <Text style={styles.description}>
          {permissionStatus === 'granted'
            ? 'Your bookings can be automatically added to your device calendar with reminders.'
            : permissionStatus === 'denied'
            ? 'Calendar access is required to sync bookings to your device calendar. Enable it in settings.'
            : 'Allow calendar access to automatically sync confirmed bookings to your device calendar with reminders.'}
        </Text>
      )}

      {permissionStatus !== 'granted' && (
        <TouchableOpacity
          style={[
            styles.button,
            permissionStatus === 'denied' ? styles.buttonSecondary : styles.buttonPrimary
          ]}
          onPress={permissionStatus === 'denied' ? openSettings : requestPermissions}
          disabled={loading}
          activeOpacity={0.7}
        >
          {permissionStatus === 'denied' ? (
            <>
              <Settings size={18} color={colors.text} />
              <Text style={styles.buttonTextSecondary}>Open Settings</Text>
            </>
          ) : (
            <>
              <CalendarIcon size={18} color={colors.white} />
              <Text style={styles.buttonTextPrimary}>
                {loading ? 'Requesting...' : 'Grant Calendar Access'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {permissionStatus === 'granted' && showDetails && (
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Check size={16} color={colors.success} />
            <Text style={styles.featureText}>Automatic booking sync</Text>
          </View>
          <View style={styles.feature}>
            <Check size={16} color={colors.success} />
            <Text style={styles.featureText}>Reminders (1 hour & 1 day before)</Text>
          </View>
          <View style={styles.feature}>
            <Check size={16} color={colors.success} />
            <Text style={styles.featureText}>Service details included</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  status: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
    marginBottom: spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonTextPrimary: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  buttonTextSecondary: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  featuresContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
});
