import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { MessageCircle, Heart, MoreVertical, Send } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toggleCommentLike, getUserLikedComments } from '@/lib/comment-likes';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id?: string;
  content: string;
  depth: number;
  reply_count: number;
  likes_count: number;
  created_at: string;
  is_liked?: boolean;
  author: {
    id: string;
    full_name: string;
    avatar_url?: string;
    user_type: string;
    is_verified: boolean;
  };
}

interface NestedCommentThreadProps {
  postId: string;
  maxDepth?: number;
}

const MAX_NESTING_DEPTH = 5;
const INDENT_SIZE = 16;

export default function NestedCommentThread({
  postId,
  maxDepth = MAX_NESTING_DEPTH,
}: NestedCommentThreadProps) {
  const { profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [likingComments, setLikingComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(
          `
          *,
          author:profiles!post_comments_author_id_fkey(
            id,
            full_name,
            avatar_url,
            user_type,
            is_verified
          )
        `
        )
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setComments(data || []);

      if (profile?.id) {
        const liked = await getUserLikedComments(postId, profile.id);
        setLikedComments(liked);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const loadReplies = async (commentId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_comment_replies', {
        comment_id: commentId,
        result_limit: 20,
        result_offset: 0,
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error loading replies:', error);
      return [];
    }
  };

  const submitReply = async (parentId: string | null) => {
    if (!replyContent.trim()) return;

    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          parent_comment_id: parentId,
          content: replyContent.trim(),
        })
        .select(
          `
          *,
          author:profiles!post_comments_author_id_fkey(
            id,
            full_name,
            avatar_url,
            user_type,
            is_verified
          )
        `
        )
        .single();

      if (error) throw error;

      if (parentId) {
        await updateCommentWithReply(parentId, data);
      } else {
        setComments([...comments, data]);
      }

      setReplyContent('');
      setReplyingTo(null);
    } catch (error: any) {
      console.error('Error submitting reply:', error);
      Alert.alert('Error', error.message || 'Failed to submit reply');
    } finally {
      setSubmitting(false);
    }
  };

  const updateCommentWithReply = async (parentId: string, newReply: Comment) => {
    const updateCommentsRecursively = (commentsList: Comment[]): Comment[] => {
      return commentsList.map((comment) => {
        if (comment.id === parentId) {
          return {
            ...comment,
            reply_count: comment.reply_count + 1,
          };
        }
        return comment;
      });
    };

    setComments(updateCommentsRecursively(comments));

    if (expandedComments.has(parentId)) {
      const replies = await loadReplies(parentId);
      setExpandedComments(new Set(expandedComments).add(parentId));
    }
  };

  const toggleReplies = async (commentId: string) => {
    const newExpanded = new Set(expandedComments);

    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }

    setExpandedComments(newExpanded);
  };

  const handleLikeComment = async (commentId: string) => {
    if (likingComments.has(commentId)) return;

    setLikingComments(new Set(likingComments).add(commentId));

    const wasLiked = likedComments.has(commentId);
    const newLikedComments = new Set(likedComments);

    if (wasLiked) {
      newLikedComments.delete(commentId);
    } else {
      newLikedComments.add(commentId);
    }
    setLikedComments(newLikedComments);

    const updateCommentInList = (commentsList: Comment[]): Comment[] => {
      return commentsList.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            likes_count: wasLiked ? comment.likes_count - 1 : comment.likes_count + 1,
            is_liked: !wasLiked,
          };
        }
        return comment;
      });
    };
    setComments(updateCommentInList(comments));

    try {
      await toggleCommentLike(commentId);
    } catch (error) {
      console.error('Error toggling like:', error);

      const revertLikedComments = new Set(likedComments);
      if (wasLiked) {
        revertLikedComments.add(commentId);
      } else {
        revertLikedComments.delete(commentId);
      }
      setLikedComments(revertLikedComments);

      setComments(
        updateCommentInList(comments).map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              likes_count: wasLiked ? comment.likes_count + 1 : comment.likes_count - 1,
              is_liked: wasLiked,
            };
          }
          return comment;
        })
      );

      Alert.alert('Error', 'Failed to like comment');
    } finally {
      const newLikingComments = new Set(likingComments);
      newLikingComments.delete(commentId);
      setLikingComments(newLikingComments);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const renderReplyInput = (parentId: string | null) => {
    if (replyingTo !== parentId) return null;

    return (
      <View style={styles.replyInputContainer}>
        <TextInput
          style={styles.replyInput}
          value={replyContent}
          onChangeText={setReplyContent}
          placeholder="Write a reply..."
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={500}
          autoFocus
        />
        <View style={styles.replyActions}>
          <TouchableOpacity
            onPress={() => {
              setReplyingTo(null);
              setReplyContent('');
            }}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => submitReply(parentId)}
            style={[styles.sendButton, !replyContent.trim() && styles.sendButtonDisabled]}
            disabled={!replyContent.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Send size={16} color={colors.white} />
                <Text style={styles.sendButtonText}>Reply</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderComment = (comment: Comment, depth: number = 0) => {
    const isExpanded = expandedComments.has(comment.id);
    const canReply = depth < maxDepth;
    const indentLeft = depth * INDENT_SIZE;

    return (
      <View key={comment.id} style={[styles.commentContainer, { marginLeft: indentLeft }]}>
        {depth > 0 && <View style={styles.threadLine} />}

        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{comment.author.full_name}</Text>
              <Text style={styles.commentTime}>{formatTimeAgo(comment.created_at)}</Text>
            </View>
            <TouchableOpacity style={styles.moreButton}>
              <MoreVertical size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.commentText}>{comment.content}</Text>

          <View style={styles.commentActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleLikeComment(comment.id)}
              disabled={likingComments.has(comment.id)}
            >
              <Heart
                size={16}
                color={likedComments.has(comment.id) ? colors.error : colors.textSecondary}
                fill={likedComments.has(comment.id) ? colors.error : 'transparent'}
              />
              {comment.likes_count > 0 && (
                <Text
                  style={[
                    styles.actionText,
                    likedComments.has(comment.id) && styles.likedText,
                  ]}
                >
                  {comment.likes_count}
                </Text>
              )}
            </TouchableOpacity>

            {canReply && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setReplyingTo(comment.id);
                  setReplyContent('');
                }}
              >
                <MessageCircle size={16} color={colors.textSecondary} />
                <Text style={styles.actionText}>Reply</Text>
              </TouchableOpacity>
            )}

            {comment.reply_count > 0 && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => toggleReplies(comment.id)}
              >
                <Text style={styles.viewRepliesText}>
                  {isExpanded ? 'Hide' : 'View'} {comment.reply_count}{' '}
                  {comment.reply_count === 1 ? 'reply' : 'replies'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {renderReplyInput(comment.id)}
        </View>

        {isExpanded && (
          <RepliesList
            commentId={comment.id}
            depth={depth + 1}
            maxDepth={maxDepth}
            expandedComments={expandedComments}
            setExpandedComments={setExpandedComments}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            replyContent={replyContent}
            setReplyContent={setReplyContent}
            submitReply={submitReply}
            submitting={submitting}
            renderReplyInput={renderReplyInput}
            formatTimeAgo={formatTimeAgo}
            likedComments={likedComments}
            likingComments={likingComments}
            handleLikeComment={handleLikeComment}
          />
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Comments ({comments.length})</Text>
      </View>

      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderComment(item, 0)}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MessageCircle size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No comments yet</Text>
            <Text style={styles.emptySubtext}>Be the first to comment!</Text>
          </View>
        }
      />

      {renderReplyInput(null)}
    </View>
  );
}

