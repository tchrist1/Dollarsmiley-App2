import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MessageSquare, Send, X, Edit2, Trash2 } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface ReviewResponseFormProps {
  reviewId: string;
  existingResponse?: {
    id: string;
    response_text: string;
    is_edited: boolean;
    created_at: string;
  };
  onSubmit: (responseText: string) => Promise<boolean>;
  onUpdate?: (responseId: string, responseText: string) => Promise<boolean>;
  onDelete?: (responseId: string) => Promise<boolean>;
  onCancel?: () => void;
}

export function ReviewResponseForm({
  reviewId,
  existingResponse,
  onSubmit,
  onUpdate,
  onDelete,
  onCancel,
}: ReviewResponseFormProps) {
  const [responseText, setResponseText] = useState(existingResponse?.response_text || '');
  const [isEditing, setIsEditing] = useState(!existingResponse);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const minLength = 10;
  const maxLength = 1000;

  const handleSubmit = async () => {
    if (responseText.trim().length < minLength) {
      Alert.alert('Too Short', `Response must be at least ${minLength} characters`);
      return;
    }

    if (responseText.trim().length > maxLength) {
      Alert.alert('Too Long', `Response must not exceed ${maxLength} characters`);
      return;
    }

    setIsSubmitting(true);

    try {
      let success = false;

      if (existingResponse && onUpdate) {
        success = await onUpdate(existingResponse.id, responseText.trim());
      } else {
        success = await onSubmit(responseText.trim());
      }

      if (success) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!existingResponse || !onDelete) return;

    Alert.alert(
      'Delete Response',
      'Are you sure you want to delete your response? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const success = await onDelete(existingResponse.id);
            setIsDeleting(false);

            if (success) {
              setResponseText('');
              setIsEditing(true);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    if (existingResponse) {
      setResponseText(existingResponse.response_text);
      setIsEditing(false);
    }
    onCancel?.();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Display mode (existing response, not editing)
  if (existingResponse && !isEditing) {
    return (
      <View style={styles.responseDisplay}>
        <View style={styles.responseHeader}>
          <View style={styles.responseHeaderLeft}>
            <MessageSquare size={20} color={colors.primary} />
            <Text style={styles.responseTitle}>Your Response</Text>
          </View>
          <View style={styles.responseActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setIsEditing(true)}
              disabled={isDeleting}
            >
              <Edit2 size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Trash2 size={18} color={colors.error} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.responseText}>{existingResponse.response_text}</Text>

        <View style={styles.responseFooter}>
          <Text style={styles.responseDate}>
            {existingResponse.is_edited ? 'Edited' : 'Responded'} on{' '}
            {formatDate(existingResponse.created_at)}
          </Text>
          {existingResponse.is_edited && (
            <View style={styles.editedBadge}>
              <Text style={styles.editedBadgeText}>Edited</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Edit/Create mode
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MessageSquare size={20} color={colors.primary} />
        <Text style={styles.title}>
          {existingResponse ? 'Edit Response' : 'Respond to Review'}
        </Text>
      </View>

      <Text style={styles.description}>
        {existingResponse
          ? 'Update your response to this review'
          : 'Show your professionalism by responding to this review'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Write your response..."
        value={responseText}
        onChangeText={setResponseText}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        maxLength={maxLength}
        editable={!isSubmitting}
      />

      <View style={styles.charCountContainer}>
        <Text
          style={[
            styles.charCount,
            responseText.length < minLength && styles.charCountWarning,
            responseText.length > maxLength && styles.charCountError,
          ]}
        >
          {responseText.length}/{maxLength}
          {responseText.length < minLength && ` (min ${minLength})`}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancel}
          disabled={isSubmitting}
        >
          <X size={18} color={colors.textSecondary} />
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.submitButton,
            (responseText.trim().length < minLength || isSubmitting) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={responseText.trim().length < minLength || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Send size={18} color={colors.white} />
              <Text style={styles.submitButtonText}>
                {existingResponse ? 'Update Response' : 'Send Response'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.tips}>
        <Text style={styles.tipsTitle}>Tips for a great response:</Text>
        <Text style={styles.tipText}>• Thank the customer for their feedback</Text>
        <Text style={styles.tipText}>• Address any concerns professionally</Text>
        <Text style={styles.tipText}>• Keep it positive and constructive</Text>
        <Text style={styles.tipText}>• Show you care about their experience</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: fontSize.sm * 1.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 120,
    marginBottom: spacing.xs,
  },
  charCountContainer: {
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  charCountWarning: {
    color: colors.warning,
  },
  charCountError: {
    color: colors.error,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonDisabled: {
    backgroundColor: colors.border,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  tips: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  tipsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tipText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  responseDisplay: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  responseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  responseTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  responseActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    padding: spacing.xs,
  },
  responseText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: fontSize.md * 1.6,
    marginBottom: spacing.md,
  },
  responseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  responseDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  editedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.sm,
  },
  editedBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.warning,
  },
});
