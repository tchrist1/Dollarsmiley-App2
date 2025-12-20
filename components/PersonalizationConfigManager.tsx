import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Type,
  Image,
  Palette,
  Layout,
  Settings,
  Eye,
} from 'lucide-react-native';
import { PersonalizationService } from '../lib/personalization';
import {
  PersonalizationConfig,
  PersonalizationType,
  LivePreviewMode,
  PersonalizationLockStage,
} from '../types/database';
import { theme } from '../constants/theme';

interface Props {
  listingId: string;
  onSave?: () => void;
}

const PERSONALIZATION_TYPES: { value: PersonalizationType; label: string; icon: any }[] = [
  { value: 'text', label: 'Custom Text', icon: Type },
  { value: 'image_upload', label: 'Image Upload', icon: Image },
  { value: 'image_selection', label: 'Image Selection', icon: Image },
  { value: 'font_selection', label: 'Font Selection', icon: Type },
  { value: 'color_selection', label: 'Color Selection', icon: Palette },
  { value: 'placement_selection', label: 'Placement/Layout', icon: Layout },
  { value: 'template_selection', label: 'Template Selection', icon: Layout },
  { value: 'combined', label: 'Combined (Multiple)', icon: Settings },
];

const PREVIEW_MODES: { value: LivePreviewMode; label: string; description: string }[] = [
  { value: 'enabled', label: 'Full Preview', description: 'Customers see live preview with full features' },
  { value: 'constrained', label: 'Constrained', description: 'Preview within your defined limits' },
  { value: 'downgraded', label: 'Simplified', description: 'Basic preview without advanced features' },
  { value: 'disabled', label: 'Disabled', description: 'No live preview shown' },
];

const LOCK_STAGES: { value: PersonalizationLockStage; label: string }[] = [
  { value: 'add_to_cart', label: 'When added to cart' },
  { value: 'checkout', label: 'At checkout' },
  { value: 'order_received', label: 'When order received' },
  { value: 'proof_approved', label: 'After proof approval' },
];