interface RepliesListProps {
  commentId: string;
  depth: number;
  maxDepth: number;
  expandedComments: Set<string>;
  setExpandedComments: (comments: Set<string>) => void;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  replyContent: string;
  setReplyContent: (content: string) => void;
  submitReply: (parentId: string | null) => Promise<void>;
  submitting: boolean;
  renderReplyInput: (parentId: string | null) => React.ReactNode;
  formatTimeAgo: (date: string) => string;
  likedComments: Set<string>;
  likingComments: Set<string>;
  handleLikeComment: (commentId: string) => Promise<void>;
}

function RepliesList({
  commentId,
  depth,
  maxDepth,
  expandedComments,
  setExpandedComments,
  replyingTo,
  setReplyingTo,
  replyContent,
  setReplyContent,
  submitReply,
  submitting,
  renderReplyInput,
  formatTimeAgo,
  likedComments,
  likingComments,
  handleLikeComment,
}: RepliesListProps) {
  const [replies, setReplies] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReplies();
  }, [commentId]);

  const loadReplies = async () => {
    try {
      const { data, error } = await supabase.rpc('get_comment_replies', {
        comment_id: commentId,
        result_limit: 20,
        result_offset: 0,
      });

      if (error) throw error;
      setReplies(data || []);
    } catch (error) {
      console.error('Error loading replies:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleReplies = async (replyId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(replyId)) {
      newExpanded.delete(replyId);
    } else {
      newExpanded.add(replyId);
    }
    setExpandedComments(newExpanded);
  };

  const renderReply = (reply: Comment) => {
    const isExpanded = expandedComments.has(reply.id);
    const canReply = depth < maxDepth;
    const indentLeft = depth * INDENT_SIZE;

    return (
      <View key={reply.id} style={[styles.commentContainer, { marginLeft: indentLeft }]}>
        <View style={styles.threadLine} />

        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{reply.author.full_name}</Text>
              <Text style={styles.commentTime}>{formatTimeAgo(reply.created_at)}</Text>
            </View>
            <TouchableOpacity style={styles.moreButton}>
              <MoreVertical size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.commentText}>{reply.content}</Text>

          <View style={styles.commentActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleLikeComment(reply.id)}
              disabled={likingComments.has(reply.id)}
            >
              <Heart
                size={16}
                color={likedComments.has(reply.id) ? colors.error : colors.textSecondary}
                fill={likedComments.has(reply.id) ? colors.error : 'transparent'}
              />
              {reply.likes_count > 0 && (
                <Text
                  style={[
                    styles.actionText,
                    likedComments.has(reply.id) && styles.likedText,
                  ]}
                >
                  {reply.likes_count}
                </Text>
              )}
            </TouchableOpacity>

            {canReply && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setReplyingTo(reply.id);
                  setReplyContent('');
                }}
              >
                <MessageCircle size={16} color={colors.textSecondary} />
                <Text style={styles.actionText}>Reply</Text>
              </TouchableOpacity>
            )}

            {reply.reply_count > 0 && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => toggleReplies(reply.id)}
              >
                <Text style={styles.viewRepliesText}>
                  {isExpanded ? 'Hide' : 'View'} {reply.reply_count}{' '}
                  {reply.reply_count === 1 ? 'reply' : 'replies'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {renderReplyInput(reply.id)}
        </View>

        {isExpanded && (
          <RepliesList
            commentId={reply.id}
            depth={depth + 1}
            maxDepth={maxDepth}
            expandedComments={expandedComments}
            likedComments={likedComments}
            likingComments={likingComments}
            handleLikeComment={handleLikeComment}
            setExpandedComments={setExpandedComments}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            replyContent={replyContent}
            setReplyContent={setReplyContent}
            submitReply={submitReply}
            submitting={submitting}
            renderReplyInput={renderReplyInput}
            formatTimeAgo={formatTimeAgo}
          />
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.repliesLoadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return <>{replies.map(renderReply)}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  commentContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    position: 'relative',
  },
  threadLine: {
    position: 'absolute',
    left: spacing.lg - 2,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.border,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  authorName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  commentTime: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  moreButton: {
    padding: spacing.xs,
  },
  commentText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  actionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  likedText: {
    color: colors.error,
    fontWeight: fontWeight.semibold,
  },
  viewRepliesText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  replyInputContainer: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  replyInput: {
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 60,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cancelButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  repliesLoadingContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
