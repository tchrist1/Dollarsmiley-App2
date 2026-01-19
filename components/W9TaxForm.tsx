import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CheckCircle, AlertCircle, Info, FileText } from 'lucide-react-native';
import {
  type TaxClassification,
  type W9SubmissionData,
  submitW9,
  formatTaxClassification,
  validateEIN,
  validateSSNLast4,
  validateZipCode,
  formatEIN,
} from '@/lib/w9-tax-information';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface W9TaxFormProps {
  providerId: string;
  onSubmitSuccess?: () => void;
}

export default function W9TaxForm({ providerId, onSubmitSuccess }: W9TaxFormProps) {
  const [loading, setLoading] = useState(false);
  const [taxClassification, setTaxClassification] =
    useState<TaxClassification>('individual');
  const [businessName, setBusinessName] = useState('');
  const [federalTaxClassification, setFederalTaxClassification] = useState('');
  const [ein, setEIN] = useState('');
  const [ssnLast4, setSSNLast4] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [isExempt, setIsExempt] = useState(false);
  const [exemptionCode, setExemptionCode] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [agreedToCertification, setAgreedToCertification] = useState(false);

  const taxClassifications: Array<{ value: TaxClassification; label: string }> = [
    { value: 'individual', label: 'Individual/Sole Proprietor' },
    { value: 'c_corporation', label: 'C Corporation' },
    { value: 's_corporation', label: 'S Corporation' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'trust_estate', label: 'Trust/Estate' },
    { value: 'llc_c', label: 'LLC (C Corporation)' },
    { value: 'llc_s', label: 'LLC (S Corporation)' },
    { value: 'llc_partnership', label: 'LLC (Partnership)' },
    { value: 'llc_disregarded', label: 'LLC (Disregarded Entity)' },
    { value: 'other', label: 'Other' },
  ];

  const usStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  const validateForm = (): boolean => {
    if (!addressLine1 || !city || !state || !zipCode) {
      Alert.alert('Error', 'Please fill in all required address fields');
      return false;
    }

    if (!validateZipCode(zipCode)) {
      Alert.alert('Error', 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)');
      return false;
    }

    // Validate tax ID
    if (taxClassification === 'individual' || taxClassification.startsWith('llc')) {
      if (!ssnLast4) {
        Alert.alert('Error', 'Please enter the last 4 digits of your SSN');
        return false;
      }
      if (!validateSSNLast4(ssnLast4)) {
        Alert.alert('Error', 'Please enter exactly 4 digits for SSN');
        return false;
      }
    }

    if (
      taxClassification !== 'individual' &&
      !taxClassification.startsWith('llc_disregarded')
    ) {
      if (!ein) {
        Alert.alert('Error', 'Please enter your EIN');
        return false;
      }
      if (!validateEIN(formatEIN(ein))) {
        Alert.alert('Error', 'Please enter a valid EIN (format: 12-3456789)');
        return false;
      }
    }

    if (!signatureData) {
      Alert.alert('Error', 'Please provide your electronic signature');
      return false;
    }

    if (!agreedToCertification) {
      Alert.alert('Error', 'Please agree to the certification statement');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const formData: W9SubmissionData = {
        tax_classification: taxClassification,
        business_name: businessName || undefined,
        federal_tax_classification:
          taxClassification.startsWith('llc') ? federalTaxClassification : undefined,
        ein: ein ? formatEIN(ein) : undefined,
        ssn_last_4: ssnLast4 || undefined,
        address_line_1: addressLine1,
        address_line_2: addressLine2 || undefined,
        city,
        state,
        zip_code: zipCode,
        country: 'US',
        is_exempt_from_backup_withholding: isExempt,
        exemption_code: isExempt ? exemptionCode : undefined,
        signature_data: signatureData,
      };

      const result = await submitW9(providerId, formData);

      if (result.success) {
        Alert.alert('Success', 'Your W-9 form has been submitted for review');
        onSubmitSuccess?.();
      } else {
        Alert.alert('Error', result.error || 'Failed to submit W-9 form');
      }
    } catch (error) {
      console.error('Error submitting W-9:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const showLLCFields = taxClassification.startsWith('llc');
  const requiresEIN = taxClassification !== 'individual';
  const requiresSSN = taxClassification === 'individual' || showLLCFields;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <FileText size={32} color={colors.primary} />
        <Text style={styles.title}>Form W-9</Text>
        <Text style={styles.subtitle}>Request for Taxpayer Identification Number</Text>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Info size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          This form is required by the IRS for tax reporting purposes. Your information is
          encrypted and secure.
        </Text>
      </View>

      {/* Tax Classification */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Tax Classification</Text>
        <View style={styles.classificationGrid}>
          {taxClassifications.map((classification) => (
            <TouchableOpacity
              key={classification.value}
              style={[
                styles.classificationCard,
                taxClassification === classification.value &&
                  styles.classificationCardSelected,
              ]}
              onPress={() => setTaxClassification(classification.value)}
            >
              <Text
                style={[
                  styles.classificationLabel,
                  taxClassification === classification.value &&
                    styles.classificationLabelSelected,
                ]}
              >
                {classification.label}
              </Text>
              {taxClassification === classification.value && (
                <CheckCircle size={16} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Business Name */}
      {(taxClassification !== 'individual' || businessName) && (
        <View style={styles.section}>
          <Text style={styles.label}>
            Business Name {taxClassification !== 'individual' && <Text>(if different from name)</Text>}
          </Text>
          <TextInput
            style={styles.input}
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Enter business name"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      )}

      {/* LLC Tax Classification */}
      {showLLCFields && (
        <View style={styles.section}>
          <Text style={styles.label}>Federal Tax Classification for LLC</Text>
          <Text style={styles.hint}>
            Check the appropriate box for the tax classification of the LLC
          </Text>
          <View style={styles.radioGroup}>
            {['C Corporation', 'S Corporation', 'Partnership'].map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.radioButton}
                onPress={() => setFederalTaxClassification(option)}
              >
                <View
                  style={[
                    styles.radio,
                    federalTaxClassification === option && styles.radioSelected,
                  ]}
                >
                  {federalTaxClassification === option && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.radioLabel}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Tax ID Numbers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Taxpayer Identification Number</Text>

        {requiresSSN && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Social Security Number (Last 4 Digits) *
            </Text>
            <TextInput
              style={styles.input}
              value={ssnLast4}
              onChangeText={setSSNLast4}
              placeholder="1234"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />
          </View>
        )}

        {requiresEIN && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Employer Identification Number (EIN) *</Text>
            <Text style={styles.hint}>Format: 12-3456789</Text>
            <TextInput
              style={styles.input}
              value={ein}
              onChangeText={setEIN}
              placeholder="12-3456789"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
            />
          </View>
        )}
      </View>

      {/* Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Address</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address Line 1 *</Text>
          <TextInput
            style={styles.input}
            value={addressLine1}
            onChangeText={setAddressLine1}
            placeholder="Street address"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address Line 2</Text>
          <TextInput
            style={styles.input}
            value={addressLine2}
            onChangeText={setAddressLine2}
            placeholder="Apt, suite, unit, etc. (optional)"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.flex1]}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="City"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={[styles.inputGroup, styles.flexShrink]}>
            <Text style={styles.label}>State *</Text>
            <TextInput
              style={styles.input}
              value={state}
              onChangeText={(text) => setState(text.toUpperCase())}
              placeholder="CA"
              placeholderTextColor={colors.textSecondary}
              maxLength={2}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>ZIP Code *</Text>
          <TextInput
            style={styles.input}
            value={zipCode}
            onChangeText={setZipCode}
            placeholder="12345"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
          />
        </View>
      </View>

      {/* Exemptions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Exemptions (if applicable)</Text>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setIsExempt(!isExempt)}
        >
          <View style={[styles.checkbox, isExempt && styles.checkboxChecked]}>
            {isExempt && <CheckCircle size={16} color={colors.white} />}
          </View>
          <Text style={styles.checkboxLabel}>
            I am exempt from backup withholding
          </Text>
        </TouchableOpacity>

        {isExempt && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Exemption Code (if applicable)</Text>
            <TextInput
              style={styles.input}
              value={exemptionCode}
              onChangeText={setExemptionCode}
              placeholder="Enter code"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        )}
      </View>

      {/* Certification */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Certification</Text>

        <View style={styles.certificationBox}>
          <Text style={styles.certificationText}>
            Under penalties of perjury, I certify that:{'\n\n'}
            1. The number shown on this form is my correct taxpayer identification number,
            and{'\n\n'}
            2. I am not subject to backup withholding, and{'\n\n'}
            3. I am a U.S. citizen or other U.S. person, and{'\n\n'}
            4. The FATCA code(s) entered on this form (if any) indicating that I am exempt
            from FATCA reporting is correct.
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Electronic Signature *</Text>
          <Text style={styles.hint}>Type your full legal name</Text>
          <TextInput
            style={styles.input}
            value={signatureData}
            onChangeText={setSignatureData}
            placeholder="Your full legal name"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAgreedToCertification(!agreedToCertification)}
        >
          <View
            style={[
              styles.checkbox,
              agreedToCertification && styles.checkboxChecked,
            ]}
          >
            {agreedToCertification && <CheckCircle size={16} color={colors.white} />}
          </View>
          <Text style={styles.checkboxLabel}>
            I agree to the certification statement above
          </Text>
        </TouchableOpacity>
      </View>

      {/* Warning */}
      <View style={styles.warningBox}>
        <AlertCircle size={20} color={colors.warning} />
        <Text style={styles.warningText}>
          Providing false information may result in penalties. Please ensure all
          information is accurate.
        </Text>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <>
            <ActivityIndicator color={colors.white} />
            <Text style={styles.submitButtonText}>Submitting...</Text>
          </>
        ) : (
          <Text style={styles.submitButtonText}>Submit W-9 Form</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  infoBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginBottom: spacing.xl,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  classificationGrid: {
    gap: spacing.sm,
  },
  classificationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  classificationCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  classificationLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  classificationLabelSelected: {
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex1: {
    flex: 1,
  },
  flexShrink: {
    minWidth: 100,
  },
  radioGroup: {
    gap: spacing.sm,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
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
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  certificationBox: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  certificationText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    marginBottom: spacing.xl,
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
