import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CheckCircle, Shield, Clock, DollarSign, FileText } from 'lucide-react-native';
import {
  createBackgroundCheck,
  getCheckTypeDetails,
  formatCurrency,
  validateBackgroundCheckForm,
  getConsentDisclosure,
  getComponentTypeDisplay,
  type CheckType,
} from '@/lib/background-checks';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface BackgroundCheckFlowProps {
  providerId: string;
  onComplete: (checkId: string) => void;
  onCancel: () => void;
}

export default function BackgroundCheckFlow({
  providerId,
  onComplete,
  onCancel,
}: BackgroundCheckFlowProps) {
  const [step, setStep] = useState<'select' | 'consent' | 'confirm'>('select');
  const [selectedType, setSelectedType] = useState<CheckType | ''>('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkTypes: CheckType[] = ['Basic', 'Standard', 'Premium'];

  const handleTypeSelect = (type: CheckType) => {
    setSelectedType(type);
    setStep('consent');
  };

  const handleConsentConfirm = () => {
    if (!consentGiven) {
      Alert.alert('Consent Required', 'You must provide consent to proceed');
      return;
    }
    setStep('confirm');
  };

  const handleSubmit = async () => {
    const validation = validateBackgroundCheckForm(selectedType, consentGiven);
    if (!validation.valid) {
      Alert.alert('Validation Error', validation.error);
      return;
    }

    setLoading(true);
    try {
      const result = await createBackgroundCheck(
        providerId,
        selectedType as CheckType,
        consentGiven
      );

      if (result.success && result.check_id) {
        Alert.alert(
          'Background Check Submitted',
          'Your background check has been initiated. You will be notified when it is complete.',
          [{ text: 'OK', onPress: () => onComplete(result.check_id!) }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit background check');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'select') {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Shield size={48} color={colors.primary} />
          <Text style={styles.title}>Select Background Check</Text>
          <Text style={styles.subtitle}>
            Choose the verification level that best suits your needs
          </Text>
        </View>

        <View style={styles.typesList}>
          {checkTypes.map((type) => {
            const details = getCheckTypeDetails(type);
            return (
              <TouchableOpacity
                key={type}
                style={styles.typeCard}
                onPress={() => handleTypeSelect(type)}
              >
                <View style={styles.typeHeader}>
                  <View style={styles.typeInfo}>
                    <Text style={styles.typeName}>{details.name}</Text>
                    <Text style={styles.typeDescription}>
                      {details.description}
                    </Text>
                  </View>
                  <View style={styles.typePrice}>
                    <Text style={styles.typePriceAmount}>
                      {formatCurrency(details.price)}
                    </Text>
                    <Text style={styles.typePriceDuration}>
                      {details.duration}
                    </Text>
                  </View>
                </View>

                <View style={styles.componentsList}>
                  <Text style={styles.componentsTitle}>Includes:</Text>
                  {details.components.map((component) => (
                    <View key={component} style={styles.componentItem}>
                      <CheckCircle size={14} color={colors.success} />
                      <Text style={styles.componentText}>
                        {getComponentTypeDisplay(component)}
                      </Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => handleTypeSelect(type)}
                >
                  <Text style={styles.selectButtonText}>Select {details.name}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (step === 'consent') {
    const details = selectedType ? getCheckTypeDetails(selectedType as CheckType) : null;
    const disclosures = getConsentDisclosure();

    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <FileText size={48} color={colors.primary} />
          <Text style={styles.title}>Consent & Disclosure</Text>
          <Text style={styles.subtitle}>
            Please review and provide your consent to proceed
          </Text>
        </View>

        {details && (
          <View style={styles.selectedCard}>
            <Text style={styles.selectedLabel}>Selected Package:</Text>
            <Text style={styles.selectedValue}>{details.name}</Text>
            <Text style={styles.selectedPrice}>
              {formatCurrency(details.price)}
            </Text>
          </View>
        )}

        <View style={styles.disclosureCard}>
          <Text style={styles.disclosureTitle}>Important Disclosure</Text>
          {disclosures.map((disclosure, index) => (
            <View key={index} style={styles.disclosureItem}>
              <Text style={styles.disclosureBullet}>{index + 1}.</Text>
              <Text style={styles.disclosureText}>{disclosure}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.consentButton,
            consentGiven && styles.consentButtonActive,
          ]}
          onPress={() => setConsentGiven(!consentGiven)}
        >
          <View
            style={[styles.checkbox, consentGiven && styles.checkboxActive]}
          >
            {consentGiven && <CheckCircle size={20} color={colors.white} />}
          </View>
          <Text style={styles.consentText}>
            I have read and agree to the above disclosure and consent to the
            background check
          </Text>
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep('select')}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.continueButton, !consentGiven && styles.disabledButton]}
            onPress={handleConsentConfirm}
            disabled={!consentGiven}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (step === 'confirm') {
    const details = selectedType ? getCheckTypeDetails(selectedType as CheckType) : null;

    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <CheckCircle size={48} color={colors.success} />
          <Text style={styles.title}>Confirm Submission</Text>
          <Text style={styles.subtitle}>
            Review your selection before submitting
          </Text>
        </View>

        {details && (
          <View style={styles.confirmCard}>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Package</Text>
              <Text style={styles.confirmValue}>{details.name}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Processing Time</Text>
              <Text style={styles.confirmValue}>{details.duration}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Cost</Text>
              <Text style={[styles.confirmValue, styles.confirmPrice]}>
                {formatCurrency(details.price)}
              </Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Valid For</Text>
              <Text style={styles.confirmValue}>1 year</Text>
            </View>
          </View>
        )}

        <View style={styles.infoCard}>
          <Clock size={20} color={colors.info} />
          <Text style={styles.infoText}>
            Once submitted, you will receive email and push notifications about
            the progress of your background check. The results will be available
            in your verification settings.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep('consent')}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <DollarSign size={18} color={colors.white} />
                <Text style={styles.submitButtonText}>Submit & Pay</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  typesList: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  typeCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    gap: spacing.md,
  },
  typeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  typeInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  typeName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  typeDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  typePrice: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  typePriceAmount: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  typePriceDuration: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  componentsList: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  componentsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  componentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  componentText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  selectButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  selectButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  cancelButton: {
    margin: spacing.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  selectedCard: {
    backgroundColor: colors.primary + '15',
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  selectedLabel: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  selectedValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  selectedPrice: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  disclosureCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  disclosureTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  disclosureItem: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  disclosureBullet: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  disclosureText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  consentButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.white,
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  consentButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '05',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  consentText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  confirmCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  confirmLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  confirmValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  confirmPrice: {
    fontSize: fontSize.lg,
    color: colors.primary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.info + '15',
    padding: spacing.md,
    margin: spacing.lg,
    borderRadius: borderRadius.md,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.info,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  backButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  continueButton: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
