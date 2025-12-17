import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Calendar,
  Bell,
  CheckCircle,
  X,
  ChevronRight,
  Shield,
  Clock,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { requestCalendarPermissions, checkCalendarPermissions } from '@/lib/calendar';

interface CalendarOnboardingFlowProps {
  visible: boolean;
  onComplete: (granted: boolean) => void;
  onSkip?: () => void;
}

const { height } = Dimensions.get('window');

export default function CalendarOnboardingFlow({
  visible,
  onComplete,
  onSkip,
}: CalendarOnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);

  const steps = [
    {
      icon: <Calendar size={64} color={colors.primary} />,
      title: 'Never Miss a Booking',
      description:
        'Keep track of all your appointments by syncing bookings directly to your device calendar.',
      benefits: [
        'Automatic calendar integration',
        'Works with Apple Calendar, Google Calendar, and more',
        'Updates automatically when bookings change',
      ],
    },
    {
      icon: <Bell size={64} color={colors.primary} />,
      title: 'Smart Reminders',
      description:
        'Get notified at the right time so you never forget an upcoming service appointment.',
      benefits: [
        'Reminder 1 day before your booking',
        'Reminder 1 hour before start time',
        'Customize reminders in your calendar app',
      ],
    },
    {
      icon: <Shield size={64} color={colors.primary} />,
      title: 'Your Privacy is Protected',
      description:
        'We only add your bookings to your calendar. We never read or access your other events.',
      benefits: [
        'Write-only access to your calendar',
        'No reading of existing events',
        'Revoke access anytime in settings',
      ],
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleRequestPermission();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
    onComplete(false);
  };

  const handleRequestPermission = async () => {
    setIsRequesting(true);

    try {
      // Check current status first
      const currentStatus = await checkCalendarPermissions();

      if (currentStatus === 'granted') {
        onComplete(true);
        return;
      }

      // Request permission
      const granted = await requestCalendarPermissions();
      onComplete(granted);
    } catch (error) {
      console.error('Error in calendar permission flow:', error);
      onComplete(false);
    } finally {
      setIsRequesting(false);
    }
  };

  const renderStep = () => {
    const step = steps[currentStep];

    return (
      <View style={styles.stepContainer}>
        <View style={styles.iconContainer}>{step.icon}</View>

        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.stepDescription}>{step.description}</Text>

        <View style={styles.benefitsList}>
          {step.benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <CheckCircle size={20} color={colors.success} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderProgressIndicator = () => (
    <View style={styles.progressContainer}>
      {steps.map((_, index) => (
        <View
          key={index}
          style={[
            styles.progressDot,
            index === currentStep && styles.progressDotActive,
            index < currentStep && styles.progressDotCompleted,
          ]}
        />
      ))}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => onComplete(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={handleSkip}>
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          {renderProgressIndicator()}

          {renderStep()}

          <View style={styles.buttonContainer}>
            {currentStep > 0 && (
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.nextButton,
                currentStep === 0 && styles.nextButtonFull,
                isRequesting && styles.nextButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={isRequesting}
            >
              <Text style={styles.nextButtonText}>
                {isRequesting
                  ? 'Requesting...'
                  : currentStep === steps.length - 1
                  ? 'Enable Calendar Access'
                  : 'Next'}
              </Text>
              {!isRequesting && currentStep < steps.length - 1 && (
                <ChevronRight size={20} color={colors.white} />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: height * 0.85,
    ...shadows.lg,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  progressDotCompleted: {
    backgroundColor: colors.success,
  },
  stepContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  stepTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.md * 1.5,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  benefitsList: {
    width: '100%',
    gap: spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  benefitText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: fontSize.md * 1.4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  backButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skipButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
