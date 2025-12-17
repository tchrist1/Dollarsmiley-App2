import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface ReviewHelpfulVotesProps {
  reviewId: string;
  helpfulCount: number;
  notHelpfulCount: number;
  totalVotes: number;
  helpfulnessScore: number;
  userVote?: {
    has_voted: boolean;
    is_helpful?: boolean;
  };
  onVote?: (isHelpful: boolean) => Promise<void>;
  disabled?: boolean;
  compact?: boolean;
  showPercentage?: boolean;
}

export function ReviewHelpfulVotes({
  reviewId,
  helpfulCount,
  notHelpfulCount,
  totalVotes,
  helpfulnessScore,
  userVote,
  onVote,
  disabled = false,
  compact = false,
  showPercentage = true,
}: ReviewHelpfulVotesProps) {
  const [voting, setVoting] = useState(false);
  const [localHelpfulCount, setLocalHelpfulCount] = useState(helpfulCount);
  const [localNotHelpfulCount, setLocalNotHelpfulCount] = useState(notHelpfulCount);
  const [localTotalVotes, setLocalTotalVotes] = useState(totalVotes);
  const [localUserVote, setLocalUserVote] = useState(userVote);

  useEffect(() => {
    setLocalHelpfulCount(helpfulCount);
    setLocalNotHelpfulCount(notHelpfulCount);
    setLocalTotalVotes(totalVotes);
    setLocalUserVote(userVote);
  }, [helpfulCount, notHelpfulCount, totalVotes, userVote]);

  const handleVote = async (isHelpful: boolean) => {
    if (disabled || voting || !onVote) return;

    setVoting(true);

    try {
      // Optimistic update
      const wasHelpful = localUserVote?.is_helpful;
      const hadVoted = localUserVote?.has_voted;

      if (hadVoted) {
        if (wasHelpful === isHelpful) {
          // Remove vote
          setLocalUserVote({ has_voted: false, is_helpful: undefined });
          if (isHelpful) {
            setLocalHelpfulCount((prev) => Math.max(0, prev - 1));
          } else {
            setLocalNotHelpfulCount((prev) => Math.max(0, prev - 1));
          }
          setLocalTotalVotes((prev) => Math.max(0, prev - 1));
        } else {
          // Change vote
          setLocalUserVote({ has_voted: true, is_helpful: isHelpful });
          if (isHelpful) {
            setLocalHelpfulCount((prev) => prev + 1);
            setLocalNotHelpfulCount((prev) => Math.max(0, prev - 1));
          } else {
            setLocalHelpfulCount((prev) => Math.max(0, prev - 1));
            setLocalNotHelpfulCount((prev) => prev + 1);
          }
        }
      } else {
        // Add vote
        setLocalUserVote({ has_voted: true, is_helpful: isHelpful });
        if (isHelpful) {
          setLocalHelpfulCount((prev) => prev + 1);
        } else {
          setLocalNotHelpfulCount((prev) => prev + 1);
        }
        setLocalTotalVotes((prev) => prev + 1);
      }

      await onVote(isHelpful);
    } catch (error) {
      console.error('Error voting:', error);
      // Revert optimistic update
      setLocalHelpfulCount(helpfulCount);
      setLocalNotHelpfulCount(notHelpfulCount);
      setLocalTotalVotes(totalVotes);
      setLocalUserVote(userVote);
    } finally {
      setVoting(false);
    }
  };

  const percentage =
    localTotalVotes > 0 ? Math.round((localHelpfulCount / localTotalVotes) * 100) : 0;

  const getHelpfulnessLabel = (): string => {
    if (localTotalVotes < 3) return '';
    if (percentage >= 80) return 'Highly Helpful';
    if (percentage >= 60) return 'Helpful';
    if (percentage >= 40) return 'Mixed';
    return 'Not Helpful';
  };

  const getHelpfulnessColor = (): string => {
    if (localTotalVotes < 3) return colors.textSecondary;
    if (percentage >= 80) return colors.success;
    if (percentage >= 60) return colors.primary;
    if (percentage >= 40) return colors.warning;
    return colors.error;
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <TouchableOpacity
          style={[
            styles.compactButton,
            localUserVote?.has_voted && localUserVote.is_helpful && styles.compactButtonActive,
          ]}
          onPress={() => handleVote(true)}
          disabled={disabled || voting}
        >
          <ThumbsUp
            size={16}
            color={
              localUserVote?.has_voted && localUserVote.is_helpful
                ? colors.success
                : colors.textSecondary
            }
            fill={
              localUserVote?.has_voted && localUserVote.is_helpful
                ? colors.success
                : 'transparent'
            }
          />
          <Text
            style={[
              styles.compactCount,
              localUserVote?.has_voted && localUserVote.is_helpful && styles.compactCountActive,
            ]}
          >
            {localHelpfulCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.compactButton,
            localUserVote?.has_voted &&
              localUserVote.is_helpful === false &&
              styles.compactButtonActive,
          ]}
          onPress={() => handleVote(false)}
          disabled={disabled || voting}
        >
          <ThumbsDown
            size={16}
            color={
              localUserVote?.has_voted && localUserVote.is_helpful === false
                ? colors.error
                : colors.textSecondary
            }
            fill={
              localUserVote?.has_voted && localUserVote.is_helpful === false
                ? colors.error
                : 'transparent'
            }
          />
          <Text
            style={[
              styles.compactCount,
              localUserVote?.has_voted &&
                localUserVote.is_helpful === false &&
                styles.compactCountActive,
            ]}
          >
            {localNotHelpfulCount}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.question}>Was this review helpful?</Text>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[
            styles.button,
            localUserVote?.has_voted && localUserVote.is_helpful && styles.buttonActiveHelpful,
            disabled && styles.buttonDisabled,
          ]}
          onPress={() => handleVote(true)}
          disabled={disabled || voting}
        >
          {voting && localUserVote?.is_helpful ? (
            <ActivityIndicator size="small" color={colors.success} />
          ) : (
            <>
              <ThumbsUp
                size={20}
                color={
                  localUserVote?.has_voted && localUserVote.is_helpful
                    ? colors.white
                    : colors.textSecondary
                }
                fill={
                  localUserVote?.has_voted && localUserVote.is_helpful
                    ? colors.white
                    : 'transparent'
                }
              />
              <Text
                style={[
                  styles.buttonText,
                  localUserVote?.has_voted && localUserVote.is_helpful && styles.buttonTextActive,
                ]}
              >
                Yes ({localHelpfulCount})
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            localUserVote?.has_voted &&
              localUserVote.is_helpful === false &&
              styles.buttonActiveNotHelpful,
            disabled && styles.buttonDisabled,
          ]}
          onPress={() => handleVote(false)}
          disabled={disabled || voting}
        >
          {voting && localUserVote?.is_helpful === false ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <>
              <ThumbsDown
                size={20}
                color={
                  localUserVote?.has_voted && localUserVote.is_helpful === false
                    ? colors.white
                    : colors.textSecondary
                }
                fill={
                  localUserVote?.has_voted && localUserVote.is_helpful === false
                    ? colors.white
                    : 'transparent'
                }
              />
              <Text
                style={[
                  styles.buttonText,
                  localUserVote?.has_voted &&
                    localUserVote.is_helpful === false &&
                    styles.buttonTextActive,
                ]}
              >
                No ({localNotHelpfulCount})
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {showPercentage && localTotalVotes > 0 && (
        <View style={styles.stats}>
          <Text style={styles.statsText}>
            {localTotalVotes} {localTotalVotes === 1 ? 'person' : 'people'} found this{' '}
            {percentage >= 50 ? 'helpful' : 'not helpful'}
          </Text>
          {localTotalVotes >= 3 && (
            <View style={[styles.badge, { backgroundColor: getHelpfulnessColor() + '20' }]}>
              <Text style={[styles.badgeText, { color: getHelpfulnessColor() }]}>
                {getHelpfulnessLabel()}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  question: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  buttonActiveHelpful: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  buttonActiveNotHelpful: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  buttonTextActive: {
    color: colors.white,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  statsText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  compactButtonActive: {
    borderColor: colors.primary,
  },
  compactCount: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  compactCountActive: {
    color: colors.text,
  },
});
