import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  CheckCircle,
  Sparkles,
  ArrowRight,
  Download,
  Mail,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function SubscriptionSuccessScreen() {
  const router = useRouter();
  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    // Animate success icon
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Success',
          headerShown: false,
        }}
      />

      <View style={styles.container}>
        {/* Success Animation */}
        <View style={styles.iconContainer}>
          <Animated.View
            style={[
              styles.iconWrapper,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <CheckCircle size={120} color={colors.success} />
          </Animated.View>

          <Animated.View
            style={[
              styles.sparkles,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Sparkles
              size={32}
              color={colors.warning}
              style={styles.sparkle1}
            />
            <Sparkles
              size={24}
              color={colors.primary}
              style={styles.sparkle2}
            />
            <Sparkles
              size={28}
              color={colors.success}
              style={styles.sparkle3}
            />
          </Animated.View>
        </View>

        {/* Success Message */}
        <Animated.View
          style={[
            styles.messageContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.title}>Welcome Aboard!</Text>
          <Text style={styles.subtitle}>
            Your subscription is now active
          </Text>
          <Text style={styles.description}>
            You now have access to all premium features. Let's get you started!
          </Text>
        </Animated.View>

        {/* Benefits */}
        <Animated.View
          style={[
            styles.benefitsContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.benefitsTitle}>What happens next?</Text>

          <View style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <CheckCircle size={24} color={colors.primary} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Instant Access</Text>
              <Text style={styles.benefitText}>
                All premium features are now unlocked and ready to use
              </Text>
            </View>
          </View>

          <View style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <Mail size={24} color={colors.primary} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Confirmation Email</Text>
              <Text style={styles.benefitText}>
                Check your inbox for subscription details and receipt
              </Text>
            </View>
          </View>

          <View style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <Download size={24} color={colors.primary} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Get Started Guide</Text>
              <Text style={styles.benefitText}>
                Tips and tricks to make the most of your subscription
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.primaryButtonText}>Start Exploring</Text>
            <ArrowRight size={20} color={colors.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/settings/subscription')}
          >
            <Text style={styles.secondaryButtonText}>
              Manage Subscription
            </Text>
          </TouchableOpacity>
        </View>

        {/* Additional Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Need help? Visit our Help Center or contact support@dollarsmiley.com
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl * 2,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    position: 'relative',
  },
  iconWrapper: {
    zIndex: 1,
  },
  sparkles: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  sparkle1: {
    position: 'absolute',
    top: 0,
    right: '20%',
  },
  sparkle2: {
    position: 'absolute',
    bottom: '20%',
    left: '10%',
  },
  sparkle3: {
    position: 'absolute',
    top: '30%',
    left: 0,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.success,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  benefitsContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  benefitsTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  benefitText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionsContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  primaryButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  infoContainer: {
    alignItems: 'center',
    padding: spacing.md,
  },
  infoText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
