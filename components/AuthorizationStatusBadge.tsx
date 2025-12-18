import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react-native';
import { CustomServicePricing } from '@/lib/custom-service-pricing';

interface AuthorizationStatusBadgeProps {
  status: string;
  authorizationExpiresAt?: string;
  paymentCapturedAt?: string;
  size?: 'small' | 'medium' | 'large';
}

export default function AuthorizationStatusBadge({
  status,
  authorizationExpiresAt,
  paymentCapturedAt,
  size = 'medium',
}: AuthorizationStatusBadgeProps) {
  const getStatusInfo = () => {
    if (paymentCapturedAt) {
      return {
        label: 'Captured',
        color: '#3B82F6',
        bgColor: '#DBEAFE',
        icon: CheckCircle,
      };
    }

    if (
      authorizationExpiresAt &&
      CustomServicePricing.isAuthorizationExpired(authorizationExpiresAt)
    ) {
      return {
        label: 'Expired',
        color: '#EF4444',
        bgColor: '#FEE2E2',
        icon: XCircle,
      };
    }

    if (authorizationExpiresAt) {
      const expiryDate = new Date(authorizationExpiresAt);
      const now = new Date();
      const hoursRemaining = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursRemaining < 24) {
        return {
          label: 'Expiring Soon',
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          icon: AlertCircle,
          countdown: `${Math.floor(hoursRemaining)}h left`,
        };
      }

      const daysRemaining = Math.floor(hoursRemaining / 24);
      return {
        label: 'Authorized',
        color: '#059669',
        bgColor: '#D1FAE5',
        icon: Clock,
        countdown: `${daysRemaining}d left`,
      };
    }

    return {
      label: 'Pending',
      color: '#6B7280',
      bgColor: '#F3F4F6',
      icon: Clock,
    };
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  const sizeStyles = {
    small: {
      container: styles.containerSmall,
      icon: 14,
      label: styles.labelSmall,
      countdown: styles.countdownSmall,
    },
    medium: {
      container: styles.containerMedium,
      icon: 16,
      label: styles.labelMedium,
      countdown: styles.countdownMedium,
    },
    large: {
      container: styles.containerLarge,
      icon: 20,
      label: styles.labelLarge,
      countdown: styles.countdownLarge,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <View
      style={[
        styles.container,
        currentSize.container,
        { backgroundColor: statusInfo.bgColor },
      ]}
    >
      <Icon size={currentSize.icon} color={statusInfo.color} />
      <Text style={[currentSize.label, { color: statusInfo.color }]}>
        {statusInfo.label}
      </Text>
      {statusInfo.countdown && (
        <Text style={[currentSize.countdown, { color: statusInfo.color }]}>
          ({statusInfo.countdown})
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  containerSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  containerMedium: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  containerLarge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '600',
  },
  labelMedium: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelLarge: {
    fontSize: 15,
    fontWeight: '600',
  },
  countdownSmall: {
    fontSize: 10,
    fontWeight: '500',
  },
  countdownMedium: {
    fontSize: 11,
    fontWeight: '500',
  },
  countdownLarge: {
    fontSize: 13,
    fontWeight: '500',
  },
});
