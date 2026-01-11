import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { CustomServiceOption } from '../types/database';
import { ValueAddedServicesManager } from '../lib/value-added-services';
import { colors } from '../constants/theme';

interface Props {
  listingId: string;
  onSave?: () => void;
  embedded?: boolean;
}

export default function CustomServiceOptionsForm({ listingId, onSave, embedded = false }: Props) {
  const [options, setOptions] = useState<CustomServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadOptions();
  }, [listingId]);

  async function loadOptions() {
    setLoading(true);
    const data = await ValueAddedServicesManager.getCustomServiceOptions(listingId);
    setOptions(data);
    setLoading(false);
  }

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

    setOptions([...options, newOption as CustomServiceOption]);
    setExpandedOptions(new Set([...expandedOptions, `new-${options.length}`]));
  }

  function removeOption(index: number) {
    Alert.alert('Remove Option', 'Are you sure you want to remove this option?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          const updated = options.filter((_, i) => i !== index);
          setOptions(updated);
        },
      },
    ]);
  }

  function updateOption(index: number, field: string, value: any) {
    const updated = [...options];
    updated[index] = { ...updated[index], [field]: value };
    setOptions(updated);
  }

  function addOptionValue(index: number) {
    const updated = [...options];
    updated[index].option_values.push({
      value: 'New Option',
      price_modifier: 0,
    });
    setOptions(updated);
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
  }

  function removeOptionValue(optionIndex: number, valueIndex: number) {
    const updated = [...options];
    updated[optionIndex].option_values = updated[optionIndex].option_values.filter(
      (_, i) => i !== valueIndex
    );
    setOptions(updated);
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

  async function saveOptions() {
    setLoading(true);
    try {
      for (const option of options) {
        if (option.id) {
          await ValueAddedServicesManager.updateCustomOption(option.id, option);
        } else {
          await ValueAddedServicesManager.createCustomOption({
            ...option,
            listing_id: listingId,
          });
        }
      }
      Alert.alert('Success', 'Custom service options saved');
      await loadOptions();
      onSave?.();
    } catch (error) {
      Alert.alert('Error', 'Failed to save options');
    } finally {
      setLoading(false);
    }
  }

  if (loading && options.length === 0) {
    return (
      <View style={embedded ? styles.embeddedContainer : styles.container}>
        <Text style={styles.loadingText}>Loading options...</Text>
      </View>
    );
  }

  const Container = embedded ? View : ScrollView;

  return (
    <Container style={embedded ? styles.embeddedContainer : styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Custom Service Options</Text>
        <Text style={styles.subtitle}>
          Add customization options for customers to choose from
        </Text>
      </View>

      {options.map((option, optionIndex) => {
        const optionKey = option.id || `new-${optionIndex}`;
        const isExpanded = expandedOptions.has(optionKey);

        return (
          <View key={optionKey} style={styles.optionCard}>
            <TouchableOpacity
              style={styles.optionHeader}
              onPress={() => toggleExpand(optionKey)}
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
                <ChevronUp size={20} color="#666" />
              ) : (
                <ChevronDown size={20} color="#666" />
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
                  onChangeText={(text) =>
                    updateOption(optionIndex, 'option_type', text)
                  }
                  placeholder="e.g., Size"
                />

                <Text style={styles.label}>Customer-Facing Label</Text>
                <Text style={styles.helperText}>
                  This is what customers will see when selecting this option
                </Text>
                <TextInput
                  style={styles.input}
                  value={option.option_name}
                  onChangeText={(text) =>
                    updateOption(optionIndex, 'option_name', text)
                  }
                  placeholder="e.g., Select Size"
                />

                <View style={styles.checkboxRow}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() =>
                      updateOption(optionIndex, 'is_required', !option.is_required)
                    }
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
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => removeOptionValue(optionIndex, valueIndex)}
                    >
                      <Trash2 size={20} color="#FF4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addValueButton}
                  onPress={() => addOptionValue(optionIndex)}
                >
                  <Plus size={16} color="#007AFF" />
                  <Text style={styles.addValueText}>Add Value</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeOption(optionIndex)}
                >
                  <Trash2 size={16} color="#FFF" />
                  <Text style={styles.removeButtonText}>Remove Option</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      <TouchableOpacity style={styles.addButton} onPress={addNewOption}>
        <Plus size={20} color="#FFF" />
        <Text style={styles.addButtonText}>Add Custom Option</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={saveOptions}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>
          {loading ? 'Saving...' : 'Save Options'}
        </Text>
      </TouchableOpacity>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  embeddedContainer: {
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  optionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  requiredBadge: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  optionBody: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
    marginTop: 12,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 16,
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#000',
  },
  valueHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  valueHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  priceHeaderText: {
    width: 110,
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  valueInput: {
    flex: 1,
    marginRight: 8,
    marginBottom: 0,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
    paddingLeft: 8,
    width: 110,
  },
  currencySymbol: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    padding: 12,
    backgroundColor: 'transparent',
    borderWidth: 0,
    marginBottom: 0,
  },
  addValueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  addValueText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  removeButton: {
    backgroundColor: '#FF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  removeButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
