import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
} from 'react-native';
import {
  Camera,
  CheckCircle,
  AlertCircle,
  FileText,
  User,
  ArrowRight,
  X,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { IDCameraCapture } from './IDCameraCapture';

interface IDVerificationFlowProps {
  onComplete: (data: {
    frontPhoto: string;
    backPhoto: string;
    selfiePhoto: string;
  }) => void;
  onCancel: () => void;
}

type Step = 'intro' | 'front' | 'back' | 'selfie' | 'review' | 'processing';
type CaptureType = 'front' | 'back' | 'selfie';

export function IDVerificationFlow({ onComplete, onCancel }: IDVerificationFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('intro');
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [backPhoto, setBackPhoto] = useState<string | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [currentCapture, setCurrentCapture] = useState<CaptureType>('front');

  const handleStartVerification = () => {
    setCurrentStep('front');
    setCurrentCapture('front');
    setShowCamera(true);
  };

  const handleCameraCapture = (photoUri: string, side: CaptureType) => {
    switch (side) {
      case 'front':
        setFrontPhoto(photoUri);
        setShowCamera(false);
        setCurrentStep('back');
        break;
      case 'back':
        setBackPhoto(photoUri);
        setShowCamera(false);
        setCurrentStep('selfie');
        break;
      case 'selfie':
        setSelfiePhoto(photoUri);
        setShowCamera(false);
        setCurrentStep('review');
        break;
    }
  };

  const handleCameraCancel = () => {
    setShowCamera(false);
    if (currentStep === 'front' && !frontPhoto) {
      setCurrentStep('intro');
    }
  };

  const handleRetake = (type: CaptureType) => {
    setCurrentCapture(type);
    setCurrentStep(type);
    setShowCamera(true);
  };

  const handleNext = () => {
    if (currentStep === 'back' && frontPhoto) {
      setCurrentCapture('back');
      setShowCamera(true);
    } else if (currentStep === 'selfie' && backPhoto) {
      setCurrentCapture('selfie');
      setShowCamera(true);
    }
  };

  const handleSubmit = () => {
    if (!frontPhoto || !backPhoto || !selfiePhoto) {
      Alert.alert('Error', 'Please complete all verification steps');
      return;
    }

    setCurrentStep('processing');
    onComplete({
      frontPhoto,
      backPhoto,
      selfiePhoto,
    });
  };

  // Camera modal
  if (showCamera) {
    return (
      <Modal visible={showCamera} animationType="slide">
        <IDCameraCapture
          captureType={currentCapture}
          onCapture={handleCameraCapture}
          onCancel={handleCameraCancel}
        />
      </Modal>
    );
  }

  // Intro step
  if (currentStep === 'intro') {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Camera size={64} color={colors.primary} />
            <Text style={styles.title}>ID Verification</Text>
            <Text style={styles.subtitle}>
              We need to verify your identity for security purposes
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What You'll Need</Text>

            <View style={styles.requirement}>
              <View style={styles.requirementIcon}>
                <FileText size={24} color={colors.primary} />
              </View>
              <View style={styles.requirementContent}>
                <Text style={styles.requirementTitle}>Government-Issued ID</Text>
                <Text style={styles.requirementText}>
                  Driver's license, passport, or state ID card
                </Text>
              </View>
            </View>

            <View style={styles.requirement}>
              <View style={styles.requirementIcon}>
                <Camera size={24} color={colors.primary} />
              </View>
              <View style={styles.requirementContent}>
                <Text style={styles.requirementTitle}>Clear Photos</Text>
                <Text style={styles.requirementText}>
                  Good lighting and all text must be visible
                </Text>
              </View>
            </View>

            <View style={styles.requirement}>
              <View style={styles.requirementIcon}>
                <User size={24} color={colors.primary} />
              </View>
              <View style={styles.requirementContent}>
                <Text style={styles.requirementTitle}>Selfie</Text>
                <Text style={styles.requirementText}>
                  A photo of your face to match with your ID
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verification Steps</Text>

            <View style={styles.steps}>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepText}>Take a photo of your ID front</Text>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepText}>Take a photo of your ID back</Text>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepText}>Take a selfie for verification</Text>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>4</Text>
                </View>
                <Text style={styles.stepText}>Review and submit</Text>
              </View>
            </View>
          </View>

          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>Tips for Best Results</Text>
            <Text style={styles.tipText}>• Use good lighting</Text>
            <Text style={styles.tipText}>• Avoid glare and shadows</Text>
            <Text style={styles.tipText}>• Keep your ID flat and in focus</Text>
            <Text style={styles.tipText}>• Make sure all text is readable</Text>
            <Text style={styles.tipText}>• Remove sunglasses for selfie</Text>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.startButton} onPress={handleStartVerification}>
            <Text style={styles.startButtonText}>Start Verification</Text>
            <ArrowRight size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Review step
  if (currentStep === 'review') {
    return (
      <View style={styles.container}>
        <View style={styles.reviewHeader}>
          <Text style={styles.title}>Review Photos</Text>
          <Text style={styles.subtitle}>Make sure all photos are clear and readable</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Front photo */}
          <View style={styles.reviewItem}>
            <View style={styles.reviewItemHeader}>
              <Text style={styles.reviewItemTitle}>ID Front</Text>
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => handleRetake('front')}
              >
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>
            </View>
            {frontPhoto && (
              <Image source={{ uri: frontPhoto }} style={styles.reviewImage} resizeMode="contain" />
            )}
            <View style={styles.checkItem}>
              <CheckCircle size={16} color={colors.success} />
              <Text style={styles.checkItemText}>All text is visible</Text>
            </View>
            <View style={styles.checkItem}>
              <CheckCircle size={16} color={colors.success} />
              <Text style={styles.checkItemText}>Image is in focus</Text>
            </View>
          </View>

          {/* Back photo */}
          <View style={styles.reviewItem}>
            <View style={styles.reviewItemHeader}>
              <Text style={styles.reviewItemTitle}>ID Back</Text>
              <TouchableOpacity style={styles.retakeButton} onPress={() => handleRetake('back')}>
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>
            </View>
            {backPhoto && (
              <Image source={{ uri: backPhoto }} style={styles.reviewImage} resizeMode="contain" />
            )}
            <View style={styles.checkItem}>
              <CheckCircle size={16} color={colors.success} />
              <Text style={styles.checkItemText}>All text is visible</Text>
            </View>
            <View style={styles.checkItem}>
              <CheckCircle size={16} color={colors.success} />
              <Text style={styles.checkItemText}>Image is in focus</Text>
            </View>
          </View>

          {/* Selfie */}
          <View style={styles.reviewItem}>
            <View style={styles.reviewItemHeader}>
              <Text style={styles.reviewItemTitle}>Selfie</Text>
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => handleRetake('selfie')}
              >
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>
            </View>
            {selfiePhoto && (
              <Image source={{ uri: selfiePhoto }} style={styles.reviewImage} resizeMode="contain" />
            )}
            <View style={styles.checkItem}>
              <CheckCircle size={16} color={colors.success} />
              <Text style={styles.checkItemText}>Face is clearly visible</Text>
            </View>
            <View style={styles.checkItem}>
              <CheckCircle size={16} color={colors.success} />
              <Text style={styles.checkItemText}>No obstructions</Text>
            </View>
          </View>

          <View style={styles.reviewNote}>
            <AlertCircle size={20} color={colors.warning} />
            <Text style={styles.reviewNoteText}>
              Your information will be securely processed and encrypted. We never store your ID
              images permanently.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <CheckCircle size={20} color={colors.white} />
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // In-progress steps (front, back, selfie)
  return (
    <View style={styles.container}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>
          {currentStep === 'front' && 'Step 1 of 3'}
          {currentStep === 'back' && 'Step 2 of 3'}
          {currentStep === 'selfie' && 'Step 3 of 3'}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width:
                  currentStep === 'front' ? '33%' : currentStep === 'back' ? '66%' : '100%',
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.stepContent}>
        {currentStep === 'front' && (
          <>
            <FileText size={64} color={colors.primary} />
            <Text style={styles.stepTitle}>Capture ID Front</Text>
            <Text style={styles.stepDescription}>
              Take a clear photo of the front of your government-issued ID
            </Text>
            {frontPhoto && (
              <Image source={{ uri: frontPhoto }} style={styles.previewThumb} resizeMode="contain" />
            )}
          </>
        )}

        {currentStep === 'back' && (
          <>
            <FileText size={64} color={colors.primary} />
            <Text style={styles.stepTitle}>Capture ID Back</Text>
            <Text style={styles.stepDescription}>
              Take a clear photo of the back of your government-issued ID
            </Text>
            {backPhoto && (
              <Image source={{ uri: backPhoto }} style={styles.previewThumb} resizeMode="contain" />
            )}
          </>
        )}

        {currentStep === 'selfie' && (
          <>
            <User size={64} color={colors.primary} />
            <Text style={styles.stepTitle}>Take Selfie</Text>
            <Text style={styles.stepDescription}>
              Take a selfie to verify your identity matches the ID
            </Text>
            {selfiePhoto && (
              <Image source={{ uri: selfiePhoto }} style={styles.previewThumb} resizeMode="contain" />
            )}
          </>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
          <ArrowRight size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  requirementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  requirementContent: {
    flex: 1,
  },
  requirementTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  requirementText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },
  steps: {
    gap: spacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  stepText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  tips: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    margin: spacing.lg,
    borderRadius: borderRadius.md,
  },
  tipsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: fontSize.sm * 1.5,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  startButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  startButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  nextButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  progressHeader: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  progressTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  stepContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  stepTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  stepDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  previewThumb: {
    width: 200,
    height: 120,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  reviewHeader: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  reviewItem: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reviewItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  reviewItemTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  retakeButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retakeButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  reviewImage: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  checkItemText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  reviewNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warning + '20',
    margin: spacing.lg,
    borderRadius: borderRadius.md,
  },
  reviewNoteText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.warning,
    lineHeight: fontSize.sm * 1.5,
  },
});
