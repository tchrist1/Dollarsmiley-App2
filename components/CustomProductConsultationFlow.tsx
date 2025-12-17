import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';
import CustomProductsService from '@/lib/custom-products';
import { Camera, Upload, CheckCircle } from 'lucide-react-native';

interface ConsultationFlowProps {
  bookingId?: string;
  customerId: string;
  providerId: string;
  onComplete: (orderId: string) => void;
}

interface ProductRequirement {
  key: string;
  label: string;
  value: string;
  type: 'text' | 'number' | 'multiline';
}

export default function CustomProductConsultationFlow({
  bookingId,
  customerId,
  providerId,
  onComplete,
}: ConsultationFlowProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [productType, setProductType] = useState('');
  const [requirements, setRequirements] = useState<ProductRequirement[]>([
    { key: 'quantity', label: 'Quantity', value: '', type: 'number' },
    { key: 'dimensions', label: 'Dimensions', value: '', type: 'text' },
    { key: 'material', label: 'Preferred Material', value: '', type: 'text' },
    { key: 'colors', label: 'Color Specifications', value: '', type: 'text' },
    { key: 'notes', label: 'Additional Notes', value: '', type: 'multiline' },
  ]);

  const productTypes = [
    { id: 'dtf', name: 'DTF Printing', description: 'Direct to Film printing for garments' },
    { id: 'engraving', name: 'Laser Engraving', description: 'Precision engraving on various materials' },
    { id: 'vinyl', name: 'Vinyl Cutting', description: 'Custom vinyl decals and signs' },
    { id: 'embroidery', name: 'Embroidery', description: 'Custom embroidered designs' },
    { id: 'custom', name: 'Custom Product', description: 'Other custom fabrication needs' },
  ];

  const updateRequirement = (key: string, value: string) => {
    setRequirements((prev) =>
      prev.map((req) => (req.key === key ? { ...req, value } : req))
    );
  };

  const validateStep1 = () => {
    if (!productType) {
      Alert.alert('Required', 'Please select a product type');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const requiredFields = requirements.filter((r) => r.key === 'quantity' || r.key === 'dimensions');
    const hasAllRequired = requiredFields.every((r) => r.value.trim() !== '');

    if (!hasAllRequired) {
      Alert.alert('Required', 'Please fill in quantity and dimensions');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;

    if (step < 3) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const requirementsData = requirements.reduce((acc, req) => {
        if (req.value) {
          acc[req.key] = req.value;
        }
        return acc;
      }, {} as Record<string, string>);

      const order = await CustomProductsService.createProductionOrder({
        bookingId,
        customerId,
        providerId,
        productType,
        requirements: requirementsData,
      });

      Alert.alert('Success', 'Consultation request submitted successfully!');
      onComplete(order.id);
    } catch (error) {
      console.error('Failed to create production order:', error);
      Alert.alert('Error', 'Failed to submit consultation request');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Select Product Type</Text>
      <Text style={styles.stepDescription}>
        Choose the type of custom product you need
      </Text>

      {productTypes.map((type) => (
        <TouchableOpacity
          key={type.id}
          style={[
            styles.productTypeCard,
            productType === type.id && styles.productTypeCardSelected,
          ]}
          onPress={() => setProductType(type.id)}
        >
          <View style={styles.productTypeHeader}>
            <Text
              style={[
                styles.productTypeName,
                productType === type.id && styles.productTypeNameSelected,
              ]}
            >
              {type.name}
            </Text>
            {productType === type.id && (
              <CheckCircle size={20} color={colors.primary} />
            )}
          </View>
          <Text style={styles.productTypeDescription}>{type.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Product Requirements</Text>
      <Text style={styles.stepDescription}>
        Provide details about your custom product
      </Text>

      {requirements.map((req) => (
        <View key={req.key} style={styles.inputGroup}>
          <Text style={styles.label}>{req.label}</Text>
          {req.type === 'multiline' ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={req.value}
              onChangeText={(text) => updateRequirement(req.key, text)}
              multiline
              numberOfLines={4}
              placeholder={`Enter ${req.label.toLowerCase()}`}
              placeholderTextColor={colors.textLight}
            />
          ) : (
            <TextInput
              style={styles.input}
              value={req.value}
              onChangeText={(text) => updateRequirement(req.key, text)}
              keyboardType={req.type === 'number' ? 'numeric' : 'default'}
              placeholder={`Enter ${req.label.toLowerCase()}`}
              placeholderTextColor={colors.textLight}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Review & Submit</Text>
      <Text style={styles.stepDescription}>
        Review your consultation request before submitting
      </Text>

      <View style={styles.reviewCard}>
        <Text style={styles.reviewLabel}>Product Type</Text>
        <Text style={styles.reviewValue}>
          {productTypes.find((t) => t.id === productType)?.name}
        </Text>
      </View>

      {requirements
        .filter((req) => req.value)
        .map((req) => (
          <View key={req.key} style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>{req.label}</Text>
            <Text style={styles.reviewValue}>{req.value}</Text>
          </View>
        ))}

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          After submission, the provider will review your requirements and create initial
          design proofs for your approval.
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={[
              styles.progressStep,
              s <= step && styles.progressStepActive,
              s < step && styles.progressStepComplete,
            ]}
          />
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => setStep(step - 1)}
            disabled={loading}
          >
            <Text style={styles.buttonSecondaryText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, step === 1 && styles.buttonFullWidth]}
          onPress={handleNext}
          disabled={loading}
        >
          <Text style={styles.buttonPrimaryText}>
            {step === 3 ? (loading ? 'Submitting...' : 'Submit Request') : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressBar: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: colors.primary,
  },
  progressStepComplete: {
    backgroundColor: colors.success,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  stepTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  stepDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  productTypeCard: {
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  productTypeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLighter,
  },
  productTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  productTypeName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  productTypeNameSelected: {
    color: colors.primary,
  },
  productTypeDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.white,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  reviewCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  reviewLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  reviewValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  infoBox: {
    padding: spacing.md,
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFullWidth: {
    flex: 1,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonPrimaryText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  buttonSecondaryText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
});