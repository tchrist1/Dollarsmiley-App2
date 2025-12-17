import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import {
  AlertCircle,
  WifiOff,
  ServerCrash,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Info,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface ErrorStateProps {
  type?: 'error' | 'network' | 'server' | 'notfound' | 'permission';
  title?: string;
  message?: string;
  onRetry?: () => void;
  onBack?: () => void;
  showRetry?: boolean;
  showBack?: boolean;
}

export function ErrorState({
  type = 'error',
  title,
  message,
  onRetry,
  onBack,
  showRetry = true,
  showBack = false,
}: ErrorStateProps) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  const getErrorContent = () => {
    switch (type) {
      case 'network':
        return {
          icon: <WifiOff size={64} color={colors.error} />,
          defaultTitle: 'No Internet Connection',
          defaultMessage: 'Please check your internet connection and try again.',
        };
      case 'server':
        return {
          icon: <ServerCrash size={64} color={colors.error} />,
          defaultTitle: 'Server Error',
          defaultMessage: 'Something went wrong on our end. Please try again later.',
        };
      case 'notfound':
        return {
          icon: <XCircle size={64} color={colors.textSecondary} />,
          defaultTitle: 'Not Found',
          defaultMessage: 'The content you\'re looking for doesn\'t exist.',
        };
      case 'permission':
        return {
          icon: <AlertCircle size={64} color={colors.warning} />,
          defaultTitle: 'Access Denied',
          defaultMessage: 'You don\'t have permission to access this content.',
        };
      default:
        return {
          icon: <AlertCircle size={64} color={colors.error} />,
          defaultTitle: 'Something Went Wrong',
          defaultMessage: 'An unexpected error occurred. Please try again.',
        };
    }
  };

  const content = getErrorContent();

  return (
    <Animated.View style={[styles.container, { transform: [{ scale }] }]}>
      <View style={styles.iconContainer}>{content.icon}</View>
      <Text style={styles.title}>{title || content.defaultTitle}</Text>
      <Text style={styles.message}>{message || content.defaultMessage}</Text>
      <View style={styles.actions}>
        {showRetry && onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <RefreshCw size={20} color={colors.white} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}
        {showBack && onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <ArrowLeft size={20} color={colors.primary} />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

interface InlineErrorProps {
  message: string;
  onDismiss?: () => void;
  type?: 'error' | 'warning' | 'info';
}

export function InlineError({ message, onDismiss, type = 'error' }: InlineErrorProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  const getColor = () => {
    switch (type) {
      case 'warning':
        return colors.warning;
      case 'info':
        return colors.info;
      default:
        return colors.error;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertCircle size={20} color={getColor()} />;
      case 'info':
        return <Info size={20} color={getColor()} />;
      default:
        return <AlertCircle size={20} color={getColor()} />;
    }
  };

  return (
    <Animated.View
      style={[
        styles.inlineError,
        { opacity, borderLeftColor: getColor() }
      ]}
    >
      <View style={styles.inlineErrorContent}>
        {getIcon()}
        <Text style={styles.inlineErrorText}>{message}</Text>
      </View>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <XCircle size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onDismiss?: () => void;
}

export function Toast({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onDismiss,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      handleDismiss();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      case 'warning':
        return colors.warning;
      default:
        return colors.info;
    }
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: getBackgroundColor(),
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Text style={styles.toastText}>{message}</Text>
      <TouchableOpacity onPress={handleDismiss}>
        <XCircle size={20} color={colors.white} />
      </TouchableOpacity>
    </Animated.View>
  );
}

interface FormErrorProps {
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

export function FormErrors({ errors, touched }: FormErrorProps) {
  return (
    <>
      {Object.keys(errors).map(
        key =>
          touched[key] &&
          errors[key] && (
            <InlineError key={key} message={errors[key]} type="error" />
          )
      )}
    </>
  );
}

interface ValidationErrorProps {
  field: string;
  error?: string;
  touched?: boolean;
}

export function ValidationError({ field, error, touched }: ValidationErrorProps) {
  if (!error || !touched) return null;

  return (
    <View style={styles.validationError}>
      <AlertCircle size={16} color={colors.error} />
      <Text style={styles.validationErrorText}>{error}</Text>
    </View>
  );
}

interface NetworkStatusProps {
  isOnline: boolean;
}

export function NetworkStatus({ isOnline }: NetworkStatusProps) {
  const translateY = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isOnline ? 100 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOnline]);

  return (
    <Animated.View
      style={[
        styles.networkStatus,
        { transform: [{ translateY }] }
      ]}
    >
      <WifiOff size={20} color={colors.white} />
      <Text style={styles.networkStatusText}>No Internet Connection</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: fontSize.md * 1.5,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderLeftWidth: 4,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  inlineErrorContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inlineErrorText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  dismissButton: {
    padding: spacing.xs,
  },
  toast: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999,
  },
  toastText: {
    flex: 1,
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  validationError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  validationErrorText: {
    fontSize: fontSize.sm,
    color: colors.error,
  },
  networkStatus: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  networkStatusText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
});
