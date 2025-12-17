import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  Share as RNShare,
  Clipboard,
} from 'react-native';
import {
  Share2,
  Copy,
  MessageCircle,
  Mail,
  X,
  Check,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface ShareButtonProps {
  postId: string;
  postContent: string;
  authorName: string;
  sharesCount?: number;
  onShareComplete?: (newCount: number) => void;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
}

interface ShareOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  method: string;
  action: () => void;
}

export default function ShareButton({
  postId,
  postContent,
  authorName,
  sharesCount = 0,
  onShareComplete,
  size = 'medium',
  showCount = true,
}: ShareButtonProps) {
  const { profile } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;

  const getShareUrl = () => {
    return `https://app.example.com/post/${postId}`;
  };

  const getShareMessage = () => {
    const preview = postContent.length > 100
      ? postContent.substring(0, 100) + '...'
      : postContent;
    return `Check out this post by ${authorName}:\n\n"${preview}"\n\n${getShareUrl()}`;
  };

  const recordShare = async (method: string) => {
    try {
      const { data, error } = await supabase.rpc('record_post_share', {
        p_post_id: postId,
        p_share_method: method,
      });

      if (error) throw error;

      if (data?.shares_count && onShareComplete) {
        onShareComplete(data.shares_count);
      }

      return true;
    } catch (error) {
      console.error('Error recording share:', error);
      return false;
    }
  };

  const handleNativeShare = async () => {
    try {
      setSharing(true);

      const result = await RNShare.share({
        message: getShareMessage(),
        title: `Post by ${authorName}`,
        url: getShareUrl(),
      });

      if (result.action === RNShare.sharedAction) {
        const method = result.activityType || 'native_share';
        await recordShare(method);
        setModalVisible(false);
      }
    } catch (error: any) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share post');
    } finally {
      setSharing(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await Clipboard.setString(getShareUrl());
      setCopied(true);
      await recordShare('copy_link');

      setTimeout(() => {
        setCopied(false);
        setModalVisible(false);
      }, 1500);
    } catch (error) {
      console.error('Error copying link:', error);
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const handleSMS = async () => {
    try {
      if (Platform.OS === 'ios') {
        const smsUrl = `sms:&body=${encodeURIComponent(getShareMessage())}`;
        await RNShare.share({ message: getShareMessage() });
      } else {
        await RNShare.share({ message: getShareMessage() });
      }
      await recordShare('sms');
      setModalVisible(false);
    } catch (error) {
      console.error('Error sharing via SMS:', error);
    }
  };

  const handleEmail = async () => {
    try {
      await RNShare.share({
        message: getShareMessage(),
        title: `Post by ${authorName}`,
      });
      await recordShare('email');
      setModalVisible(false);
    } catch (error) {
      console.error('Error sharing via email:', error);
    }
  };

  const shareOptions: ShareOption[] = [
    {
      id: 'native',
      label: 'Share via...',
      icon: <Share2 size={24} color={colors.primary} />,
      method: 'native_share',
      action: handleNativeShare,
    },
    {
      id: 'copy',
      label: 'Copy Link',
      icon: copied ? (
        <Check size={24} color={colors.success} />
      ) : (
        <Copy size={24} color={colors.primary} />
      ),
      method: 'copy_link',
      action: handleCopyLink,
    },
    {
      id: 'sms',
      label: 'Message',
      icon: <MessageCircle size={24} color={colors.primary} />,
      method: 'sms',
      action: handleSMS,
    },
    {
      id: 'email',
      label: 'Email',
      icon: <Mail size={24} color={colors.primary} />,
      method: 'email',
      action: handleEmail,
    },
  ];

  return (
    <>
      <TouchableOpacity
        style={styles.shareButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Share2 size={iconSize} color={colors.textSecondary} />
        {showCount && sharesCount > 0 && (
          <Text style={styles.shareCount}>{sharesCount}</Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />

          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Post</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.postPreview}>
              <Text style={styles.authorName}>{authorName}</Text>
              <Text style={styles.postContent} numberOfLines={3}>
                {postContent}
              </Text>
            </View>

            <View style={styles.shareOptions}>
              {shareOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.shareOption}
                  onPress={option.action}
                  disabled={sharing || (option.id === 'copy' && copied)}
                >
                  <View style={styles.shareOptionIcon}>{option.icon}</View>
                  <Text
                    style={[
                      styles.shareOptionLabel,
                      (sharing || (option.id === 'copy' && copied)) &&
                        styles.shareOptionDisabled,
                    ]}
                  >
                    {option.id === 'copy' && copied ? 'Copied!' : option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {sharesCount > 0 && (
              <View style={styles.shareStats}>
                <Text style={styles.shareStatsText}>
                  Shared {sharesCount} {sharesCount === 1 ? 'time' : 'times'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  shareCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xxxl,
    ...Platform.select({
      ios: {
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  postPreview: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  authorName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  postContent: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  shareOptions: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  shareOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  shareOptionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  shareOptionDisabled: {
    opacity: 0.5,
  },
  shareStats: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  shareStatsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
