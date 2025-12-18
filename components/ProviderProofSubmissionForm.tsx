import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import {
  Camera,
  Upload,
  X,
  Plus,
  FileText,
  Image as ImageIcon,
  Send,
} from 'lucide-react-native';

interface ProviderProofSubmissionFormProps {
  orderId: string;
  providerId: string;
  existingProofCount: number;
  onSubmitSuccess: () => void;
  onCancel: () => void;
}

export default function ProviderProofSubmissionForm({
  orderId,
  providerId,
  existingProofCount,
  onSubmitSuccess,
  onCancel,
}: ProviderProofSubmissionFormProps) {
  const [images, setImages] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10 - images.length,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(asset => asset.uri);
      setImages([...images, ...newImages].slice(0, 10));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera permissions to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setImages([...images, result.assets[0].uri].slice(0, 10));
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const fileName = `proof_${orderId}_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `production-proofs/${orderId}/${fileName}`;

      const { error } = await supabase.storage
        .from('production-proofs')
        .upload(filePath, uint8Array, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('production-proofs')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (images.length === 0) {
      Alert.alert('Images Required', 'Please upload at least one proof image.');
      return;
    }

    setSubmitting(true);

    try {
      setUploading(true);
      const uploadedUrls: string[] = [];

      for (const uri of images) {
        if (uri.startsWith('http')) {
          uploadedUrls.push(uri);
        } else {
          const uploadedUrl = await uploadImage(uri);
          if (uploadedUrl) {
            uploadedUrls.push(uploadedUrl);
          }
        }
      }

      setUploading(false);

      if (uploadedUrls.length === 0) {
        Alert.alert('Upload Failed', 'Failed to upload images. Please try again.');
        setSubmitting(false);
        return;
      }

      const nextVersion = existingProofCount + 1;

      const { error: proofError } = await supabase
        .from('production_proofs')
        .insert({
          production_order_id: orderId,
          version_number: nextVersion,
          proof_images: uploadedUrls,
          provider_notes: notes || null,
          status: 'pending',
        });

      if (proofError) throw proofError;

      await supabase
        .from('production_orders')
        .update({
          status: 'pending_approval',
          proofs_submitted_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      await supabase.from('production_timeline_events').insert({
        production_order_id: orderId,
        event_type: 'proof_submitted',
        description: `Proof version ${nextVersion} submitted for approval`,
        actor_id: providerId,
        metadata: {
          version: nextVersion,
          image_count: uploadedUrls.length,
        },
      });

      Alert.alert(
        'Success',
        'Your proof has been submitted for customer approval.',
        [{ text: 'OK', onPress: onSubmitSuccess }]
      );
    } catch (error: any) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to submit proof. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Proof Images</Text>
        <Text style={styles.sectionDescription}>
          Upload clear images of the completed work for customer approval.
          You can add up to 10 images.
        </Text>

        <View style={styles.imageGrid}>
          {images.map((uri, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeImage(index)}
              >
                <X size={16} color={colors.white} />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 10 && (
            <View style={styles.addImageButtons}>
              <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                <ImageIcon size={24} color={colors.primary} />
                <Text style={styles.addImageText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addImageButton} onPress={takePhoto}>
                <Camera size={24} color={colors.primary} />
                <Text style={styles.addImageText}>Camera</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {images.length > 0 && (
          <Text style={styles.imageCount}>{images.length}/10 images added</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes for Customer</Text>
        <Text style={styles.sectionDescription}>
          Add any notes or explanations about the proof (optional)
        </Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="E.g., colors may vary slightly in person, print-ready files attached..."
          placeholderTextColor={colors.textLight}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.infoCard}>
        <FileText size={20} color={colors.info} />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>What happens next?</Text>
          <Text style={styles.infoText}>
            The customer will review your proof and can approve it, request revisions,
            or reject it. You'll be notified of their decision.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (images.length === 0 || submitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={images.length === 0 || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Send size={18} color={colors.white} />
              <Text style={styles.submitButtonText}>
                {uploading ? 'Uploading...' : 'Submit Proof'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  addImageText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  imageCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  notesInput: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.infoLight,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.info,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.info,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  submitButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  bottomPadding: {
    height: spacing.xxxl,
  },
});
