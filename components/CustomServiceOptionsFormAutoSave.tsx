import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Plus, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react-native';
import { CustomServiceOption } from '../types/database';
import { ValueAddedServicesManager } from '../lib/value-added-services';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

interface Props {
  listingId: string;
  onOptionsChange?: (hasOptions: boolean) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function CustomServiceOptionsFormAutoSave({ listingId, onOptionsChange }: Props) {
  const [options, setOptions] = useState<CustomServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveTimeoutId, setSaveTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadOptions();
  }, [listingId]);

  useEffect(() => {
    onOptionsChange?.(options.length > 0);
  }, [options.length]);

  async function loadOptions() {
    setLoading(true);
    try {
      const data = await ValueAddedServicesManager.getCustomServiceOptions(listingId);
      setOptions(data);
    } catch (error) {
      console.error('Failed to load options:', error);
    } finally {
      setLoading(false);
    }
  }

  const autoSave = useCallback(async (updatedOptions: CustomServiceOption[]) => {
    if (saveTimeoutId) {
      clearTimeout(saveTimeoutId);
    }

    setSaveStatus('saving');

    const timeoutId = setTimeout(async () => {
      try {
        for (const option of updatedOptions) {
          if (option.id) {
            await ValueAddedServicesManager.updateCustomOption(option.id, option);
          } else {
            const created = await ValueAddedServicesManager.createCustomOption({
              ...option,
              listing_id: listingId,
            });
            option.id = created.id;
          }
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Auto-save failed:', error);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }, 800);

    setSaveTimeoutId(timeoutId);
  }, [listingId, saveTimeoutId]);

  function addNewOption() {
    const newOption: Partial<CustomServiceOption> = {
      option_type: 'Size',
      option_name: 'Select Size',
      option_values: [
        { value: 'Small', price_modifier: 0 },
        { value: 'Medium', price_modifier: 5 },
        { value: 'Large', price_modifier: 10 },
      ],
      is_required: false,
      sort_order: options.length,
    };

    const updated = [...options, newOption as CustomServiceOption];
    setOptions(updated);
    setExpandedOptions(new Set([...expandedOptions, `new-${options.length}`]));
    autoSave(updated);
  }

  async function removeOption(index: number) {
    const option = options[index];
    const updated = options.filter((_, i) => i !== index);
    setOptions(updated);

    if (option.id) {
      try {
        await ValueAddedServicesManager.deleteCustomOption(option.id);
      } catch (error) {
        console.error('Failed to delete option:', error);
      }
    }

    autoSave(updated);
  }

  function updateOption(index: number, field: string, value: any) {
    const updated = [...options];
    updated[index] = { ...updated[index], [field]: value };
    setOptions(updated);
    autoSave(updated);
  }

  function addOptionValue(index: number) {
    const updated = [...options];
    updated[index].option_values.push({
      value: 'New Option',
      price_modifier: 0,
    });
    setOptions(updated);
    autoSave(updated);
  }

  function updateOptionValue(
    optionIndex: number,
    valueIndex: number,
    field: string,
    value: any
  ) {
    const updated = [...options];
    updated[optionIndex].option_values[valueIndex] = {
      ...updated[optionIndex].option_values[valueIndex],
      [field]: field === 'price_modifier' ? parseFloat(value) || 0 : value,
    };
    setOptions(updated);
    autoSave(updated);
  }

  function removeOptionValue(optionIndex: number, valueIndex: number) {
    const updated = [...options];
    updated[optionIndex].option_values = updated[optionIndex].option_values.filter(
      (_, i) => i !== valueIndex
    );
    setOptions(updated);
    autoSave(updated);
  }

  function toggleExpand(optionId: string) {
    const updated = new Set(expandedOptions);
    if (updated.has(optionId)) {
      updated.delete(optionId);
    } else {
      updated.add(optionId);
    }
    setExpandedOptions(updated);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Loading options...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.saveStatusBar}>
        {saveStatus === 'saving' && (
          <View style={styles.saveStatusContent}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.saveStatusText}>Saving...</Text>
          </View>
        )}
        {saveStatus === 'saved' && (
          <View style={styles.saveStatusContent}>
            <Check size={16} color={colors.success} />
            <Text style={[styles.saveStatusText, styles.savedText]}>Saved</Text>
          </View>
        )}
        {saveStatus === 'error' && (
          <View style={styles.saveStatusContent}>
            <Text style={[styles.saveStatusText, styles.errorText]}>
              Failed to save. Changes will retry automatically.
            </Text>
          </View>
        )}
      </View>

      {options.map((option, optionIndex) => {
        const optionKey = option.id || `new-${optionIndex}`;
        const isExpanded = expandedOptions.has(optionKey);

        return (
          <View key={optionKey} style={styles.optionCard}>
            <TouchableOpacity
              style={styles.optionHeader}
              onPress={() => toggleExpand(optionKey)}
              activeOpacity={0.7}
            >
              <View style={styles.optionTitleRow}>
                <Text style={styles.optionName}>{option.option_name}</Text>
                {option.is_required && (
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredText}>Required</Text>
                  </View>
                )}
              </View>
              {isExpanded ? (
                <ChevronUp size={20} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.optionBody}>
                <Text style={styles.label}>Option Type</Text>
                <Text style={styles.helperText}>
                  Category for this option (e.g., Size, Color, Material)
                </Text>
                <TextInput
                  style={styles.input}
                  value={option.option_type}
                  onChangeText={(text) => updateOption(optionIndex, 'option_type', text)}
                  placeholder="e.g., Size"
                  placeholderTextColor={colors.textLight}
                />

                <Text style={styles.label}>Customer-Facing Label</Text>
                <Text style={styles.helperText}>
                  This is what customers will see when selecting this option
                </Text>
                <TextInput
                  style={styles.input}
                  value={option.option_name}
                  onChangeText={(text) => updateOption(optionIndex, 'option_name', text)}
                  placeholder="e.g., Select Size"
                  placeholderTextColor={colors.textLight}
                />

                <View style={styles.checkboxRow}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() =>
                      updateOption(optionIndex, 'is_required', !option.is_required)
                    }
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.checkboxInner,
                        option.is_required && styles.checkboxChecked,
                      ]}
                    />
                  </TouchableOpacity>
                  <Text style={styles.checkboxLabel}>
                    Required (customers must select this option)
                  </Text>
                </View>

                <Text style={styles.label}>Option Values</Text>
                <Text style={styles.helperText}>
                  Add choices for this option. Price modifier adds to your base price.
                </Text>
                <View style={styles.valueHeaderRow}>
                  <Text style={styles.valueHeaderText}>Choice Name</Text>
                  <Text style={styles.priceHeaderText}>Price Adjustment</Text>
                  <View style={{ width: 28 }} />
                </View>
                {option.option_values.map((value, valueIndex) => (
                  <View key={valueIndex} style={styles.valueRow}>
                    <TextInput
                      style={[styles.input, styles.valueInput]}
                      value={value.value}
                      onChangeText={(text) =>
                        updateOptionValue(optionIndex, valueIndex, 'value', text)
                      }
                      placeholder="e.g., Small"
                      placeholderTextColor={colors.textLight}
                    />
                    <View style={styles.priceInputContainer}>
                      <Text style={styles.currencySymbol}>$</Text>
                      <TextInput
                        style={[styles.input, styles.priceInput]}
                        value={value.price_modifier.toString()}
                        onChangeText={(text) =>
                          updateOptionValue(
                            optionIndex,
                            valueIndex,
                            'price_modifier',
                            text
                          )
                        }
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.textLight}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => removeOptionValue(optionIndex, valueIndex)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Trash2 size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addValueButton}
                  onPress={() => addOptionValue(optionIndex)}
                  activeOpacity={0.7}
                >
                  <Plus size={16} color={colors.primary} />
                  <Text style={styles.addValueText}>Add Value</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeOption(optionIndex)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color={colors.white} />
                  <Text style={styles.removeButtonText}>Remove Option</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      <TouchableOpacity
        style={styles.addButton}
        onPress={addNewOption}
        activeOpacity={0.7}
      >
        <Plus size={20} color={colors.white} />
        <Text style={styles.addButtonText}>Add Custom Option</Text>
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Custom options are saved automatically as you make changes.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  saveStatusBar: {
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  saveStatusText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  savedText: {
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  errorText: {
    color: colors.error,
  },
  optionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  requiredBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  requiredText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  optionBody: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  helperText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: fontSize.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  valueHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  valueHeaderText: {
    flex: 1,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  priceHeaderText: {
    width: 110,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  valueInput: {
    flex: 1,
    marginRight: spacing.sm,
    marginBottom: 0,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    paddingLeft: spacing.sm,
    width: 110,
  },
  currencySymbol: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  priceInput: {
    flex: 1,
    padding: spacing.sm,
    backgroundColor: 'transparent',
    borderWidth: 0,
    marginBottom: 0,
  },
  addValueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  addValueText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.xs,
  },
  removeButton: {
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  removeButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.sm,
  },
  addButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  addButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.sm,
  },
  infoBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 16,
    textAlign: 'center',
  },
});
