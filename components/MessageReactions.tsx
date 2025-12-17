import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface MessageReactionsProps {
  messageId: string;
  existingReactions: any[];
  onReactionsUpdate?: () => void;
}

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

export function MessageReactions({
  messageId,
  existingReactions,
  onReactionsUpdate,
}: MessageReactionsProps) {
  const { profile } = useAuth();
  const [showPicker, setShowPicker] = useState(false);
  const [reactions, setReactions] = useState<any[]>(existingReactions || []);

  useEffect(() => {
    setReactions(existingReactions || []);
  }, [existingReactions]);

  const handleAddReaction = async (emoji: string) => {
    if (!profile) return;

    const existingReaction = reactions.find(
      (r) => r.user_id === profile.id && r.reaction === emoji
    );

    if (existingReaction) {
      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', profile.id)
        .eq('reaction', emoji);
    } else {
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: profile.id,
        reaction: emoji,
      });
    }

    const { data: updatedReactions } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId);

    if (updatedReactions) {
      setReactions(updatedReactions);
      onReactionsUpdate?.();
    }

    setShowPicker(false);
  };

  const getReactionCounts = () => {
    const counts: { [key: string]: { count: number; userReacted: boolean } } = {};

    reactions.forEach((reaction) => {
      if (!counts[reaction.reaction]) {
        counts[reaction.reaction] = { count: 0, userReacted: false };
      }
      counts[reaction.reaction].count++;
      if (reaction.user_id === profile?.id) {
        counts[reaction.reaction].userReacted = true;
      }
    });

    return counts;
  };

  const reactionCounts = getReactionCounts();

  return (
    <>
      <View style={styles.reactionsContainer}>
        {Object.entries(reactionCounts).map(([emoji, data]) => (
          <TouchableOpacity
            key={emoji}
            style={[styles.reactionBubble, data.userReacted && styles.reactionBubbleActive]}
            onPress={() => handleAddReaction(emoji)}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            <Text
              style={[styles.reactionCount, data.userReacted && styles.reactionCountActive]}
            >
              {data.count}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addReactionButton} onPress={() => setShowPicker(true)}>
          <Text style={styles.addReactionText}>+</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>React to this message</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.emojiGrid}>
                {EMOJI_REACTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.emojiButton}
                    onPress={() => handleAddReaction(emoji)}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    gap: spacing.xs / 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionBubbleActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  reactionEmoji: {
    fontSize: fontSize.sm,
  },
  reactionCount: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  reactionCountActive: {
    color: colors.primary,
  },
  addReactionButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addReactionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    maxWidth: '90%',
    ...shadows.lg,
  },
  pickerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emojiGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  emojiButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  emojiText: {
    fontSize: 28,
  },
});
