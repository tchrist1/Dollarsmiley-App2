import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Save,
  Eye,
  History,
  Copy,
  Mail,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react-native';
import Input from './Input';
import TextArea from './TextArea';
import Button from './Button';
import EmailTemplatePreview from './EmailTemplatePreview';
import {
  getTemplateVariables,
  extractVariablesFromTemplate,
  getSampleTemplateData,
  type EmailTemplate,
  type EmailTemplateVariable,
} from '@/lib/email-templates';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface EmailTemplateEditorProps {
  template?: EmailTemplate;
  onSave: (template: Partial<EmailTemplate>) => Promise<void>;
  onCancel?: () => void;
  onPreview?: () => void;
  onVersionHistory?: () => void;
  onTestSend?: () => void;
}

export default function EmailTemplateEditor({
  template,
  onSave,
  onCancel,
  onPreview,
  onVersionHistory,
  onTestSend,
}: EmailTemplateEditorProps) {
  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [htmlBody, setHtmlBody] = useState(template?.html_body || '');
  const [textBody, setTextBody] = useState(template?.text_body || '');
  const [previewText, setPreviewText] = useState(template?.preview_text || '');
  const [description, setDescription] = useState(template?.description || '');
  const [showPreview, setShowPreview] = useState(false);
  const [showVariables, setShowVariables] = useState(true);
  const [availableVariables, setAvailableVariables] = useState<
    EmailTemplateVariable[]
  >([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    loadVariables();
  }, []);

  const loadVariables = async () => {
    const vars = await getTemplateVariables();
    setAvailableVariables(vars);
  };

  const insertVariable = (variableName: string) => {
    const variable = `{{${variableName}}}`;
    setHtmlBody((prev) => prev + variable);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Template name is required');
      return;
    }

    if (!subject.trim()) {
      Alert.alert('Error', 'Subject is required');
      return;
    }

    if (!htmlBody.trim()) {
      Alert.alert('Error', 'Email body is required');
      return;
    }

    setLoading(true);
    try {
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      const variables = extractVariablesFromTemplate(subject + ' ' + htmlBody);

      await onSave({
        name,
        slug,
        subject,
        html_body: htmlBody,
        text_body: textBody,
        preview_text: previewText,
        description,
        variables,
      });
    } finally {
      setLoading(false);
    }
  };

  const variablesByCategory = availableVariables.reduce(
    (acc, variable) => {
      if (!acc[variable.category]) {
        acc[variable.category] = [];
      }
      acc[variable.category].push(variable);
      return acc;
    },
    {} as Record<string, EmailTemplateVariable[]>
  );

  if (showPreview && template) {
    const previewTemplate: EmailTemplate = {
      ...template,
      name,
      subject,
      html_body: htmlBody,
      text_body: textBody,
      preview_text: previewText,
      description,
    };

    return (
      <View style={styles.container}>
        <View style={styles.previewHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowPreview(false)}
          >
            <Text style={styles.backButtonText}>← Back to Editor</Text>
          </TouchableOpacity>
        </View>
        <EmailTemplatePreview
          template={previewTemplate}
          customVariables={getSampleTemplateData()}
          showControls
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Template Details</Text>

            <Input
              label="Template Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g., Booking Confirmation"
              required
            />

            <Input
              label="Subject Line"
              value={subject}
              onChangeText={setSubject}
              placeholder="Use {{variables}} for dynamic content"
              required
            />

            <Input
              label="Preview Text"
              value={previewText}
              onChangeText={setPreviewText}
              placeholder="Short preview shown in email clients"
            />

            <Input
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Internal description of this template"
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>HTML Body</Text>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setShowVariables(!showVariables)}
              >
                {showVariables ? (
                  <ChevronUp size={20} color={colors.primary} />
                ) : (
                  <ChevronDown size={20} color={colors.primary} />
                )}
                <Text style={styles.toggleButtonText}>
                  {showVariables ? 'Hide' : 'Show'} Variables
                </Text>
              </TouchableOpacity>
            </View>

            {showVariables && (
              <View style={styles.variablesContainer}>
                {Object.entries(variablesByCategory).map(([category, vars]) => (
                  <View key={category} style={styles.variableCategory}>
                    <Text style={styles.variableCategoryTitle}>{category}</Text>
                    <View style={styles.variablesList}>
                      {vars.map((variable) => (
                        <TouchableOpacity
                          key={variable.id}
                          style={styles.variableChip}
                          onPress={() => insertVariable(variable.variable_name)}
                        >
                          <Plus size={12} color={colors.primary} />
                          <Text style={styles.variableChipText}>
                            {variable.display_name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            <TextArea
              value={htmlBody}
              onChangeText={setHtmlBody}
              placeholder="Enter HTML email template..."
              numberOfLines={15}
              required
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plain Text Body (Optional)</Text>
            <Text style={styles.sectionDescription}>
              Fallback for email clients that don't support HTML
            </Text>

            <TextArea
              value={textBody}
              onChangeText={setTextBody}
              placeholder="Enter plain text version..."
              numberOfLines={10}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerActions}>
          {onVersionHistory && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onVersionHistory}
            >
              <History size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          {onTestSend && (
            <TouchableOpacity style={styles.iconButton} onPress={onTestSend}>
              <Mail size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footerMain}>
          {onCancel && (
            <Button
              title="Cancel"
              onPress={onCancel}
              variant="outline"
              style={styles.footerButton}
            />
          )}

          <Button
            title="Preview"
            onPress={() => setShowPreview(true)}
            variant="outline"
            icon={<Eye size={16} color={colors.primary} />}
            style={styles.footerButton}
          />

          <Button
            title="Save Template"
            onPress={handleSave}
            loading={loading}
            icon={<Save size={16} color={colors.white} />}
            style={styles.footerButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  toggleButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  variablesContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  variableCategory: {
    gap: spacing.sm,
  },
  variableCategoryTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  variablesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  variableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  variableChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  previewHeader: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: spacing.sm,
  },
  backButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  footerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footerMain: {
    flexDirection: 'row',
    gap: spacing.sm,
    flex: 1,
    justifyContent: 'flex-end',
  },
  footerButton: {
    minWidth: 100,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
});
