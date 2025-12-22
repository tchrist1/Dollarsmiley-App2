import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Briefcase, Wrench, Palette } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface BrandedVehicleMarkerProps {
  serviceType: 'job' | 'service' | 'custom_service';
  profilePhoto?: string | null;
  profileName?: string;
  heading?: number;
  status: 'on_the_way' | 'arriving_soon' | 'arrived' | 'signal_lost';
  lastUpdateTime?: Date;
}

const SERVICE_BUBBLE_COLORS = {
  job: colors.info,
  service: colors.primary,
  custom_service: colors.accent,
};

const SERVICE_BUBBLE_ICONS = {
  job: Briefcase,
  service: Wrench,
  custom_service: Palette,
};

const SERVICE_LABELS = {
  job: 'Job',
  service: 'Service',
  custom_service: 'Custom',
};

export function BrandedVehicleMarker({
  serviceType,
  profilePhoto,
  profileName,
  heading = 0,
  status,
  lastUpdateTime,
}: BrandedVehicleMarkerProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === 'arriving_soon') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [status]);

  const BubbleIcon = SERVICE_BUBBLE_ICONS[serviceType];
  const bubbleColor = SERVICE_BUBBLE_COLORS[serviceType];
  const isSignalLost = status === 'signal_lost';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: pulseAnim }, { rotate: `${heading}deg` }] },
        isSignalLost && styles.signalLost,
      ]}
    >
      {status === 'arriving_soon' && (
        <Animated.View
          style={[
            styles.glowRing,
            { opacity: glowOpacity },
          ]}
        />
      )}

      <View style={styles.serviceBubble}>
        <View style={[styles.bubbleInner, { backgroundColor: bubbleColor }]}>
          <BubbleIcon size={12} color={colors.white} strokeWidth={2.5} />
        </View>
        <View style={[styles.bubblePointer, { borderTopColor: bubbleColor }]} />
      </View>

      <View style={styles.vehicleBody}>
        <View style={styles.vehicleTop} />

        <View style={styles.vehicleMain}>
          <View style={styles.driverWindow}>
            {profilePhoto ? (
              <Image
                source={{ uri: profilePhoto }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.initialsContainer}>
                <Text style={styles.initials}>
                  {profileName ? getInitials(profileName) : '?'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.vehicleBottom}>
          <View style={styles.wheelLeft} />
          <View style={styles.wheelRight} />
        </View>
      </View>

      {status === 'arrived' && (
        <View style={styles.arrivedBadge}>
          <Text style={styles.arrivedText}>Arrived</Text>
        </View>
      )}

      {isSignalLost && lastUpdateTime && (
        <View style={styles.signalLostBadge}>
          <Text style={styles.signalLostText}>
            {Math.floor((Date.now() - lastUpdateTime.getTime()) / 1000)}s ago
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

export function StaticVehicleMarker({
  serviceType,
  profilePhoto,
  profileName,
  status,
}: Omit<BrandedVehicleMarkerProps, 'heading' | 'lastUpdateTime'>) {
  const BubbleIcon = SERVICE_BUBBLE_ICONS[serviceType];
  const bubbleColor = SERVICE_BUBBLE_COLORS[serviceType];
  const isArrived = status === 'arrived';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <View style={styles.staticContainer}>
      <View style={[styles.staticBubble, { backgroundColor: bubbleColor }]}>
        <BubbleIcon size={14} color={colors.white} strokeWidth={2.5} />
      </View>

      <View style={styles.staticAvatar}>
        {profilePhoto ? (
          <Image source={{ uri: profilePhoto }} style={styles.staticProfileImage} />
        ) : (
          <View style={styles.staticInitialsContainer}>
            <Text style={styles.staticInitials}>
              {profileName ? getInitials(profileName) : '?'}
            </Text>
          </View>
        )}
      </View>

      {isArrived && (
        <View style={styles.staticArrivedDot} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 80,
  },
  signalLost: {
    opacity: 0.5,
  },
  glowRing: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primaryLight,
    top: 5,
  },
  serviceBubble: {
    alignItems: 'center',
    marginBottom: -4,
    zIndex: 10,
  },
  bubbleInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  bubblePointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  vehicleBody: {
    alignItems: 'center',
  },
  vehicleTop: {
    width: 32,
    height: 8,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  vehicleMain: {
    width: 44,
    height: 28,
    backgroundColor: colors.primary,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  driverWindow: {
    width: 28,
    height: 20,
    backgroundColor: colors.primaryLight,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  initialsContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  vehicleBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 44,
    marginTop: 2,
  },
  wheelLeft: {
    width: 10,
    height: 6,
    backgroundColor: colors.gray700,
    borderRadius: 3,
    marginLeft: 4,
  },
  wheelRight: {
    width: 10,
    height: 6,
    backgroundColor: colors.gray700,
    borderRadius: 3,
    marginRight: 4,
  },
  arrivedBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  arrivedText: {
    fontSize: 8,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  signalLostBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: colors.gray500,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  signalLostText: {
    fontSize: 8,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  staticContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  staticBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...shadows.md,
  },
  staticAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.primary,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  staticProfileImage: {
    width: '100%',
    height: '100%',
  },
  staticInitialsContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  staticInitials: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  staticArrivedDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.white,
  },
});
