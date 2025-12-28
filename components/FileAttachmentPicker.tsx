import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image, File, X, Camera, FolderOpen } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export interface FileAttachment {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
  type: 'image' | 'file';
}

interface FileAttachmentPickerProps {
  visible: boolean;
  onClose: () => void;
  onFileSelected: (file: FileAttachment) => void;
}

export default function FileAttachmentPicker({
  visible,
  onClose,
  onFileSelected,
}: FileAttachmentPickerProps) {
  const [loading, setLoading] = useState(false);

  const requestPermissions = async (type: 'camera' | 'library') => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to take photos'
        );
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Photo library permission is required to select images'
        );
        return false;
      }
    }
    return true;
  };

  const pickImageFromCamera = async () => {
    try {
      const hasPermission = await requestPermissions('camera');
      if (!hasPermission) return;

      setLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileAttachment: FileAttachment = {
          uri: asset.uri,
          name: `photo_${Date.now()}.jpg`,
          size: asset.fileSize || 0,
          mimeType: 'image/jpeg',
          type: 'image',
        };
        onFileSelected(fileAttachment);
        onClose();
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setLoading(false);
    }
  };

  const pickImageFromLibrary = async () => {
    try {
      const hasPermission = await requestPermissions('library');
      if (!hasPermission) return;

      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `image_${Date.now()}.jpg`;
        const fileAttachment: FileAttachment = {
          uri: asset.uri,
          name: fileName,
          size: asset.fileSize || 0,
          mimeType: asset.mimeType || 'image/jpeg',
          type: 'image',
        };
        onFileSelected(fileAttachment);
        onClose();
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = () => {
    Alert.alert(
      'Document Upload',
      'Document upload requires expo-document-picker package. For now, you can share document URLs directly in the chat.',
      [{ text: 'OK' }]
    );
  };

  const options = [
    {
      icon: <Camera size={28} color={colors.primary} />,
      title: 'Take Photo',
      subtitle: 'Use camera to take a photo',
      onPress: pickImageFromCamera,
      available: Platform.OS !== 'web',
    },
    {
      icon: <Image size={28} color={colors.primary} />,
      title: 'Photo Library',
      subtitle: 'Choose from your photos',
      onPress: pickImageFromLibrary,
      available: true,
    },
    {
      icon: <FolderOpen size={28} color={colors.primary} />,
      title: 'Documents',
      subtitle: 'PDF, DOCX, XLSX, etc.',
      onPress: pickDocument,
      available: false, // Disabled until expo-document-picker is added
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Attach File</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsContainer}>
            {options
              .filter((opt) => opt.available)
              .map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.option}
                  onPress={option.onPress}
                  disabled={loading}
                >
                  <View style={styles.optionIcon}>{option.icon}</View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
          </View>

          {Platform.OS === 'web' && (
            <View style={styles.webNote}>
              <Text style={styles.webNoteText}>
                Note: Camera is not available on web. Use photo library to upload images.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  optionsContainer: {
    padding: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  optionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  webNote: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.primaryLight + '20',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  webNoteText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
});
