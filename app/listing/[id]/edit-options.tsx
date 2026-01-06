import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react-native';

interface ServiceOption {
  id?: string;
  name: string;
  type: 'SingleChoice' | 'MultipleChoice' | 'TextInput' | 'NumberInput';
  choices: string[];
  price_modifier: number;
  is_required: boolean;
}

interface ValueAddedService {
  id?: string;
  name: string;
  description: string;
  price: number;
  is_active: boolean;
}

export default function EditOptionsScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [vas, setVas] = useState<ValueAddedService[]>([]);

  useEffect(() => {
    if (id) {
      loadExistingOptions();
    }
  }, [id]);

  async function loadExistingOptions() {
    const { data: optionsData } = await supabase
      .from('service_options')
      .select('*')
      .eq('listing_id', id);

    if (optionsData) {
      setOptions(optionsData);
    }

    const { data: vasData } = await supabase
      .from('value_added_services')
      .select('*')
      .eq('listing_id', id);

    if (vasData) {
      setVas(vasData);
    }
  }

  function addOption() {
    setOptions([
      ...options,
      {
        name: '',
        type: 'SingleChoice',
        choices: [''],
        price_modifier: 0,
        is_required: false,
      },
    ]);
  }

  function addVas() {
    setVas([
      ...vas,
      {
        name: '',
        description: '',
        price: 0,
        is_active: true,
      },
    ]);
  }

  function removeOption(index: number) {
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  }

  function removeVas(index: number) {
    const newVas = [...vas];
    newVas.splice(index, 1);
    setVas(newVas);
  }

  function updateOption(index: number, field: keyof ServiceOption, value: any) {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  }

  function updateVas(index: number, field: keyof ValueAddedService, value: any) {
    const newVas = [...vas];
    newVas[index] = { ...newVas[index], [field]: value };
    setVas(newVas);
  }

  function addChoice(optionIndex: number) {
    const newOptions = [...options];
    newOptions[optionIndex].choices.push('');
    setOptions(newOptions);
  }

  function removeChoice(optionIndex: number, choiceIndex: number) {
    const newOptions = [...options];
    newOptions[optionIndex].choices.splice(choiceIndex, 1);
    setOptions(newOptions);
  }

  function updateChoice(optionIndex: number, choiceIndex: number, value: string) {
    const newOptions = [...options];
    newOptions[optionIndex].choices[choiceIndex] = value;
    setOptions(newOptions);
  }

  async function handleSave() {
    const validOptions = options.filter(opt => opt.name.trim());
    const validVas = vas.filter(v => v.name.trim() && v.price > 0);

    if (validOptions.length === 0 && validVas.length === 0) {
      Alert.alert('Error', 'Please add at least one option or value-added service');
      return;
    }

    setLoading(true);

    try {
      const optionsData = validOptions.map(opt => ({
        name: opt.name,
        type: opt.type,
        choices: opt.choices.filter(c => c.trim()),
        price_modifier: opt.price_modifier,
        is_required: opt.is_required,
      }));

      const vasData = validVas.map(v => ({
        name: v.name,
        description: v.description,
        price: v.price,
        is_active: v.is_active,
      }));

      const { data, error } = await supabase.rpc('update_service_options_atomic', {
        p_listing_id: id,
        p_options: optionsData,
        p_vas: vasData,
      });

      if (error) throw error;

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to save options');
      }

      Alert.alert(
        'Success!',
        'Your custom service options have been saved.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save options');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Custom Options</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Service Options</Text>
            <TouchableOpacity onPress={addOption} style={styles.addButton}>
              <Plus size={20} color={colors.primary} />
              <Text style={styles.addButtonText}>Add Option</Text>
            </TouchableOpacity>
          </View>

          {options.map((option, index) => (
            <View key={index} style={styles.optionCard}>
              <View style={styles.optionHeader}>
                <Text style={styles.optionLabel}>Option {index + 1}</Text>
                <TouchableOpacity onPress={() => removeOption(index)}>
                  <Trash2 size={20} color={colors.error} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Option Name (e.g., Size)"
                value={option.name}
                onChangeText={(text) => updateOption(index, 'name', text)}
              />

              <View style={styles.typeSelector}>
                {(['SingleChoice', 'MultipleChoice'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      option.type === type && styles.typeButtonActive,
                    ]}
                    onPress={() => updateOption(index, 'type', type)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        option.type === type && styles.typeButtonTextActive,
                      ]}
                    >
                      {type === 'SingleChoice' ? 'Single' : 'Multiple'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.choicesContainer}>
                <Text style={styles.choicesLabel}>Choices:</Text>
                {option.choices.map((choice, choiceIndex) => (
                  <View key={choiceIndex} style={styles.choiceRow}>
                    <TextInput
                      style={[styles.input, styles.choiceInput]}
                      placeholder={`Choice ${choiceIndex + 1}`}
                      value={choice}
                      onChangeText={(text) => updateChoice(index, choiceIndex, text)}
                    />
                    <TouchableOpacity
                      onPress={() => removeChoice(index, choiceIndex)}
                      disabled={option.choices.length === 1}
                    >
                      <Trash2
                        size={20}
                        color={option.choices.length === 1 ? '#CCC' : colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  onPress={() => addChoice(index)}
                  style={styles.addChoiceButton}
                >
                  <Plus size={16} color={colors.primary} />
                  <Text style={styles.addChoiceText}>Add Choice</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Price Modifier ($)"
                value={option.price_modifier?.toString() || '0'}
                onChangeText={(text) =>
                  updateOption(index, 'price_modifier', parseFloat(text) || 0)
                }
                keyboardType="numeric"
              />
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Add-On Services</Text>
            <TouchableOpacity onPress={addVas} style={styles.addButton}>
              <Plus size={20} color={colors.primary} />
              <Text style={styles.addButtonText}>Add Service</Text>
            </TouchableOpacity>
          </View>

          {vas.map((service, index) => (
            <View key={index} style={styles.optionCard}>
              <View style={styles.optionHeader}>
                <Text style={styles.optionLabel}>Add-On {index + 1}</Text>
                <TouchableOpacity onPress={() => removeVas(index)}>
                  <Trash2 size={20} color={colors.error} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Service Name"
                value={service.name}
                onChangeText={(text) => updateVas(index, 'name', text)}
              />

              <TextInput
                style={styles.input}
                placeholder="Description"
                value={service.description}
                onChangeText={(text) => updateVas(index, 'description', text)}
                multiline
              />

              <TextInput
                style={styles.input}
                placeholder="Price ($)"
                value={service.price?.toString() || '0'}
                onChangeText={(text) => updateVas(index, 'price', parseFloat(text) || 0)}
                keyboardType="numeric"
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Save Options"
          onPress={handleSave}
          loading={loading}
          leftIcon={<Save size={20} color={colors.white} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    paddingTop: spacing.xxl + spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addButtonText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  optionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  optionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  typeButtonTextActive: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  choicesContainer: {
    marginBottom: spacing.md,
  },
  choicesLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  choiceInput: {
    flex: 1,
    marginBottom: 0,
  },
  addChoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  addChoiceText: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
