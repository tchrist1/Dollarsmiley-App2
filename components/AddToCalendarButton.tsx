import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, Alert } from 'react-native';
import { Calendar as CalendarIcon } from 'lucide-react-native';
import {
  addBookingToCalendar,
  CalendarEventDetails,
  formatBookingTitle,
  formatBookingNotes,
  getDefaultAlarms,
} from '@/lib/calendar';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface AddToCalendarButtonProps {
  bookingId: string;
  serviceName: string;
  providerName: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  price?: number;
  onSuccess?: (eventId: string) => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

export function AddToCalendarButton({
  bookingId,
  serviceName,
  providerName,
  startDate,
  endDate,
  location,
  price,
  onSuccess,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
}: AddToCalendarButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleAddToCalendar = async () => {
    setLoading(true);

    try {
      const title = formatBookingTitle(serviceName, providerName);
      const notes = formatBookingNotes(serviceName, providerName, price || 0, location);

      const eventDetails: CalendarEventDetails = {
        title,
        startDate,
        endDate,
        location,
        notes,
        alarms: getDefaultAlarms(),
      };

      const result = await addBookingToCalendar(eventDetails);

      if (result.success && result.eventId) {
        Alert.alert(
          'Added to Calendar',
          'Booking has been added to your calendar with reminders.',
          [{ text: 'OK' }]
        );
        onSuccess?.(result.eventId);
      }
    } catch (error) {
      console.error('Error adding to calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const buttonStyles = [
    styles.button,
    variant === 'primary' && styles.buttonPrimary,
    variant === 'secondary' && styles.buttonSecondary,
    variant === 'outline' && styles.buttonOutline,
    size === 'small' && styles.buttonSmall,
    size === 'large' && styles.buttonLarge,
    fullWidth && styles.buttonFullWidth,
  ];

  const textStyles = [
    styles.buttonText,
    variant === 'primary' && styles.buttonTextPrimary,
    variant === 'secondary' && styles.buttonTextSecondary,
    variant === 'outline' && styles.buttonTextOutline,
    size === 'small' && styles.buttonTextSmall,
    size === 'large' && styles.buttonTextLarge,
  ];

  const iconColor =
    variant === 'primary' ? colors.white : variant === 'outline' ? colors.primary : colors.text;

  const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={handleAddToCalendar}
      disabled={loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} size="small" />
      ) : (
        <>
          <CalendarIcon size={iconSize} color={iconColor} />
          <Text style={textStyles}>Add to Calendar</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonSmall: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttonLarge: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  buttonTextPrimary: {
    color: colors.white,
  },
  buttonTextSecondary: {
    color: colors.text,
  },
  buttonTextOutline: {
    color: colors.primary,
  },
  buttonTextSmall: {
    fontSize: fontSize.sm,
  },
  buttonTextLarge: {
    fontSize: fontSize.lg,
  },
});
