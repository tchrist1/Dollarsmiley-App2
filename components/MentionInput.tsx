import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import { CheckCircle, User } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface MentionedUser {
  id: string;
  full_name: string;
  avatar_url?: string;
  user_type: string;
  is_verified: boolean;
}

interface MentionInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onMentionsChange?: (mentions: MentionedUser[]) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  style?: any;
}

export default function MentionInput({
  value,
  onChangeText,
  onMentionsChange,
  placeholder = 'Write something...',
  multiline = true,
  numberOfLines = 5,
  maxLength = 1000,
  style,
}: MentionInputProps) {
  const { user } = useAuth();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState<MentionedUser[]>([]);
  const [currentMention, setCurrentMention] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  const searchUsers = async (query: string) => {
    if (!user || query.length < 1) {
      setSuggestions([]);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('search_users_for_mentions', {
        search_query: query,
        current_user_id: user.id,
        result_limit: 10,
      });

      if (!error && data) {
        setSuggestions(data);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }

    setLoading(false);
  };

  const detectMention = useCallback(
    (text: string, cursorPos: number) => {
      const textBeforeCursor = text.substring(0, cursorPos);
      const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

      if (lastAtSymbol === -1) {
        setShowSuggestions(false);
        setCurrentMention('');
        return;
      }

      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      const hasSpace = textAfterAt.includes(' ') || textAfterAt.includes('\n');

      if (hasSpace) {
        setShowSuggestions(false);
        setCurrentMention('');
        return;
      }

      setCurrentMention(textAfterAt);
      setShowSuggestions(true);

      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }

      searchTimeout.current = setTimeout(() => {
        searchUsers(textAfterAt);
      }, 300);
    },
    [user]
  );

  const handleTextChange = (text: string) => {
    onChangeText(text);
    detectMention(text, cursorPosition);
  };

  const handleSelectionChange = (event: any) => {
    const position = event.nativeEvent.selection.end;
    setCursorPosition(position);
    detectMention(value, position);
  };

  const insertMention = (mentionUser: MentionedUser) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    const beforeMention = textBeforeCursor.substring(0, lastAtSymbol);
    const mentionText = `@${mentionUser.full_name} `;
    const newText = beforeMention + mentionText + textAfterCursor;

    const newCursorPosition = (beforeMention + mentionText).length;

    onChangeText(newText);
    setCursorPosition(newCursorPosition);

    const updatedMentions = [...mentionedUsers];
    if (!updatedMentions.find((u) => u.id === mentionUser.id)) {
      updatedMentions.push(mentionUser);
      setMentionedUsers(updatedMentions);
      onMentionsChange?.(updatedMentions);
    }

    setShowSuggestions(false);
    setCurrentMention('');
    setSuggestions([]);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const renderSuggestion = ({ item }: { item: MentionedUser }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => insertMention(item)}
      activeOpacity={0.7}
    >
      <View style={styles.suggestionAvatar}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <User size={20} color={colors.textSecondary} />
          </View>
        )}
      </View>

      <View style={styles.suggestionInfo}>
        <View style={styles.suggestionNameRow}>
          <Text style={styles.suggestionName} numberOfLines={1}>
            {item.full_name}
          </Text>
          {item.is_verified && (
            <CheckCircle size={14} color={colors.primary} fill={colors.primary} />
          )}
        </View>
        <Text style={styles.suggestionType}>
          {item.user_type === 'provider' ? 'Service Provider' : 'Customer'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const extractMentionedNames = () => {
    const mentions: string[] = [];
    const regex = /@(\w+(?:\s+\w+)*)/g;
    let match;

    while ((match = regex.exec(value)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  };

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={[styles.input, style]}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={handleTextChange}
        onSelectionChange={handleSelectionChange}
        multiline={multiline}
        numberOfLines={numberOfLines}
        maxLength={maxLength}
        textAlignVertical="top"
      />

      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : suggestions.length > 0 ? (
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.id}
              renderItem={renderSuggestion}
              keyboardShouldPersistTaps="handled"
              style={styles.suggestionsList}
              showsVerticalScrollIndicator={false}
            />
          ) : currentMention.length > 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          ) : null}
        </View>
      )}

      {mentionedUsers.length > 0 && (
        <View style={styles.mentionedUsersContainer}>
          <Text style={styles.mentionedLabel}>Mentioned:</Text>
          <View style={styles.mentionedList}>
            {mentionedUsers.map((user, index) => (
              <View key={user.id} style={styles.mentionedTag}>
                <Text style={styles.mentionedTagText}>@{user.full_name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  input: {
    minHeight: 120,
    fontSize: fontSize.md,
    color: colors.text,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionsContainer: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  suggestionName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  suggestionType: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  mentionedUsersContainer: {
    marginTop: spacing.sm,
  },
  mentionedLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  mentionedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  mentionedTag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  mentionedTagText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
});
