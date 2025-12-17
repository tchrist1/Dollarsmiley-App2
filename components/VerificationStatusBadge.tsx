import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  verificationRealtimeManager,
  getVerificationStatusColor,
  getVerificationStatusLabel,
  type ProfileVerificationUpdate,
} from '@/lib/realtime-verification';

interface VerificationStatusBadgeProps {
  userId: string;
  type?: 'profile' | 'id' | 'business' | 'phone';
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  onStatusChange?: (update: ProfileVerificationUpdate) => void;
}

export function VerificationStatusBadge({
  userId,
  type = 'profile',
  showLabel = true,
  size = 'medium',
  onStatusChange,
}: VerificationStatusBadgeProps) {
  const [status, setStatus] = useState<string>('Unverified');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInitialStatus();

    const unsubscribe = verificationRealtimeManager.subscribeToProfileVerification(
      userId,
      (update) => {
        handleStatusUpdate(update);
        if (onStatusChange) {
          onStatusChange(update);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId, type]);

  const loadInitialStatus = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('profiles')
        .select('verification_status, id_verified, business_verified, phone_verified')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        let currentStatus = 'Unverified';

        switch (type) {
          case 'profile':
            currentStatus = data.verification_status || 'Unverified';
            break;
          case 'id':
            currentStatus = data.id_verified ? 'Verified' : 'Unverified';
            break;
          case 'business':
            currentStatus = data.business_verified ? 'Verified' : 'Unverified';
            break;
          case 'phone':
            currentStatus = data.phone_verified ? 'Verified' : 'Unverified';
            break;
        }

        setStatus(currentStatus);
      }
    } catch (error) {
      console.error('Error loading verification status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = (update: ProfileVerificationUpdate) => {
    let newStatus = 'Unverified';

    switch (type) {
      case 'profile':
        newStatus = update.verification_status || 'Unverified';
        break;
      case 'id':
        newStatus = update.id_verified ? 'Verified' : 'Unverified';
        break;
      case 'business':
        newStatus = update.business_verified ? 'Verified' : 'Unverified';
        break;
      case 'phone':
        newStatus = update.phone_verified ? 'Verified' : 'Unverified';
        break;
    }

    setStatus(newStatus);
  };

  const getIcon = () => {
    const iconSize = size === 'small' ? 16 : size === 'medium' ? 20 : 24;
    const iconColor = getVerificationStatusColor(status);

    switch (status) {
      case 'Verified':
        return <CheckCircle size={iconSize} color={iconColor} />;
      case 'Pending':
      case 'UnderReview':
        return <Clock size={iconSize} color={iconColor} />;
      case 'Rejected':
        return <XCircle size={iconSize} color={iconColor} />;
      default:
        return <AlertCircle size={iconSize} color={iconColor} />;
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.badge, styles[`badge${size}`]]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const badgeColor = getVerificationStatusColor(status);
  const label = getVerificationStatusLabel(status);

  return (
    <View style={[styles.badge, styles[`badge${size}`], { backgroundColor: badgeColor + '20' }]}>
      {getIcon()}
      {showLabel && (
        <Text style={[styles.label, styles[`label${size}`], { color: badgeColor }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

interface VerificationShieldProps {
  userId: string;
  size?: number;
  showTooltip?: boolean;
}

export function VerificationShield({ userId, size = 24, showTooltip = false }: VerificationShieldProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVerificationStatus();

    const unsubscribe = verificationRealtimeManager.subscribeToProfileVerification(
      userId,
      (update) => {
        setIsVerified(update.is_verified || false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const loadVerificationStatus = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setIsVerified(data?.is_verified || false);
    } catch (error) {
      console.error('Error loading verification status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <ActivityIndicator size="small" color={colors.primary} />;
  }

  if (!isVerified) {
    return null;
  }

  return (
    <View style={styles.shieldContainer}>
      <ShieldCheck size={size} color={colors.success} fill={colors.success + '40'} />
      {showTooltip && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>Verified</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  badgesmall: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
  },
  badgemedium: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  badgelarge: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  label: {
    fontWeight: fontWeight.semibold,
  },
  labelsmall: {
    fontSize: fontSize.xs,
  },
  labelmedium: {
    fontSize: fontSize.sm,
  },
  labellarge: {
    fontSize: fontSize.md,
  },
  shieldContainer: {
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    bottom: -24,
    left: '50%',
    transform: [{ translateX: -25 }],
    backgroundColor: colors.text,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  tooltipText: {
    fontSize: fontSize.xs,
    color: colors.white,
  },
});
