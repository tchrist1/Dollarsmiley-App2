import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Plus, X, Shuffle, Copy, Check, AlertCircle } from 'lucide-react-native';
import Input from './Input';
import Button from './Button';
import {
  createDiscountCodes,
  generateRandomCode,
  type DiscountCode,
} from '@/lib/promotional-campaigns';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface DiscountCodeCreatorProps {
  campaignId: string;
  onCodesCreated: (codes: DiscountCode[]) => void;
  existingCodes?: string[];
}

export default function DiscountCodeCreator({
  campaignId,
  onCodesCreated,
  existingCodes = [],
}: DiscountCodeCreatorProps) {
  const [codes, setCodes] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [generatingBulk, setGeneratingBulk] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const addCodeField = () => {
    setCodes([...codes, '']);
  };

  const removeCodeField = (index: number) => {
    if (codes.length > 1) {
      const newCodes = codes.filter((_, i) => i !== index);
      setCodes(newCodes);
    }
  };

  const updateCode = (index: number, value: string) => {
    const newCodes = [...codes];
    newCodes[index] = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCodes(newCodes);
  };

  const generateRandomForField = async (index: number) => {
    try {
      const randomCode = await generateRandomCode();
      updateCode(index, randomCode);
    } catch (error) {
      console.error('Error generating code:', error);
      Alert.alert('Error', 'Failed to generate random code');
    }
  };

  const generateBulkCodes = async (count: number) => {
    setGeneratingBulk(true);
    try {
      const newCodes: string[] = [];
      for (let i = 0; i < count; i++) {
        const code = await generateRandomCode();
        newCodes.push(code);
      }
      setCodes(newCodes);
    } catch (error) {
      console.error('Error generating bulk codes:', error);
      Alert.alert('Error', 'Failed to generate codes');
    } finally {
      setGeneratingBulk(false);
    }
  };

  const showBulkGenerateDialog = () => {
    Alert.alert(
      'Generate Codes',
      'How many random codes would you like to generate?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '10 Codes',
          onPress: () => generateBulkCodes(10),
        },
        {
          text: '25 Codes',
          onPress: () => generateBulkCodes(25),
        },
        {
          text: '50 Codes',
          onPress: () => generateBulkCodes(50),
        },
        {
          text: '100 Codes',
          onPress: () => generateBulkCodes(100),
        },
      ]
    );
  };

  const validateCodes = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const cleanCodes = codes.filter(c => c.trim() !== '');

    if (cleanCodes.length === 0) {
      errors.push('Please enter at least one code');
      return { valid: false, errors };
    }

    // Check for duplicates in input
    const uniqueCodes = new Set(cleanCodes);
    if (uniqueCodes.size !== cleanCodes.length) {
      errors.push('Duplicate codes found in your list');
    }

    // Check against existing codes
    const existingSet = new Set(existingCodes);
    const duplicateExisting = cleanCodes.filter(c => existingSet.has(c));
    if (duplicateExisting.length > 0) {
      errors.push(`These codes already exist: ${duplicateExisting.join(', ')}`);
    }

    // Check format
    const invalidFormat = cleanCodes.filter(c => c.length < 4 || c.length > 20);
    if (invalidFormat.length > 0) {
      errors.push('Codes must be between 4-20 characters');
    }

    return { valid: errors.length === 0, errors };
  };

  const handleCreateCodes = async () => {
    const validation = validateCodes();

    if (!validation.valid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    setLoading(true);

    try {
      const cleanCodes = codes.filter(c => c.trim() !== '');
      const createdCodes = await createDiscountCodes(campaignId, cleanCodes);

      Alert.alert(
        'Success',
        `${createdCodes.length} discount code${createdCodes.length > 1 ? 's' : ''} created successfully!`
      );

      onCodesCreated(createdCodes);
      setCodes(['']); // Reset form
    } catch (error: any) {
      console.error('Error creating codes:', error);
      Alert.alert('Error', error.message || 'Failed to create discount codes');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string, index: number) => {
    // In a real app, this would use Clipboard API
    // For now, we'll just show visual feedback
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getCodeStatus = (code: string): 'empty' | 'valid' | 'invalid' | 'duplicate' => {
    if (code.trim() === '') return 'empty';

    if (code.length < 4 || code.length > 20) return 'invalid';

    // Check for duplicates
    const codeCount = codes.filter(c => c === code).length;
    if (codeCount > 1) return 'duplicate';

    // Check against existing
    if (existingCodes.includes(code)) return 'duplicate';

    return 'valid';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Discount Codes</Text>
        <Text style={styles.subtitle}>
          Create custom codes or generate random ones. Codes must be 4-20 characters.
        </Text>
      </View>

      <View style={styles.bulkActions}>
        <TouchableOpacity
          style={styles.bulkButton}
          onPress={showBulkGenerateDialog}
          disabled={generatingBulk}
        >
          <Shuffle size={18} color={colors.primary} />
          <Text style={styles.bulkButtonText}>Generate Bulk Codes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bulkButton} onPress={addCodeField}>
          <Plus size={18} color={colors.primary} />
          <Text style={styles.bulkButtonText}>Add Code Field</Text>
        </TouchableOpacity>
      </View>

      {generatingBulk && (
        <View style={styles.generatingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.generatingText}>Generating codes...</Text>
        </View>
      )}

      <ScrollView
        style={styles.codesList}
        contentContainerStyle={styles.codesListContent}
        showsVerticalScrollIndicator={false}
      >
        {codes.map((code, index) => {
          const status = getCodeStatus(code);

          return (
            <View key={index} style={styles.codeRow}>
              <View style={styles.codeInputContainer}>
                <Input
                  placeholder="ENTER CODE"
                  value={code}
                  onChangeText={value => updateCode(index, value)}
                  maxLength={20}
                  autoCapitalize="characters"
                  style={[
                    styles.codeInput,
                    status === 'invalid' && styles.codeInputInvalid,
                    status === 'duplicate' && styles.codeInputDuplicate,
                    status === 'valid' && styles.codeInputValid,
                  ]}
                />
                {status === 'valid' && (
                  <View style={styles.statusIcon}>
                    <Check size={16} color={colors.success} />
                  </View>
                )}
                {(status === 'invalid' || status === 'duplicate') && (
                  <View style={styles.statusIcon}>
                    <AlertCircle size={16} color={colors.error} />
                  </View>
                )}
              </View>

              <View style={styles.codeActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => generateRandomForField(index)}
                >
                  <Shuffle size={18} color={colors.primary} />
                </TouchableOpacity>

                {code.trim() !== '' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => copyCode(code, index)}
                  >
                    {copiedIndex === index ? (
                      <Check size={18} color={colors.success} />
                    ) : (
                      <Copy size={18} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                )}

                {codes.length > 1 && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => removeCodeField(index)}
                  >
                    <X size={18} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.infoCard}>
        <AlertCircle size={20} color={colors.info} />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Code Guidelines</Text>
          <Text style={styles.infoText}>• 4-20 characters (letters and numbers only)</Text>
          <Text style={styles.infoText}>• Must be unique across all campaigns</Text>
          <Text style={styles.infoText}>• Automatically converted to uppercase</Text>
          <Text style={styles.infoText}>• Can be custom or randomly generated</Text>
        </View>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {codes.filter(c => c.trim() !== '').length} code
          {codes.filter(c => c.trim() !== '').length !== 1 ? 's' : ''} ready to create
        </Text>
      </View>

      <Button
        title="Create Discount Codes"
        onPress={handleCreateCodes}
        loading={loading}
        disabled={loading || codes.filter(c => c.trim() !== '').length === 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bulkActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  bulkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary + '10',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  bulkButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  generatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.info + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  generatingText: {
    fontSize: fontSize.sm,
    color: colors.info,
    fontWeight: fontWeight.medium,
  },
  codesList: {
    maxHeight: 400,
    marginBottom: spacing.md,
  },
  codesListContent: {
    gap: spacing.sm,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  codeInputContainer: {
    flex: 1,
    position: 'relative',
  },
  codeInput: {
    fontFamily: 'monospace',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  codeInputValid: {
    borderColor: colors.success,
  },
  codeInputInvalid: {
    borderColor: colors.error,
  },
  codeInputDuplicate: {
    borderColor: colors.warning,
  },
  statusIcon: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    transform: [{ translateY: -8 }],
  },
  codeActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.info + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.info + '30',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  summary: {
    backgroundColor: colors.primary + '10',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});
