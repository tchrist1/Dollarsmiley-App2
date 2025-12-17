import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Eye, Code, Smartphone, Monitor } from 'lucide-react-native';
import {
  renderTemplateLocal,
  getSampleTemplateData,
  type EmailTemplate,
  type RenderedTemplate,
} from '@/lib/email-templates';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface EmailTemplatePreviewProps {
  template: EmailTemplate;
  customVariables?: Record<string, any>;
  showControls?: boolean;
}

type ViewMode = 'rendered' | 'html' | 'text';
type DeviceMode = 'desktop' | 'mobile';

export default function EmailTemplatePreview({
  template,
  customVariables,
  showControls = true,
}: EmailTemplatePreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('rendered');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [rendered, setRendered] = useState<RenderedTemplate | null>(null);

  useEffect(() => {
    const variables = customVariables || getSampleTemplateData();
    const result = renderTemplateLocal(template, variables);
    setRendered(result);
  }, [template, customVariables]);

  if (!rendered) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading preview...</Text>
      </View>
    );
  }

  const renderContent = () => {
    if (viewMode === 'rendered') {
      return (
        <View style={styles.renderedContainer}>
          <View style={styles.emailHeader}>
            <Text style={styles.subjectLabel}>Subject:</Text>
            <Text style={styles.subjectText}>{rendered.subject}</Text>
          </View>
          <View style={styles.emailBody}>
            <Text style={styles.htmlContent}>{rendered.html_body}</Text>
          </View>
        </View>
      );
    } else if (viewMode === 'html') {
      return (
        <ScrollView style={styles.codeContainer}>
          <Text style={styles.codeText}>{rendered.html_body}</Text>
        </ScrollView>
      );
    } else {
      return (
        <ScrollView style={styles.codeContainer}>
          <Text style={styles.codeText}>{rendered.text_body}</Text>
        </ScrollView>
      );
    }
  };

  return (
    <View style={styles.container}>
      {showControls && (
        <View style={styles.controls}>
          <View style={styles.controlGroup}>
            <TouchableOpacity
              style={[
                styles.controlButton,
                viewMode === 'rendered' && styles.controlButtonActive,
              ]}
              onPress={() => setViewMode('rendered')}
            >
              <Eye
                size={16}
                color={
                  viewMode === 'rendered' ? colors.primary : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.controlButtonText,
                  viewMode === 'rendered' && styles.controlButtonTextActive,
                ]}
              >
                Preview
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlButton,
                viewMode === 'html' && styles.controlButtonActive,
              ]}
              onPress={() => setViewMode('html')}
            >
              <Code
                size={16}
                color={viewMode === 'html' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.controlButtonText,
                  viewMode === 'html' && styles.controlButtonTextActive,
                ]}
              >
                HTML
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlButton,
                viewMode === 'text' && styles.controlButtonActive,
              ]}
              onPress={() => setViewMode('text')}
            >
              <Text
                style={[
                  styles.controlButtonText,
                  viewMode === 'text' && styles.controlButtonTextActive,
                ]}
              >
                Text
              </Text>
            </TouchableOpacity>
          </View>

          {viewMode === 'rendered' && (
            <View style={styles.controlGroup}>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  deviceMode === 'desktop' && styles.controlButtonActive,
                ]}
                onPress={() => setDeviceMode('desktop')}
              >
                <Monitor
                  size={16}
                  color={
                    deviceMode === 'desktop' ? colors.primary : colors.textSecondary
                  }
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.controlButton,
                  deviceMode === 'mobile' && styles.controlButtonActive,
                ]}
                onPress={() => setDeviceMode('mobile')}
              >
                <Smartphone
                  size={16}
                  color={
                    deviceMode === 'mobile' ? colors.primary : colors.textSecondary
                  }
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <View
        style={[
          styles.previewContainer,
          deviceMode === 'mobile' && styles.mobilePreview,
        ]}
      >
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  controlGroup: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  controlButtonActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  controlButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  controlButtonTextActive: {
    color: colors.primary,
  },
  previewContainer: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
  },
  mobilePreview: {
    maxWidth: 375,
    alignSelf: 'center',
  },
  renderedContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emailHeader: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subjectLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  subjectText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  emailBody: {
    padding: spacing.lg,
  },
  htmlContent: {
    fontSize: fontSize.md,
    lineHeight: 24,
    color: colors.text,
  },
  codeContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#1e1e1e',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  codeText: {
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
    color: '#d4d4d4',
    lineHeight: 20,
  },
});
