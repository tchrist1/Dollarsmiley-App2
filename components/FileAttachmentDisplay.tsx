import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import {
  File,
  FileText,
  FileArchive,
  FileSpreadsheet,
  Download,
  X,
  ExternalLink,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export interface Attachment {
  url: string;
  name?: string;
  size?: number;
  mimeType?: string;
  type: 'image' | 'file';
}

interface FileAttachmentDisplayProps {
  attachment: Attachment;
  isOwnMessage?: boolean;
}

export default function FileAttachmentDisplay({
  attachment,
  isOwnMessage = false,
}: FileAttachmentDisplayProps) {
  const [imageModalVisible, setImageModalVisible] = useState(false);

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <File size={32} color={colors.primary} />;

    if (mimeType.includes('pdf')) {
      return <FileText size={32} color={colors.error} />;
    }
    if (mimeType.includes('zip') || mimeType.includes('rar')) {
      return <FileArchive size={32} color={colors.warning} />;
    }
    if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return <FileSpreadsheet size={32} color={colors.success} />;
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return <FileText size={32} color={colors.blue} />;
    }

    return <File size={32} color={colors.primary} />;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileExtension = (name?: string, mimeType?: string): string => {
    if (name) {
      const ext = name.split('.').pop();
      if (ext && ext.length <= 4) return ext.toUpperCase();
    }
    if (mimeType) {
      const ext = mimeType.split('/').pop();
      if (ext) return ext.toUpperCase();
    }
    return 'FILE';
  };

  const handleFilePress = async () => {
    if (attachment.type === 'image') {
      setImageModalVisible(true);
      return;
    }

    try {
      const supported = await Linking.canOpenURL(attachment.url);
      if (supported) {
        await Linking.openURL(attachment.url);
      } else {
        Alert.alert('Error', 'Unable to open this file');
      }
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert('Error', 'Failed to open file');
    }
  };

  const handleDownload = () => {
    Alert.alert(
      'Download',
      'File download will open in your browser',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open',
          onPress: () => Linking.openURL(attachment.url),
        },
      ]
    );
  };

  if (attachment.type === 'image') {
    return (
      <>
        <TouchableOpacity
          onPress={handleFilePress}
          style={styles.imageContainer}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: attachment.url }}
            style={styles.image}
            resizeMode="cover"
          />
          {attachment.name && (
            <View style={styles.imageOverlay}>
              <Text style={styles.imageName} numberOfLines={1}>
                {attachment.name}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Modal
          visible={imageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setImageModalVisible(false)}
        >
          <View style={styles.imageModalOverlay}>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setImageModalVisible(false)}
            >
              <X size={28} color={colors.white} />
            </TouchableOpacity>

            <Image
              source={{ uri: attachment.url }}
              style={styles.fullImage}
              resizeMode="contain"
            />

            <View style={styles.imageModalActions}>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={handleDownload}
              >
                <ExternalLink size={24} color={colors.white} />
                <Text style={styles.modalActionText}>Open in Browser</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.fileContainer,
        isOwnMessage && styles.fileContainerOwn,
      ]}
      onPress={handleFilePress}
      activeOpacity={0.7}
    >
      <View style={styles.fileIcon}>{getFileIcon(attachment.mimeType)}</View>

      <View style={styles.fileInfo}>
        <Text
          style={[styles.fileName, isOwnMessage && styles.fileNameOwn]}
          numberOfLines={1}
        >
          {attachment.name || 'File attachment'}
        </Text>
        <View style={styles.fileDetails}>
          <Text style={[styles.fileSize, isOwnMessage && styles.fileSizeOwn]}>
            {getFileExtension(attachment.name, attachment.mimeType)} •{' '}
            {formatFileSize(attachment.size)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.downloadButton}
        onPress={handleDownload}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Download
          size={20}
          color={isOwnMessage ? 'rgba(255, 255, 255, 0.8)' : colors.primary}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  imageContainer: {
    width: 240,
    height: 180,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  imageName: {
    fontSize: fontSize.xs,
    color: colors.white,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalButton: {
    position: 'absolute',
    top: spacing.xxl + spacing.lg,
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  imageModalActions: {
    position: 'absolute',
    bottom: spacing.xxl + spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.lg,
  },
  modalActionText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 280,
  },
  fileContainerOwn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  fileInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  fileName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  fileNameOwn: {
    color: colors.white,
  },
  fileDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileSize: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  fileSizeOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  downloadButton: {
    padding: spacing.xs,
  },
});