export default function PersonalizationConfigManager({ listingId, onSave }: Props) {
  const [configs, setConfigs] = useState<PersonalizationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedConfigs, setExpandedConfigs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadConfigs();
  }, [listingId]);

  async function loadConfigs() {
    setLoading(true);
    try {
      const data = await PersonalizationService.getListingPersonalizationConfig(listingId);
      setConfigs(data as PersonalizationConfig[]);
    } catch (error) {
      console.error('Error loading configs:', error);
    }
    setLoading(false);
  }

  function toggleExpand(configId: string) {
    const newExpanded = new Set(expandedConfigs);
    if (newExpanded.has(configId)) {
      newExpanded.delete(configId);
    } else {
      newExpanded.add(configId);
    }
    setExpandedConfigs(newExpanded);
  }

  function addNewConfig() {
    const now = new Date().toISOString();
    const newConfig: PersonalizationConfig = {
      id: `new-${Date.now()}`,
      listing_id: listingId,
      is_enabled: true,
      is_required: false,
      personalization_type: 'text',
      live_preview_mode: 'enabled',
      lock_after_stage: 'order_received',
      display_order: configs.length,
      config_settings: {},
      text_config: {
        enabled: true,
        max_length: 50,
        min_length: 0,
        allowed_characters: 'alphanumeric',
        multiline: false,
        max_lines: 1,
        placeholder: 'Enter your text',
      },
      image_upload_config: {
        enabled: false,
        max_file_size_mb: 10,
        allowed_formats: ['jpg', 'jpeg', 'png'],
        min_resolution: { width: 300, height: 300 },
        max_uploads: 1,
        require_high_res: false,
      },
      font_config: {
        enabled: false,
        allowed_font_ids: [],
        allow_all_system_fonts: true,
        min_size: 12,
        max_size: 72,
        default_size: 24,
        allow_size_selection: true,
      },
      color_config: {
        enabled: false,
        allow_custom_colors: false,
        default_color: '#000000',
      },
      price_impact: {
        type: 'none',
        fixed_amount: 0,
        percentage: 0,
        per_character: 0,
        per_image: 0,
      },
      created_at: now,
      updated_at: now,
    };

    setConfigs([...configs, newConfig]);
    setExpandedConfigs(new Set([...expandedConfigs, newConfig.id]));
  }

  function updateConfig(index: number, field: string, value: any) {
    const updated = [...configs];
    updated[index] = { ...updated[index], [field]: value };
    setConfigs(updated);
  }

  function updateNestedConfig(index: number, section: string, field: string, value: any) {
    const updated = [...configs];
    updated[index] = {
      ...updated[index],
      [section]: {
        ...(updated[index] as any)[section],
        [field]: value,
      },
    };
    setConfigs(updated);
  }

  async function removeConfig(index: number) {
    const config = configs[index];

    Alert.alert(
      'Remove Personalization',
      'Are you sure you want to remove this personalization option?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (config.id && !config.id.startsWith('new-')) {
              try {
                await PersonalizationService.deletePersonalizationConfig(config.id);
              } catch (error) {
                console.error('Error deleting config:', error);
              }
            }
            setConfigs(configs.filter((_, i) => i !== index));
          },
        },
      ]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      for (const config of configs) {
        if (config.id.startsWith('new-')) {
          const { id, created_at, updated_at, ...configData } = config;
          await PersonalizationService.createPersonalizationConfig(listingId, configData);
        } else {
          await PersonalizationService.updatePersonalizationConfig(config.id, config);
        }
      }
      await loadConfigs();
      onSave?.();
      Alert.alert('Success', 'Personalization settings saved');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save settings');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Advanced Personalization</Text>
        <Text style={styles.subtitle}>
          Enable Etsy-style personalization with live preview for your Custom Service
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Eye size={20} color={theme.colors.primary} />
        <Text style={styles.infoText}>
          Live Preview is enabled by default for all personalization options.
          Customers see instant visual feedback as they customize.
        </Text>
      </View>

      {configs.map((config, index) => (
        <View key={config.id} style={styles.configCard}>
          <TouchableOpacity
            style={styles.configHeader}
            onPress={() => toggleExpand(config.id)}
          >
            <View style={styles.configHeaderLeft}>
              <Switch
                value={config.is_enabled}
                onValueChange={(value) => updateConfig(index, 'is_enabled', value)}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              />
              <Text style={styles.configTitle}>
                {PERSONALIZATION_TYPES.find(t => t.value === config.personalization_type)?.label || 'Personalization'}
              </Text>
              {config.is_required && (
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredText}>Required</Text>
                </View>
              )}
            </View>
            <View style={styles.configHeaderRight}>
              <TouchableOpacity
                onPress={() => removeConfig(index)}
                style={styles.deleteButton}
              >
                <Trash2 size={18} color={theme.colors.error} />
              </TouchableOpacity>
              {expandedConfigs.has(config.id) ? (
                <ChevronUp size={20} color={theme.colors.textSecondary} />
              ) : (
                <ChevronDown size={20} color={theme.colors.textSecondary} />
              )}
            </View>
          </TouchableOpacity>

          {expandedConfigs.has(config.id) && (
            <View style={styles.configBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Personalization Type</Text>
                <View style={styles.typeGrid}>
                  {PERSONALIZATION_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = config.personalization_type === type.value;
                    return (
                      <TouchableOpacity
                        key={type.value}
                        style={[styles.typeOption, isSelected && styles.typeOptionSelected]}
                        onPress={() => updateConfig(index, 'personalization_type', type.value)}
                      >
                        <Icon size={20} color={isSelected ? '#fff' : theme.colors.textSecondary} />
                        <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Required</Text>
                  <Switch
                    value={config.is_required}
                    onValueChange={(value) => updateConfig(index, 'is_required', value)}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Live Preview Mode</Text>
                {PREVIEW_MODES.map((mode) => (
                  <TouchableOpacity
                    key={mode.value}
                    style={[
                      styles.radioOption,
                      config.live_preview_mode === mode.value && styles.radioOptionSelected,
                    ]}
                    onPress={() => updateConfig(index, 'live_preview_mode', mode.value)}
                  >
                    <View style={styles.radioCircle}>
                      {config.live_preview_mode === mode.value && (
                        <View style={styles.radioCircleFilled} />
                      )}
                    </View>
                    <View style={styles.radioContent}>
                      <Text style={styles.radioLabel}>{mode.label}</Text>
                      <Text style={styles.radioDescription}>{mode.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {(config.personalization_type === 'text' || config.personalization_type === 'combined') && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Text Settings</Text>

                  <View style={styles.switchRow}>
                    <Text style={styles.label}>Enable Text Input</Text>
                    <Switch
                      value={config.text_config.enabled}
                      onValueChange={(value) => updateNestedConfig(index, 'text_config', 'enabled', value)}
                      trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    />
                  </View>

                  {config.text_config.enabled && (
                    <>
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Max Characters</Text>
                        <TextInput
                          style={styles.input}
                          value={String(config.text_config.max_length)}
                          onChangeText={(value) => updateNestedConfig(index, 'text_config', 'max_length', parseInt(value) || 0)}
                          keyboardType="numeric"
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Placeholder Text</Text>
                        <TextInput
                          style={styles.input}
                          value={config.text_config.placeholder}
                          onChangeText={(value) => updateNestedConfig(index, 'text_config', 'placeholder', value)}
                        />
                      </View>

                      <View style={styles.switchRow}>
                        <Text style={styles.label}>Allow Multiple Lines</Text>
                        <Switch
                          value={config.text_config.multiline}
                          onValueChange={(value) => updateNestedConfig(index, 'text_config', 'multiline', value)}
                          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                        />
                      </View>
                    </>
                  )}
                </View>
              )}

              {(config.personalization_type === 'image_upload' || config.personalization_type === 'combined') && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Image Upload Settings</Text>

                  <View style={styles.switchRow}>
                    <Text style={styles.label}>Enable Image Upload</Text>
                    <Switch
                      value={config.image_upload_config.enabled}
                      onValueChange={(value) => updateNestedConfig(index, 'image_upload_config', 'enabled', value)}
                      trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    />
                  </View>

                  {config.image_upload_config.enabled && (
                    <>
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Max File Size (MB)</Text>
                        <TextInput
                          style={styles.input}
                          value={String(config.image_upload_config.max_file_size_mb)}
                          onChangeText={(value) => updateNestedConfig(index, 'image_upload_config', 'max_file_size_mb', parseInt(value) || 10)}
                          keyboardType="numeric"
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Max Uploads</Text>
                        <TextInput
                          style={styles.input}
                          value={String(config.image_upload_config.max_uploads)}
                          onChangeText={(value) => updateNestedConfig(index, 'image_upload_config', 'max_uploads', parseInt(value) || 1)}
                          keyboardType="numeric"
                        />
                      </View>

                      <View style={styles.switchRow}>
                        <Text style={styles.label}>Require High Resolution</Text>
                        <Switch
                          value={config.image_upload_config.require_high_res}
                          onValueChange={(value) => updateNestedConfig(index, 'image_upload_config', 'require_high_res', value)}
                          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                        />
                      </View>
                    </>
                  )}
                </View>
              )}

              {(config.personalization_type === 'font_selection' || config.personalization_type === 'combined') && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Font Settings</Text>

                  <View style={styles.switchRow}>
                    <Text style={styles.label}>Enable Font Selection</Text>
                    <Switch
                      value={config.font_config.enabled}
                      onValueChange={(value) => updateNestedConfig(index, 'font_config', 'enabled', value)}
                      trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    />
                  </View>

                  {config.font_config.enabled && (
                    <>
                      <View style={styles.switchRow}>
                        <Text style={styles.label}>Allow All System Fonts</Text>
                        <Switch
                          value={config.font_config.allow_all_system_fonts}
                          onValueChange={(value) => updateNestedConfig(index, 'font_config', 'allow_all_system_fonts', value)}
                          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                        />
                      </View>

                      <View style={styles.switchRow}>
                        <Text style={styles.label}>Allow Size Selection</Text>
                        <Switch
                          value={config.font_config.allow_size_selection}
                          onValueChange={(value) => updateNestedConfig(index, 'font_config', 'allow_size_selection', value)}
                          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                        />
                      </View>

                      {config.font_config.allow_size_selection && (
                        <View style={styles.row}>
                          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>Min Size</Text>
                            <TextInput
                              style={styles.input}
                              value={String(config.font_config.min_size)}
                              onChangeText={(value) => updateNestedConfig(index, 'font_config', 'min_size', parseInt(value) || 12)}
                              keyboardType="numeric"
                            />
                          </View>
                          <View style={[styles.formGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Max Size</Text>
                            <TextInput
                              style={styles.input}
                              value={String(config.font_config.max_size)}
                              onChangeText={(value) => updateNestedConfig(index, 'font_config', 'max_size', parseInt(value) || 72)}
                              keyboardType="numeric"
                            />
                          </View>
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}

              {(config.personalization_type === 'color_selection' || config.personalization_type === 'combined') && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Color Settings</Text>

                  <View style={styles.switchRow}>
                    <Text style={styles.label}>Enable Color Selection</Text>
                    <Switch
                      value={config.color_config.enabled}
                      onValueChange={(value) => updateNestedConfig(index, 'color_config', 'enabled', value)}
                      trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    />
                  </View>

                  {config.color_config.enabled && (
                    <>
                      <View style={styles.switchRow}>
                        <Text style={styles.label}>Allow Custom Colors</Text>
                        <Switch
                          value={config.color_config.allow_custom_colors}
                          onValueChange={(value) => updateNestedConfig(index, 'color_config', 'allow_custom_colors', value)}
                          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Default Color</Text>
                        <TextInput
                          style={styles.input}
                          value={config.color_config.default_color}
                          onChangeText={(value) => updateNestedConfig(index, 'color_config', 'default_color', value)}
                          placeholder="#000000"
                        />
                      </View>
                    </>
                  )}
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Lock Personalization After</Text>
                <View style={styles.lockStageOptions}>
                  {LOCK_STAGES.map((stage) => (
                    <TouchableOpacity
                      key={stage.value}
                      style={[
                        styles.lockStageOption,
                        config.lock_after_stage === stage.value && styles.lockStageOptionSelected,
                      ]}
                      onPress={() => updateConfig(index, 'lock_after_stage', stage.value)}
                    >
                      <Text
                        style={[
                          styles.lockStageLabel,
                          config.lock_after_stage === stage.value && styles.lockStageLabelSelected,
                        ]}
                      >
                        {stage.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Help Text (shown to customers)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={config.help_text || ''}
                  onChangeText={(value) => updateConfig(index, 'help_text', value)}
                  multiline
                  numberOfLines={3}
                  placeholder="Instructions or tips for this personalization option..."
                />
              </View>
            </View>
          )}
        </View>
      ))}

      <TouchableOpacity style={styles.addButton} onPress={addNewConfig}>
        <Plus size={20} color={theme.colors.primary} />
        <Text style={styles.addButtonText}>Add Personalization Option</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Personalization Settings</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.primaryLight,
    padding: 12,
    margin: 16,
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.primary,
    lineHeight: 18,
  },
  configCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  configHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  configHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  requiredBadge: {
    backgroundColor: theme.colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    padding: 4,
  },
  configBody: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  typeOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  typeLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  typeLabelSelected: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  radioOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioCircleFilled: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  radioContent: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  radioDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  lockStageOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lockStageOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  lockStageOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  lockStageLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  lockStageLabelSelected: {
    color: '#fff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    gap: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
