import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Upload, X, FileText, CheckCircle } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface UploadedDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

interface DocumentUploadProps {
  documentType: string;
  onUpload: (document: UploadedDocument) => void;
  onRemove: (documentId: string) => void;
  documents: UploadedDocument[];
  maxDocuments?: number;
}

export function DocumentUpload({
  documentType,
  onUpload,
  onRemove,
  documents,
  maxDocuments = 5,
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = () => {
    Alert.prompt(
      'Upload Document',
      'Enter document URL (In production, this would use a file picker and upload to Supabase Storage)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upload',
          onPress: async (url?: string) => {
            if (!url) return;

            setUploading(true);

            const fileName = url.split('/').pop() || 'document.pdf';
            const mockDocument: UploadedDocument = {
              id: Date.now().toString(),
              fileName,
              fileUrl: url,
              fileSize: Math.floor(Math.random() * 5000000),
              mimeType: url.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
            };

            await new Promise((resolve) => setTimeout(resolve, 1000));

            onUpload(mockDocument);
            setUploading(false);
          },
        },
      ],
      'plain-text',
      'https://example.com/document.pdf'
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const canUploadMore = documents.length < maxDocuments;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{documentType}</Text>
        <Text style={styles.subtitle}>
          {documents.length} / {maxDocuments} uploaded
        </Text>
      </View>

      {documents.map((doc) => (
        <View key={doc.id} style={styles.documentCard}>
          <View style={styles.documentIcon}>
            {doc.mimeType.startsWith('image/') ? (
              <Image source={{ uri: doc.fileUrl }} style={styles.thumbnailImage} />
            ) : (
              <FileText size={24} color={colors.primary} />
            )}
          </View>

          <View style={styles.documentInfo}>
            <Text style={styles.documentName} numberOfLines={1}>
              {doc.fileName}
            </Text>
            <Text style={styles.documentSize}>{formatFileSize(doc.fileSize)}</Text>
          </View>

          <View style={styles.documentStatus}>
            <CheckCircle size={20} color={colors.success} />
          </View>

          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemove(doc.id)}
          >
            <X size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      ))}

      {canUploadMore && (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleUpload}
          disabled={uploading}
          activeOpacity={0.7}
        >
          <Upload size={24} color={colors.primary} />
          <Text style={styles.uploadText}>
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Text>
          <Text style={styles.uploadSubtext}>PDF, JPG, PNG (Max 10MB)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  documentSize: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  documentStatus: {
    marginRight: spacing.sm,
  },
  removeButton: {
    padding: spacing.xs,
  },
  uploadButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  uploadSubtext: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
