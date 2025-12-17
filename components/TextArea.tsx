import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { colors, borderRadius, spacing, fontSize, fontWeight } from '@/constants/theme';

interface TextAreaProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  maxWords?: number;
  showWordCount?: boolean;
}

export function TextArea({ label, error, helperText, maxWords, showWordCount, value, onChangeText, ...props }: TextAreaProps) {
  const countWords = (text: string): number => {
    if (!text || text.trim() === '') return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleTextChange = (text: string) => {
    if (maxWords) {
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      if (words.length > maxWords) {
        return;
      }
    }
    onChangeText?.(text);
  };

  const wordCount = countWords((value as string) || '');
  const isOverLimit = maxWords ? wordCount > maxWords : false;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        {label && <Text style={styles.label}>{label}</Text>}
        {showWordCount && maxWords && (
          <Text style={[styles.wordCount, isOverLimit && styles.wordCountError]}>
            {wordCount} / {maxWords} words
          </Text>
        )}
      </View>
      <TextInput
        style={[styles.textArea, error && styles.textAreaError]}
        placeholderTextColor={colors.textLight}
        multiline
        textAlignVertical="top"
        value={value}
        onChangeText={handleTextChange}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {helperText && !error && <Text style={styles.helperText}>{helperText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  wordCount: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  wordCountError: {
    color: colors.error,
  },
  textArea: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 120,
  },
  textAreaError: {
    borderColor: colors.error,
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  helperText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
export default TextArea;
