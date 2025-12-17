import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  initializeSession,
  endSession,
  trackScreenView,
  trackButtonClick,
  trackFormSubmit,
  trackSearch,
  trackFilter,
  trackFeatureUse,
  trackError,
  trackBooking,
  trackSocial,
} from '@/lib/behavior-tracking';

export function useBehaviorTracking() {
  const { user } = useAuth();
  const sessionInitialized = useRef(false);
  const screenStartTime = useRef<number>(Date.now());

  // Initialize session on mount
  useEffect(() => {
    if (!sessionInitialized.current) {
      initializeSession(user?.id);
      sessionInitialized.current = true;
    }

    // End session on unmount
    return () => {
      endSession();
    };
  }, [user]);

  return {
    trackScreenView,
    trackButtonClick,
    trackFormSubmit,
    trackSearch,
    trackFilter,
    trackFeatureUse,
    trackError,
    trackBooking,
    trackSocial,
  };
}

// Hook for tracking screen views with automatic duration
export function useScreenTracking(screenName: string, metadata?: Record<string, any>) {
  const screenStartTime = useRef<number>(Date.now());

  useEffect(() => {
    // Track screen view on mount
    trackScreenView(screenName, metadata);
    screenStartTime.current = Date.now();

    // Track screen exit with duration on unmount
    return () => {
      const durationMs = Date.now() - screenStartTime.current;
      // Could track screen exit here if needed
    };
  }, [screenName]);
}

// Hook for tracking feature usage with duration
export function useFeatureTracking(featureName: string, screenName: string) {
  const startTime = useRef<number>(0);

  const startTracking = useCallback(() => {
    startTime.current = Date.now();
  }, []);

  const endTracking = useCallback(
    (metadata?: Record<string, any>) => {
      if (startTime.current > 0) {
        const durationMs = Date.now() - startTime.current;
        trackFeatureUse(featureName, screenName, durationMs, metadata);
        startTime.current = 0;
      }
    },
    [featureName, screenName]
  );

  return { startTracking, endTracking };
}

// Hook for tracking button clicks
export function useButtonTracking(screenName: string) {
  return useCallback(
    (buttonName: string, metadata?: Record<string, any>) => {
      trackButtonClick(buttonName, screenName, metadata);
    },
    [screenName]
  );
}

// Hook for tracking form submissions
export function useFormTracking(screenName: string) {
  return useCallback(
    (formName: string, success: boolean, metadata?: Record<string, any>) => {
      trackFormSubmit(formName, screenName, success, metadata);
    },
    [screenName]
  );
}

// Hook for tracking searches
export function useSearchTracking(screenName: string) {
  return useCallback(
    (query: string, resultsCount?: number, metadata?: Record<string, any>) => {
      trackSearch(query, screenName, resultsCount, metadata);
    },
    [screenName]
  );
}

// Hook for tracking errors
export function useErrorTracking(screenName: string) {
  return useCallback(
    (errorMessage: string, errorCode: string, metadata?: Record<string, any>) => {
      trackError(errorMessage, errorCode, screenName, metadata);
    },
    [screenName]
  );
}
