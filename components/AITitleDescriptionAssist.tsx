import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { Sparkles, X, RotateCcw, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface AITitleDescriptionAssistProps {
  currentTitle: string;
  currentDescription: string;
  onAccept: (title: string, description: string) => void;
  disabled?: boolean;
  type: 'job' | 'service';
  visible?: boolean;
}

interface GeneratedContent {
  title: string;
  description: string;
}

export default function AITitleDescriptionAssist({
  currentTitle,
  currentDescription,
  onAccept,
  disabled,
  type,
  visible = true,
}: AITitleDescriptionAssistProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedDescription, setGeneratedDescription] = useState('');

  const [tone, setTone] = useState<'professional' | 'friendly'>('professional');
  const [length, setLength] = useState<'concise' | 'detailed'>('concise');

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const titleWordLimit = type === 'job' ? 8 : 10;
  const descriptionWordLimit = 120;

  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const titleWordCount = countWords(generatedTitle);
  const descriptionWordCount = countWords(generatedDescription);

  useEffect(() => {
    if (modalVisible && currentTitle.trim()) {
      generateContent();
    }
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [modalVisible]);

  const generateContent = useCallback(async () => {
    if (!currentTitle.trim()) {
      setError('Please enter a title first');
      return;
    }

    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const prompt = `You are a professional ${type} posting assistant.

STRICT RULES:
- Title must be EXACTLY ${titleWordLimit} words or fewer
- Description must be EXACTLY ${descriptionWordLimit} words or fewer
- NO emojis, NO pricing, NO guarantees
- Use ${tone} tone
- Length preference: ${length}

${type === 'job' ? `
Task: Improve this job title and generate a matching description.

Input Title: "${currentTitle}"

Job Title Requirements:
- Maximum ${titleWordLimit} words
- Clear, task-oriented
- Describes what needs to be done

Job Description Requirements:
- Maximum ${descriptionWordLimit} words
- What needs to be done
- Expected outcome
- Reasonable requirements
- Neutral, task-focused tone
` : `
Task: Improve this service title and generate a matching description.

Input Title: "${currentTitle}"

Service Title Requirements:
- Maximum ${titleWordLimit} words
- Descriptive and service-focused
- Professional, customer-friendly

Service Description Requirements:
- Maximum ${descriptionWordLimit} words
- What the service includes
- Who it's ideal for
- Expected result
- Professional tone
`}

Respond ONLY with valid JSON in this exact format:
{
  "title": "improved title here",
  "description": "generated description here"
}`;

      const response = await supabase.functions.invoke('generate-title-description', {
        body: {
          prompt,
          maxTokens: 500,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'AI service unavailable');
      }

      if (!response.data || response.data.error) {
        throw new Error('Failed to generate content');
      }

      const content: GeneratedContent = response.data;

      if (!content.title || !content.description) {
        throw new Error('Invalid response format');
      }

      if (abortController.current?.signal.aborted) {
        return;
      }

      setGeneratedTitle(content.title.trim());
      setGeneratedDescription(content.description.trim());
      setError(null);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      console.error('AI generation error:', err);
      setError('AI assistance is temporarily unavailable. Please write your content manually.');
      setGeneratedTitle('');
      setGeneratedDescription('');
    } finally {
      setLoading(false);
      abortController.current = null;
    }
  }, [currentTitle, type, titleWordLimit, descriptionWordLimit, tone, length]);

  const debouncedGenerate = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      generateContent();
    }, 800);
  }, [generateContent]);

  const handleRegenerate = () => {
    generateContent();
  };

  const handleAccept = () => {
    if (generatedTitle.trim() && generatedDescription.trim()) {
      onAccept(generatedTitle.trim(), generatedDescription.trim());
      setModalVisible(false);
      resetState();
    }
  };

  const handleClose = () => {
    setModalVisible(false);
    resetState();
  };

  const resetState = () => {
    setGeneratedTitle('');
    setGeneratedDescription('');
    setError(null);
    setTone('professional');
    setLength('concise');
  };

  if (!visible) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.assistButton, disabled && styles.assistButtonDisabled]}
        onPress={() => setModalVisible(true)}
        disabled={disabled}
      >
        <Sparkles size={20} color={disabled ? colors.textSecondary : colors.primary} />
        <Text style={[styles.assistButtonText, disabled && styles.assistButtonTextDisabled]}>
          AI Assist: Improve Title & Description
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Sparkles size={24} color={colors.primary} />
                <Text style={styles.modalTitle}>AI Writing Assistant</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Tone and Length Controls */}
              <View style={styles.controlsContainer}>
                <View style={styles.controlGroup}>
                  <Text style={styles.controlLabel}>Tone</Text>
                  <View style={styles.optionButtons}>
                    <TouchableOpacity
                      style={[styles.optionButton, tone === 'professional' && styles.optionButtonActive]}
                      onPress={() => {
                        setTone('professional');
                        if (generatedTitle || generatedDescription) {
                          debouncedGenerate();
                        }
                      }}
                      disabled={loading}
                    >
                      <Text style={[styles.optionButtonText, tone === 'professional' && styles.optionButtonTextActive]}>
                        Professional
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.optionButton, tone === 'friendly' && styles.optionButtonActive]}
                      onPress={() => {
                        setTone('friendly');
                        if (generatedTitle || generatedDescription) {
                          debouncedGenerate();
                        }
                      }}
                      disabled={loading}
                    >
                      <Text style={[styles.optionButtonText, tone === 'friendly' && styles.optionButtonTextActive]}>
                        Friendly
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.controlGroup}>
                  <Text style={styles.controlLabel}>Length</Text>
                  <View style={styles.optionButtons}>
                    <TouchableOpacity
                      style={[styles.optionButton, length === 'concise' && styles.optionButtonActive]}
                      onPress={() => {
                        setLength('concise');
                        if (generatedTitle || generatedDescription) {
                          debouncedGenerate();
                        }
                      }}
                      disabled={loading}
                    >
                      <Text style={[styles.optionButtonText, length === 'concise' && styles.optionButtonTextActive]}>
                        Concise
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.optionButton, length === 'detailed' && styles.optionButtonActive]}
                      onPress={() => {
                        setLength('detailed');
                        if (generatedTitle || generatedDescription) {
                          debouncedGenerate();
                        }
                      }}
                      disabled={loading}
                    >
                      <Text style={[styles.optionButtonText, length === 'detailed' && styles.optionButtonTextActive]}>
                        More Detailed
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Generating improved content...</Text>
                </View>
              )}

              {error && !loading && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={handleRegenerate}>
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!loading && !error && generatedTitle && generatedDescription && (
                <>
                  {/* Title Field */}
                  <View style={styles.fieldContainer}>
                    <View style={styles.fieldHeader}>
                      <Text style={styles.fieldLabel}>Improved Title</Text>
                      <View style={[styles.wordCounter, titleWordCount > titleWordLimit && styles.wordCounterError]}>
                        <Text style={[styles.wordCounterText, titleWordCount > titleWordLimit && styles.wordCounterTextError]}>
                          {titleWordCount} / {titleWordLimit} words
                        </Text>
                      </View>
                    </View>
                    <TextInput
                      style={[styles.titleInput, titleWordCount > titleWordLimit && styles.inputError]}
                      value={generatedTitle}
                      onChangeText={setGeneratedTitle}
                      multiline
                      placeholder="Edit title..."
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  {/* Description Field */}
                  <View style={styles.fieldContainer}>
                    <View style={styles.fieldHeader}>
                      <Text style={styles.fieldLabel}>Generated Description</Text>
                      <View style={[styles.wordCounter, descriptionWordCount > descriptionWordLimit && styles.wordCounterError]}>
                        <Text style={[styles.wordCounterText, descriptionWordCount > descriptionWordLimit && styles.wordCounterTextError]}>
                          {descriptionWordCount} / {descriptionWordLimit} words
                        </Text>
                      </View>
                    </View>
                    <TextInput
                      style={[styles.descriptionInput, descriptionWordCount > descriptionWordLimit && styles.inputError]}
                      value={generatedDescription}
                      onChangeText={setGeneratedDescription}
                      multiline
                      placeholder="Edit description..."
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.regenerateButton}
                      onPress={handleRegenerate}
                    >
                      <RotateCcw size={18} color={colors.secondary} />
                      <Text style={styles.regenerateButtonText}>Regenerate</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.acceptButton,
                        (titleWordCount > titleWordLimit || descriptionWordCount > descriptionWordLimit) && styles.acceptButtonDisabled
                      ]}
                      onPress={handleAccept}
                      disabled={titleWordCount > titleWordLimit || descriptionWordCount > descriptionWordLimit}
                    >
                      <Check size={20} color={colors.white} />
                      <Text style={styles.acceptButtonText}>Accept & Use</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.helperText}>
                    Review and edit the AI-generated content before accepting. Once accepted, you can still manually edit both fields.
                  </Text>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  assistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  assistButtonDisabled: {
    borderColor: colors.border,
    opacity: 0.5,
  },
  assistButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  assistButtonTextDisabled: {
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalBody: {
    padding: spacing.lg,
  },
  controlsContainer: {
    marginBottom: spacing.lg,
  },
  controlGroup: {
    marginBottom: spacing.md,
  },
  controlLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  optionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  optionButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  optionButtonTextActive: {
    color: colors.white,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  wordCounter: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
  },
  wordCounterError: {
    backgroundColor: colors.errorLight,
  },
  wordCounterText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  wordCounterTextError: {
    color: colors.error,
  },
  titleInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  descriptionInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  regenerateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    gap: spacing.xs,
  },
  regenerateButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  acceptButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  acceptButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  helperText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
