import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Type,
  Image as ImageIcon,
  Palette,
  Upload,
  Check,
  ChevronDown,
  AlertCircle,
  Info,
  Sparkles,
} from 'lucide-react-native';
import { PersonalizationService } from '../lib/personalization';
import {
  PersonalizationConfig,
  PersonalizationFont,
  PersonalizationSubmission,
  PersonalizationImagePreset,
} from '../types/database';
import { theme } from '../constants/theme';

interface Props {
  listingId: string;
  customerId: string;
  cartItemId?: string;
  onPersonalizationChange?: (submissions: Partial<PersonalizationSubmission>[]) => void;
  onPriceImpactChange?: (amount: number) => void;
  initialSubmissions?: PersonalizationSubmission[];
}

interface PersonalizationState {
  [configId: string]: Partial<PersonalizationSubmission>;
}

export default function PersonalizationForm({
  listingId,
  customerId,
  cartItemId,
  onPersonalizationChange,
  onPriceImpactChange,
  initialSubmissions,
}: Props) {
  const [configs, setConfigs] = useState<PersonalizationConfig[]>([]);
  const [fonts, setFonts] = useState<PersonalizationFont[]>([]);
  const [imagePresets, setImagePresets] = useState<PersonalizationImagePreset[]>([]);
  const [state, setState] = useState<PersonalizationState>({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<{ [configId: string]: string[] }>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [totalPriceImpact, setTotalPriceImpact] = useState(0);

  useEffect(() => {
    loadData();
  }, [listingId]);

  useEffect(() => {
    if (initialSubmissions?.length) {
      const initialState: PersonalizationState = {};
      initialSubmissions.forEach(sub => {
        if (sub.config_id) {
          initialState[sub.config_id] = sub;
        }
      });
      setState(initialState);
    }
  }, [initialSubmissions]);

  useEffect(() => {
    calculateTotalPriceImpact();
    notifyChange();
  }, [state]);

  async function loadData() {
    setLoading(true);
    try {
      const [configData, fontData, presetData] = await Promise.all([
        PersonalizationService.getListingPersonalizationConfig(listingId),
        PersonalizationService.getAvailableFonts(),
        PersonalizationService.getImagePresets(listingId),
      ]);

      setConfigs(configData as PersonalizationConfig[]);
      setFonts(fontData);
      setImagePresets(presetData);

      const initialExpanded = new Set<string>();
      (configData as PersonalizationConfig[]).forEach(config => {
        if (config.is_required) {
          initialExpanded.add(config.id);
        }
      });
      setExpandedSections(initialExpanded);

      const defaultState: PersonalizationState = {};
      (configData as PersonalizationConfig[]).forEach(config => {
        defaultState[config.id] = {
          config_id: config.id,
          submission_type: config.personalization_type,
          customer_id: customerId,
          listing_id: listingId,
          cart_item_id: cartItemId,
          font_data: config.font_config?.enabled ? {
            font_id: config.font_config.default_font_id || fontData[0]?.id,
            font_family: fontData[0]?.family || 'Arial',
            font_size: config.font_config.default_size || 24,
          } : undefined,
          color_data: config.color_config?.enabled ? {
            hex: config.color_config.default_color || '#000000',
          } : undefined,
        };
      });
      setState(prev => ({ ...defaultState, ...prev }));
    } catch (error) {
      console.error('Error loading personalization data:', error);
    }
    setLoading(false);
  }

  async function calculateTotalPriceImpact() {
    let total = 0;
    for (const config of configs) {
      const submission = state[config.id];
      if (submission) {
        try {
          const impact = await PersonalizationService.calculatePriceImpact(
            config.id,
            submission.text_value,
            submission.image_data?.uploaded_url ? 1 : 0
          );
          total += impact;
        } catch (error) {
          console.error('Error calculating price impact:', error);
        }
      }
    }
    setTotalPriceImpact(total);
    onPriceImpactChange?.(total);
  }

  function notifyChange() {
    const submissions = Object.values(state).filter(s => s.config_id);
    onPersonalizationChange?.(submissions);
  }

  function updateState(configId: string, updates: Partial<PersonalizationSubmission>) {
    setState(prev => ({
      ...prev,
      [configId]: {
        ...prev[configId],
        ...updates,
      },
    }));
  }

  function toggleSection(configId: string) {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(configId)) {
        newSet.delete(configId);
      } else {
        newSet.add(configId);
      }
      return newSet;
    });
  }

  async function handleImagePick(configId: string) {
    const config = configs.find(c => c.id === configId);
    if (!config) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: config.image_upload_config?.require_high_res ? 1 : 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      updateState(configId, {
        image_data: {
          uploaded_url: asset.uri,
          original_filename: asset.fileName || 'image.jpg',
          file_size: asset.fileSize,
          dimensions: asset.width && asset.height ? {
            width: asset.width,
            height: asset.height,
          } : undefined,
        },
      });
    }
  }

  function selectPresetImage(configId: string, preset: PersonalizationImagePreset) {
    updateState(configId, {
      image_data: {
        preset_id: preset.id,
        uploaded_url: preset.image_url,
      },
      calculated_price_impact: preset.price_modifier,
    });
  }

  function selectFont(configId: string, font: PersonalizationFont) {
    const currentState = state[configId];
    updateState(configId, {
      font_data: {
        ...currentState?.font_data,
        font_id: font.id,
        font_family: font.family,
        font_size: currentState?.font_data?.font_size || 24,
      },
    });
  }

  function updateFontSize(configId: string, size: number) {
    const currentState = state[configId];
    updateState(configId, {
      font_data: {
        ...currentState?.font_data,
        font_size: size,
      } as any,
    });
  }

  function selectColor(configId: string, hex: string) {
    updateState(configId, {
      color_data: { hex },
    });
  }

  function validateSubmissions(): boolean {
    const newErrors: { [configId: string]: string[] } = {};
    let isValid = true;

    for (const config of configs) {
      const submission = state[config.id];
      const configErrors: string[] = [];

      if (config.is_required) {
        if (config.personalization_type === 'text' && !submission?.text_value) {
          configErrors.push('This field is required');
        }
        if (config.personalization_type === 'image_upload' && !submission?.image_data?.uploaded_url) {
          configErrors.push('Please upload an image');
        }
      }

      if (submission?.text_value && config.text_config) {
        if (config.text_config.max_length && submission.text_value.length > config.text_config.max_length) {
          configErrors.push(`Maximum ${config.text_config.max_length} characters allowed`);
        }
        if (config.text_config.min_length && submission.text_value.length < config.text_config.min_length) {
          configErrors.push(`Minimum ${config.text_config.min_length} characters required`);
        }
      }

      if (configErrors.length > 0) {
        newErrors[config.id] = configErrors;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }

  function renderLivePreview(config: PersonalizationConfig) {
    if (config.live_preview_mode === 'disabled') return null;

    const submission = state[config.id];
    if (!submission) return null;

    const hasContent = submission.text_value || submission.image_data?.uploaded_url;
    if (!hasContent) return null;

    return (
      <View style={styles.previewContainer}>
        <View style={styles.previewHeader}>
          <Sparkles size={16} color={theme.colors.primary} />
          <Text style={styles.previewTitle}>Live Preview</Text>
        </View>
        <View style={styles.previewContent}>
          {submission.image_data?.uploaded_url && (
            <Image
              source={{ uri: submission.image_data.uploaded_url }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
          {submission.text_value && (
            <Text
              style={[
                styles.previewText,
                {
                  fontFamily: submission.font_data?.font_family,
                  fontSize: submission.font_data?.font_size || 24,
                  color: submission.color_data?.hex || '#000',
                },
              ]}
            >
              {submission.text_value}
            </Text>
          )}
        </View>
        <Text style={styles.previewDisclaimer}>
          Preview is for reference only. Final product may vary slightly.
        </Text>
      </View>
    );
  }

  function renderTextInput(config: PersonalizationConfig) {
    const submission = state[config.id];
    const textConfig = config.text_config;

    return (
      <View style={styles.inputSection}>
        <View style={styles.inputHeader}>
          <Type size={18} color={theme.colors.primary} />
          <Text style={styles.inputLabel}>Custom Text</Text>
          {config.is_required && <Text style={styles.requiredStar}>*</Text>}
        </View>

        <TextInput
          style={[
            styles.textInput,
            textConfig?.multiline && styles.textInputMultiline,
            errors[config.id] && styles.inputError,
          ]}
          value={submission?.text_value || ''}
          onChangeText={(text) => updateState(config.id, { text_value: text })}
          placeholder={textConfig?.placeholder || 'Enter your text'}
          placeholderTextColor={theme.colors.textLight}
          multiline={textConfig?.multiline}
          maxLength={textConfig?.max_length || undefined}
        />

        {textConfig?.max_length && (
          <Text style={styles.characterCount}>
            {(submission?.text_value?.length || 0)} / {textConfig.max_length}
          </Text>
        )}

        {errors[config.id]?.map((error, i) => (
          <View key={i} style={styles.errorRow}>
            <AlertCircle size={14} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ))}
      </View>
    );
  }

  function renderImageUpload(config: PersonalizationConfig) {
    const submission = state[config.id];
    const imageConfig = config.image_upload_config;
    const configPresets = imagePresets.filter(p => p.config_id === config.id || !p.config_id);

    return (
      <View style={styles.inputSection}>
        <View style={styles.inputHeader}>
          <ImageIcon size={18} color={theme.colors.primary} />
          <Text style={styles.inputLabel}>Image</Text>
          {config.is_required && <Text style={styles.requiredStar}>*</Text>}
        </View>

        {submission?.image_data?.uploaded_url ? (
          <View style={styles.uploadedImageContainer}>
            <Image
              source={{ uri: submission.image_data.uploaded_url }}
              style={styles.uploadedImage}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={() => handleImagePick(config.id)}
            >
              <Text style={styles.changeImageText}>Change Image</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => handleImagePick(config.id)}
          >
            <Upload size={24} color={theme.colors.primary} />
            <Text style={styles.uploadText}>Upload Your Image</Text>
            <Text style={styles.uploadHint}>
              {imageConfig?.allowed_formats?.join(', ').toUpperCase() || 'JPG, PNG'} -
              Max {imageConfig?.max_file_size_mb || 10}MB
            </Text>
          </TouchableOpacity>
        )}

        {configPresets.length > 0 && (
          <View style={styles.presetsSection}>
            <Text style={styles.presetsTitle}>Or choose from our designs:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
              {configPresets.map(preset => (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.presetItem,
                    submission?.image_data?.preset_id === preset.id && styles.presetItemSelected,
                  ]}
                  onPress={() => selectPresetImage(config.id, preset)}
                >
                  <Image
                    source={{ uri: preset.thumbnail_url || preset.image_url }}
                    style={styles.presetImage}
                    resizeMode="cover"
                  />
                  {preset.price_modifier > 0 && (
                    <View style={styles.presetPrice}>
                      <Text style={styles.presetPriceText}>+${preset.price_modifier}</Text>
                    </View>
                  )}
                  {submission?.image_data?.preset_id === preset.id && (
                    <View style={styles.presetCheck}>
                      <Check size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {errors[config.id]?.map((error, i) => (
          <View key={i} style={styles.errorRow}>
            <AlertCircle size={14} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ))}
      </View>
    );
  }

  function renderFontSelection(config: PersonalizationConfig) {
    const submission = state[config.id];
    const fontConfig = config.font_config;
    const [showFontPicker, setShowFontPicker] = useState(false);

    const selectedFont = fonts.find(f => f.id === submission?.font_data?.font_id);

    return (
      <View style={styles.inputSection}>
        <View style={styles.inputHeader}>
          <Type size={18} color={theme.colors.primary} />
          <Text style={styles.inputLabel}>Font Style</Text>
        </View>

        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowFontPicker(!showFontPicker)}
        >
          <Text style={[styles.pickerButtonText, { fontFamily: selectedFont?.family }]}>
            {selectedFont?.name || 'Select Font'}
          </Text>
          <ChevronDown size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {showFontPicker && (
          <View style={styles.fontList}>
            {fonts.map(font => (
              <TouchableOpacity
                key={font.id}
                style={[
                  styles.fontOption,
                  submission?.font_data?.font_id === font.id && styles.fontOptionSelected,
                ]}
                onPress={() => {
                  selectFont(config.id, font);
                  setShowFontPicker(false);
                }}
              >
                <Text style={[styles.fontOptionText, { fontFamily: font.family }]}>
                  {font.name}
                </Text>
                {submission?.font_data?.font_id === font.id && (
                  <Check size={18} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {fontConfig?.allow_size_selection && (
          <View style={styles.fontSizeRow}>
            <Text style={styles.fontSizeLabel}>Size:</Text>
            <View style={styles.fontSizeControls}>
              <TouchableOpacity
                style={styles.fontSizeButton}
                onPress={() => updateFontSize(config.id, Math.max(fontConfig.min_size, (submission?.font_data?.font_size || 24) - 2))}
              >
                <Text style={styles.fontSizeButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.fontSizeValue}>{submission?.font_data?.font_size || 24}pt</Text>
              <TouchableOpacity
                style={styles.fontSizeButton}
                onPress={() => updateFontSize(config.id, Math.min(fontConfig.max_size, (submission?.font_data?.font_size || 24) + 2))}
              >
                <Text style={styles.fontSizeButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }

  function renderColorSelection(config: PersonalizationConfig) {
    const submission = state[config.id];
    const colorConfig = config.color_config;

    const defaultColors = [
      { hex: '#000000', name: 'Black' },
      { hex: '#FFFFFF', name: 'White' },
      { hex: '#FF0000', name: 'Red' },
      { hex: '#0000FF', name: 'Blue' },
      { hex: '#00FF00', name: 'Green' },
      { hex: '#FFD700', name: 'Gold' },
      { hex: '#C0C0C0', name: 'Silver' },
      { hex: '#FFC0CB', name: 'Pink' },
    ];

    return (
      <View style={styles.inputSection}>
        <View style={styles.inputHeader}>
          <Palette size={18} color={theme.colors.primary} />
          <Text style={styles.inputLabel}>Color</Text>
        </View>

        <View style={styles.colorGrid}>
          {defaultColors.map(color => (
            <TouchableOpacity
              key={color.hex}
              style={[
                styles.colorOption,
                { backgroundColor: color.hex },
                color.hex === '#FFFFFF' && styles.colorOptionWhite,
                submission?.color_data?.hex === color.hex && styles.colorOptionSelected,
              ]}
              onPress={() => selectColor(config.id, color.hex)}
            >
              {submission?.color_data?.hex === color.hex && (
                <Check size={16} color={color.hex === '#FFFFFF' ? '#000' : '#fff'} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {colorConfig?.allow_custom_colors && (
          <View style={styles.customColorRow}>
            <Text style={styles.customColorLabel}>Custom color:</Text>
            <TextInput
              style={styles.customColorInput}
              value={submission?.color_data?.hex || ''}
              onChangeText={(hex) => selectColor(config.id, hex)}
              placeholder="#000000"
              maxLength={7}
            />
            <View
              style={[
                styles.customColorPreview,
                { backgroundColor: submission?.color_data?.hex || '#000' },
              ]}
            />
          </View>
        )}
      </View>
    );
  }

  function renderConfig(config: PersonalizationConfig) {
    const isExpanded = expandedSections.has(config.id);
    const submission = state[config.id];
    const hasValue = submission?.text_value || submission?.image_data?.uploaded_url;

    return (
      <View key={config.id} style={styles.configSection}>
        <TouchableOpacity
          style={styles.configHeader}
          onPress={() => toggleSection(config.id)}
        >
          <View style={styles.configHeaderLeft}>
            {hasValue && (
              <View style={styles.completedIndicator}>
                <Check size={14} color="#fff" />
              </View>
            )}
            <Text style={styles.configTitle}>
              {config.personalization_type === 'text' ? 'Personalize Your Text' :
               config.personalization_type === 'image_upload' ? 'Add Your Image' :
               config.personalization_type === 'font_selection' ? 'Choose Font' :
               config.personalization_type === 'color_selection' ? 'Select Color' :
               'Personalize'}
            </Text>
            {config.is_required && <Text style={styles.requiredBadge}>Required</Text>}
          </View>
          <ChevronDown
            size={20}
            color={theme.colors.textSecondary}
            style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.configBody}>
            {config.help_text && (
              <View style={styles.helpTextBox}>
                <Info size={16} color={theme.colors.textSecondary} />
                <Text style={styles.helpText}>{config.help_text}</Text>
              </View>
            )}

            {(config.personalization_type === 'text' || config.text_config?.enabled) &&
              renderTextInput(config)}

            {(config.personalization_type === 'image_upload' || config.image_upload_config?.enabled) &&
              renderImageUpload(config)}

            {(config.personalization_type === 'font_selection' || config.font_config?.enabled) &&
              renderFontSelection(config)}

            {(config.personalization_type === 'color_selection' || config.color_config?.enabled) &&
              renderColorSelection(config)}

            {config.live_preview_mode !== 'disabled' && renderLivePreview(config)}
          </View>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading personalization options...</Text>
      </View>
    );
  }

  if (configs.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Sparkles size={20} color={theme.colors.primary} />
        <Text style={styles.headerTitle}>Personalize Your Order</Text>
      </View>

      {configs.map(renderConfig)}

      {totalPriceImpact > 0 && (
        <View style={styles.priceImpactBanner}>
          <Text style={styles.priceImpactText}>
            Personalization adds ${totalPriceImpact.toFixed(2)} to your order
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.primaryLight,
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  configSection: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
    gap: 8,
  },
  completedIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  configTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  requiredBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.warning,
    backgroundColor: theme.colors.warningLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  configBody: {
    padding: 16,
    paddingTop: 0,
  },
  helpTextBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  requiredStar: {
    color: theme.colors.error,
    fontSize: 14,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: '#fff',
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  characterCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
  },
  uploadButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  uploadText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  uploadHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  uploadedImageContainer: {
    alignItems: 'center',
    gap: 12,
  },
  uploadedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  changeImageButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
  },
  changeImageText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  presetsSection: {
    marginTop: 16,
  },
  presetsTitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  presetsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  presetItem: {
    width: 80,
    height: 80,
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetItemSelected: {
    borderColor: theme.colors.primary,
  },
  presetImage: {
    width: '100%',
    height: '100%',
  },
  presetPrice: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 2,
  },
  presetPriceText: {
    fontSize: 10,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  presetCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
  },
  pickerButtonText: {
    fontSize: 15,
    color: theme.colors.text,
  },
  fontList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    maxHeight: 200,
    overflow: 'hidden',
  },
  fontOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  fontOptionSelected: {
    backgroundColor: theme.colors.primaryLight,
  },
  fontOptionText: {
    fontSize: 15,
    color: theme.colors.text,
  },
  fontSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  fontSizeLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fontSizeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  fontSizeValue: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    minWidth: 50,
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionWhite: {
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  customColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  customColorLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  customColorInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    color: theme.colors.text,
  },
  customColorPreview: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  previewContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  previewContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: 150,
    marginBottom: 8,
  },
  previewText: {
    textAlign: 'center',
  },
  previewDisclaimer: {
    fontSize: 11,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  priceImpactBanner: {
    backgroundColor: theme.colors.primaryLight,
    padding: 12,
  },
  priceImpactText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    textAlign: 'center',
  },
});
