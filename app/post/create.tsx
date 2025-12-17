import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Image as ImageIcon, Star, HelpCircle, Lightbulb, Award } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { createPost, PostLocation } from '@/lib/social';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import MediaUpload, { MediaFile } from '@/components/MediaUpload';
import MentionInput from '@/components/MentionInput';
import LocationPicker, { LocationData } from '@/components/LocationPicker';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

type PostType = 'update' | 'showcase' | 'question' | 'tip' | 'achievement';

interface MentionedUser {
  id: string;
  full_name: string;
  avatar_url?: string;
  user_type: string;
  is_verified: boolean;
}

export default function CreatePostScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('update');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [mentionedUsers, setMentionedUsers] = useState<MentionedUser[]>([]);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);

  const postTypes = [
    { type: 'update' as PostType, label: 'Update', icon: ImageIcon, color: colors.primary },
    { type: 'showcase' as PostType, label: 'Showcase', icon: Star, color: colors.warning },
    { type: 'question' as PostType, label: 'Question', icon: HelpCircle, color: colors.info },
    { type: 'tip' as PostType, label: 'Pro Tip', icon: Lightbulb, color: colors.secondary },
    { type: 'achievement' as PostType, label: 'Achievement', icon: Award, color: colors.success },
  ];

  const uploadMedia = async (file: MediaFile): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `posts/${profile?.id}/${fileName}`;

      const response = await fetch(file.uri);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, arrayBuffer, {
          contentType: file.type === 'video' ? 'video/mp4' : 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading media:', error);
      return null;
    }
  };

  const handleCreatePost = async () => {
    if (!content.trim() && mediaFiles.length === 0) {
      Alert.alert('Error', 'Please write something or add media to share');
      return;
    }

    setLoading(true);

    try {
      const mediaUrls: string[] = [];

      if (mediaFiles.length > 0) {
        for (const file of mediaFiles) {
          const url = await uploadMedia(file);
          if (url) {
            mediaUrls.push(url);
          }
        }
      }

      const mentionedUserIds = mentionedUsers.map((u) => u.id);

      const postLocation: PostLocation | undefined = location
        ? {
            name: location.name,
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address,
            city: location.city,
            country: location.country,
          }
        : undefined;

      const post = await createPost(
        content,
        postType,
        mediaUrls,
        undefined,
        mentionedUserIds,
        postLocation
      );

      setLoading(false);

      if (post) {
        Alert.alert('Success', 'Your post has been shared with the community!', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('Error', 'Failed to create post. Please try again.');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    }
  };

  const getPlaceholder = () => {
    switch (postType) {
      case 'showcase':
        return 'Share your work, completed project, or success story...';
      case 'question':
        return 'Ask the community for advice or help...';
      case 'tip':
        return 'Share a helpful tip or professional insight...';
      case 'achievement':
        return 'Celebrate a milestone or achievement...';
      default:
        return "What's on your mind?";
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Post Type</Text>
          <View style={styles.typeGrid}>
            {postTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = postType === type.type;

              return (
                <TouchableOpacity
                  key={type.type}
                  style={[
                    styles.typeCard,
                    isSelected && { borderColor: type.color, backgroundColor: `${type.color}10` },
                  ]}
                  onPress={() => setPostType(type.type)}
                  activeOpacity={0.7}
                >
                  <Icon size={24} color={isSelected ? type.color : colors.textSecondary} />
                  <Text
                    style={[
                      styles.typeLabel,
                      isSelected && { color: type.color, fontWeight: '600' },
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content</Text>
          <MentionInput
            value={content}
            onChangeText={setContent}
            onMentionsChange={setMentionedUsers}
            placeholder={getPlaceholder()}
            multiline
            numberOfLines={10}
            maxLength={1000}
            style={styles.textArea}
          />
          <Text style={styles.characterCount}>{content.length} / 1000</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Media (Optional)</Text>
          <MediaUpload
            maxFiles={10}
            allowImages={true}
            allowVideos={true}
            onMediaSelected={setMediaFiles}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location (Optional)</Text>
          <LocationPicker onLocationSelected={setLocation} selectedLocation={location} />
        </View>

        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>Tips for great posts:</Text>
          <Text style={styles.tipItem}>• Be clear and specific</Text>
          <Text style={styles.tipItem}>• Share valuable insights or experiences</Text>
          <Text style={styles.tipItem}>• Be respectful and professional</Text>
          <Text style={styles.tipItem}>• Use proper grammar and formatting</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.lg }]}>
        <Button
          title={loading ? 'Posting...' : 'Share Post'}
          onPress={handleCreatePost}
          loading={loading}
          disabled={!content.trim() || loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeCard: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  textArea: {
    minHeight: 200,
    fontSize: fontSize.md,
    color: colors.text,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  characterCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  tips: {
    padding: spacing.lg,
    backgroundColor: colors.infoLight,
    margin: spacing.lg,
    borderRadius: borderRadius.md,
  },
  tipsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.info,
    marginBottom: spacing.sm,
  },
  tipItem: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
