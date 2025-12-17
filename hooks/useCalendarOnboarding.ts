import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkCalendarPermissions } from '@/lib/calendar';

const ONBOARDING_KEY = '@calendar_onboarding_completed';
const SKIP_KEY = '@calendar_onboarding_skipped';
const SKIP_COUNT_KEY = '@calendar_onboarding_skip_count';

export interface CalendarOnboardingState {
  shouldShow: boolean;
  showOnboarding: () => void;
  hideOnboarding: () => void;
  markCompleted: (granted: boolean) => Promise<void>;
  markSkipped: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

export function useCalendarOnboarding(): CalendarOnboardingState {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    checkIfShouldShow();
  }, []);

  const checkIfShouldShow = async () => {
    try {
      // Check if onboarding was already completed
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (completed === 'true') {
        return;
      }

      // Check if user has calendar permissions already
      const permissionStatus = await checkCalendarPermissions();
      if (permissionStatus === 'granted') {
        // Mark as completed if permission already granted
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        return;
      }

      // Check if user skipped recently
      const skipped = await AsyncStorage.getItem(SKIP_KEY);
      const skipCount = await AsyncStorage.getItem(SKIP_COUNT_KEY);

      if (skipped === 'true') {
        const skipCountNum = parseInt(skipCount || '0', 10);

        // Show again after 3 skips (remind periodically)
        if (skipCountNum < 3) {
          return;
        }
      }

      // All checks passed, show onboarding
      setShouldShow(true);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const showOnboarding = () => {
    setShouldShow(true);
  };

  const hideOnboarding = () => {
    setShouldShow(false);
  };

  const markCompleted = async (granted: boolean) => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      await AsyncStorage.removeItem(SKIP_KEY);
      await AsyncStorage.removeItem(SKIP_COUNT_KEY);
      setShouldShow(false);
    } catch (error) {
      console.error('Error marking onboarding as completed:', error);
    }
  };

  const markSkipped = async () => {
    try {
      await AsyncStorage.setItem(SKIP_KEY, 'true');

      // Increment skip count
      const skipCount = await AsyncStorage.getItem(SKIP_COUNT_KEY);
      const newCount = parseInt(skipCount || '0', 10) + 1;
      await AsyncStorage.setItem(SKIP_COUNT_KEY, newCount.toString());

      setShouldShow(false);
    } catch (error) {
      console.error('Error marking onboarding as skipped:', error);
    }
  };

  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_KEY);
      await AsyncStorage.removeItem(SKIP_KEY);
      await AsyncStorage.removeItem(SKIP_COUNT_KEY);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  };

  return {
    shouldShow,
    showOnboarding,
    hideOnboarding,
    markCompleted,
    markSkipped,
    resetOnboarding,
  };
}

// Trigger points for calendar onboarding
export const CALENDAR_ONBOARDING_TRIGGERS = {
  FIRST_BOOKING_CONFIRMED: 'first_booking_confirmed',
  BOOKINGS_TAB_VISIT: 'bookings_tab_visit',
  MANUAL_TRIGGER: 'manual_trigger',
} as const;

export type CalendarOnboardingTrigger = typeof CALENDAR_ONBOARDING_TRIGGERS[keyof typeof CALENDAR_ONBOARDING_TRIGGERS];

// Helper to check if onboarding should be triggered at specific points
export async function shouldTriggerOnboarding(
  trigger: CalendarOnboardingTrigger
): Promise<boolean> {
  try {
    // Check if already completed
    const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
    if (completed === 'true') {
      return false;
    }

    // Check permission status
    const permissionStatus = await checkCalendarPermissions();
    if (permissionStatus === 'granted') {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      return false;
    }

    // Check if recently skipped
    const skipped = await AsyncStorage.getItem(SKIP_KEY);
    const skipCount = await AsyncStorage.getItem(SKIP_COUNT_KEY);
    const skipCountNum = parseInt(skipCount || '0', 10);

    if (skipped === 'true' && skipCountNum < 3) {
      return false;
    }

    // Trigger-specific logic
    switch (trigger) {
      case CALENDAR_ONBOARDING_TRIGGERS.FIRST_BOOKING_CONFIRMED:
        // Always trigger on first booking confirmation
        return true;

      case CALENDAR_ONBOARDING_TRIGGERS.BOOKINGS_TAB_VISIT:
        // Trigger if user has visited bookings tab multiple times
        const visitCount = await AsyncStorage.getItem('@bookings_visit_count');
        const visitCountNum = parseInt(visitCount || '0', 10);

        // Increment visit count
        await AsyncStorage.setItem('@bookings_visit_count', (visitCountNum + 1).toString());

        // Show after 2nd visit
        return visitCountNum >= 1;

      case CALENDAR_ONBOARDING_TRIGGERS.MANUAL_TRIGGER:
        // Always show when manually triggered
        return true;

      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking trigger conditions:', error);
    return false;
  }
}
