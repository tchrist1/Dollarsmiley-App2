import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { safeGoBack } from '@/lib/navigation-utils';
import { useAuth } from '@/contexts/AuthContext';
import { Message } from '@/types/database';
import { ArrowLeft, Send, Paperclip, X, Check, CheckCheck, MoreVertical, Mic } from 'lucide-react-native';
import { MessageReactions } from '@/components/MessageReactions';
import VoiceRecorder from '@/components/VoiceRecorder';
import VoiceMessagePlayer from '@/components/VoiceMessagePlayer';
import FileAttachmentPicker from '@/components/FileAttachmentPicker';
import FileAttachmentDisplay from '@/components/FileAttachmentDisplay';
import { uploadVoiceMessage, sendVoiceMessage, normalizeWaveform } from '@/lib/voice-messages';
import {
  uploadFileAttachment,
  sendFileMessage,
  FileAttachment,
  UploadedAttachment,
} from '@/lib/file-attachments';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface ExtendedMessage extends Omit<Message, 'sender'> {
  sender?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  reactions?: any[];
  optimistic?: boolean;
  edited_at?: string | null;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [otherParticipant, setOtherParticipant] = useState<any>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id && profile) {
      initializeChat();
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        updateTypingStatus(false);
      }
    };
  }, [id, profile]);

  const initializeChat = async () => {
    await fetchConversationDetails();
    await fetchMessages();
    subscribeToMessages();
    subscribeToConversation();
    subscribeToMessageReactions();
    markMessagesAsRead();
    updateLastSeen();
  };

  const fetchConversationDetails = async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (data && profile) {
      setConversation(data);
      const otherParticipantId =
        data.participant_one_id === profile.id
          ? data.participant_two_id
          : data.participant_one_id;

      const { data: participant } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherParticipantId)
        .single();

      setOtherParticipant(participant);

      const isParticipantOne = data.participant_one_id === profile.id;
      const typing = isParticipantOne ? data.participant_two_typing : data.participant_one_typing;
      setOtherUserTyping(typing);
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
      `)
      .eq('conversation_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (data && !error) {
      const messagesWithReactions = await Promise.all(
        data.map(async (msg) => {
          const { data: reactions } = await supabase
            .from('message_reactions')
            .select('*')
            .eq('message_id', msg.id);

          return {
            ...msg,
            reactions: reactions || [],
          };
        })
      );

      setMessages(messagesWithReactions as any);
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;

          const { data: sender } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', newMessage.sender_id)
            .single();

          const messageWithSender = {
            ...newMessage,
            sender,
            reactions: [],
          };

          setMessages((prev) => {
            const filtered = prev.filter((m) => !m.optimistic);
            return [...filtered, messageWithSender as any];
          });

          if (newMessage.sender_id !== profile?.id) {
            markMessagesAsRead();
          }

          scrollToBottom();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        async (payload) => {
          const updatedMessage = payload.new as Message;

          const { data: sender } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', updatedMessage.sender_id)
            .single();

          const { data: reactions } = await supabase
            .from('message_reactions')
            .select('*')
            .eq('message_id', updatedMessage.id);

          setMessages((prev) =>
            prev.map((m) =>
              m.id === updatedMessage.id
                ? { ...updatedMessage, sender, reactions: reactions || [] }
                : m
            ) as any
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToConversation = () => {
    const channel = supabase
      .channel(`conversation-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const updatedConv = payload.new as any;
          setConversation(updatedConv);

          if (profile) {
            const isParticipantOne = updatedConv.participant_one_id === profile.id;
            const typing = isParticipantOne
              ? updatedConv.participant_two_typing
              : updatedConv.participant_one_typing;
            setOtherUserTyping(typing);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToMessageReactions = () => {
    const channel = supabase
      .channel(`reactions-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            const messageId = (payload.new as any)?.message_id || (payload.old as any)?.message_id;

            if (messageId) {
              const { data: reactions } = await supabase
                .from('message_reactions')
                .select('*')
                .eq('message_id', messageId);

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === messageId ? { ...m, reactions: reactions || [] } : m
                ) as any
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markMessagesAsRead = async () => {
    if (!profile) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', id)
      .eq('recipient_id', profile.id)
      .eq('is_read', false);
  };

  const updateLastSeen = async () => {
    if (!profile) return;

    try {
      await supabase.rpc('update_last_seen', {
        conversation_uuid: id as string,
        user_uuid: profile.id,
      });
    } catch (error) {
      console.log('Last seen update error:', error);
    }
  };

  const updateTypingStatus = async (typing: boolean) => {
    if (!profile) return;

    try {
      await supabase.rpc('update_typing_status', {
        conversation_uuid: id as string,
        user_uuid: profile.id,
        is_typing: typing,
      });
    } catch (error) {
      console.log('Typing status update error:', error);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);

    if (!isTyping && text.trim()) {
      setIsTyping(true);
      updateTypingStatus(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingStatus(false);
    }, 2000);
  };

  const handleVoiceRecordingComplete = async (
    audioUri: string,
    duration: number,
    waveform: number[]
  ) => {
    if (!profile || !otherParticipant) return;

    setShowVoiceRecorder(false);
    setSending(true);

    try {
      const { url, error: uploadError } = await uploadVoiceMessage(profile.id, audioUri);

      if (uploadError || !url) {
        Alert.alert('Error', 'Failed to upload voice message');
        setSending(false);
        return;
      }

      const normalizedWaveform = normalizeWaveform(waveform, 50);

      const { success, error: sendError } = await sendVoiceMessage(
        id as string,
        profile.id,
        otherParticipant.id,
        url,
        duration,
        normalizedWaveform
      );

      if (!success) {
        Alert.alert('Error', sendError || 'Failed to send voice message');
      }
    } catch (error) {
      console.error('Voice message error:', error);
      Alert.alert('Error', 'Failed to send voice message');
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && !attachmentUrl) return;
    if (!profile) {
      Alert.alert('Error', 'Please log in to send messages');
      return;
    }
    if (!otherParticipant) {
      Alert.alert('Error', 'Unable to identify recipient. Please try again.');
      return;
    }

    const messageText = inputText.trim();
    const tempId = `temp-${Date.now()}`;

    const optimisticMessage: ExtendedMessage = {
      id: tempId,
      conversation_id: id as string,
      sender_id: profile.id,
      recipient_id: otherParticipant.id,
      content: messageText || '(sent an attachment)',
      attachments: attachmentUrl ? JSON.stringify([{ url: attachmentUrl, type: 'image' }]) : '[]',
      is_read: false,
      created_at: new Date().toISOString(),
      sender: {
        id: profile.id,
        full_name: profile.full_name || 'You',
        avatar_url: profile.avatar_url,
      },
      reactions: [],
      optimistic: true,
      edited_at: null,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');
    setAttachmentUrl('');
    scrollToBottom();

    if (isTyping) {
      setIsTyping(false);
      updateTypingStatus(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }

    setSending(true);

    const attachments = attachmentUrl ? [{ url: attachmentUrl, type: 'image' }] : [];

    const { error } = await supabase.from('messages').insert({
      conversation_id: id as string,
      sender_id: profile.id,
      recipient_id: otherParticipant.id,
      content: messageText || '(sent an attachment)',
      attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
    });

    if (error) {
      console.error('Message send error:', error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }

    setSending(false);
  };

  const handleAttachment = () => {
    setShowFilePicker(true);
  };

  const handleFileSelected = async (file: FileAttachment) => {
    if (!profile || !otherParticipant) return;

    setUploadingFile(true);
    setShowFilePicker(false);

    try {
      const { url, error: uploadError } = await uploadFileAttachment(profile.id, file);

      if (uploadError || !url) {
        Alert.alert('Error', 'Failed to upload file');
        setUploadingFile(false);
        return;
      }

      const uploadedAttachment: UploadedAttachment = {
        url,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        type: file.type,
      };

      const messageText = inputText.trim();
      const { success, error: sendError } = await sendFileMessage(
        id as string,
        profile.id,
        otherParticipant.id,
        uploadedAttachment,
        messageText || undefined
      );

      if (!success) {
        Alert.alert('Error', sendError || 'Failed to send file');
      } else {
        setInputText('');
      }
    } catch (error) {
      console.error('File upload error:', error);
      Alert.alert('Error', 'Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const isOnline = (lastSeen: string) => {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    return diffMinutes < 5;
  };

  const formatLastSeen = (lastSeen: string) => {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);

    if (diffMinutes < 5) return 'Active now';
    if (diffMinutes < 60) return `Active ${Math.floor(diffMinutes)}m ago`;
    if (diffMinutes < 1440) return `Active ${Math.floor(diffMinutes / 60)}h ago`;
    return 'Offline';
  };

  const renderMessage = ({ item, index }: { item: ExtendedMessage; index: number }) => {
    const isOwnMessage = item.sender_id === profile?.id;
    const attachments = item.attachments ? JSON.parse(item.attachments as any) : [];
    const showAvatar = index === messages.length - 1 || messages[index + 1]?.sender_id !== item.sender_id;
    const showDeliveryStatus = isOwnMessage && index === messages.length - 1;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {!isOwnMessage && (
          <View style={styles.senderAvatar}>
            {showAvatar ? (
              <Text style={styles.senderAvatarText}>
                {item.sender?.full_name.charAt(0).toUpperCase() || '?'}
              </Text>
            ) : null}
          </View>
        )}

        <View style={styles.messageWrapper}>
          <View
            style={[
              styles.messageBubble,
              isOwnMessage ? styles.ownMessage : styles.otherMessage,
              item.optimistic && styles.optimisticMessage,
            ]}
          >
            {item.message_type === 'voice' && item.voice_url ? (
              <VoiceMessagePlayer
                voiceUrl={item.voice_url}
                duration={item.voice_duration || 0}
                waveform={item.voice_waveform ? JSON.parse(item.voice_waveform as any) : []}
                isOwnMessage={isOwnMessage}
              />
            ) : item.message_type === 'image' || item.message_type === 'file' ? (
              <>
                {attachments.length > 0 && (
                  <View style={styles.attachmentContainer}>
                    {attachments.map((attachment: any, idx: number) => (
                      <FileAttachmentDisplay
                        key={idx}
                        attachment={attachment}
                        isOwnMessage={isOwnMessage}
                      />
                    ))}
                  </View>
                )}

                {item.content &&
                  item.content !== '(sent an attachment)' &&
                  item.content !== '🎤 Voice message' &&
                  !item.content.startsWith('📷 Image') &&
                  !item.content.startsWith('📎 ') && (
                    <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
                      {item.content}
                    </Text>
                  )}
              </>
            ) : (
              <>
                {attachments.length > 0 && (
                  <View style={styles.attachmentContainer}>
                    {attachments.map((attachment: any, idx: number) => (
                      <Image
                        key={idx}
                        source={{ uri: attachment.url }}
                        style={styles.attachmentImage}
                      />
                    ))}
                  </View>
                )}

                {item.content && item.content !== '(sent an attachment)' && item.content !== '🎤 Voice message' && (
                  <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
                    {item.content}
                  </Text>
                )}
              </>
            )}

            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTime]}>
                {new Date(item.created_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
                {item.edited_at && <Text> (edited)</Text>}
              </Text>

              {showDeliveryStatus && !item.optimistic && (
                <View style={styles.deliveryStatus}>
                  {item.is_read ? (
                    <CheckCheck size={14} color="rgba(255, 255, 255, 0.9)" />
                  ) : (
                    <Check size={14} color="rgba(255, 255, 255, 0.7)" />
                  )}
                </View>
              )}

              {item.optimistic && (
                <ActivityIndicator size="small" color={colors.white} style={styles.sendingIndicator} />
              )}
            </View>
          </View>

          {!item.optimistic && (
            <MessageReactions
              messageId={item.id}
              existingReactions={item.reactions || []}
              onReactionsUpdate={() => {}}
            />
          )}
        </View>

        {isOwnMessage && <View style={styles.senderAvatarPlaceholder} />}
      </View>
    );
  };

  const getOnlineStatus = () => {
    if (!conversation || !profile) return null;

    const isParticipantOne = conversation.participant_one_id === profile.id;
    const otherLastSeen = isParticipantOne
      ? conversation.participant_two_last_seen
      : conversation.participant_one_last_seen;

    return otherLastSeen;
  };

  const onlineStatus = getOnlineStatus();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={safeGoBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          {otherParticipant && (
            <>
              <View style={styles.headerAvatarContainer}>
                <View style={styles.headerAvatar}>
                  <Text style={styles.headerAvatarText}>
                    {otherParticipant.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                {onlineStatus && isOnline(onlineStatus) && (
                  <View style={styles.onlineDot} />
                )}
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerName}>{otherParticipant.full_name}</Text>
                {onlineStatus && (
                  <Text style={styles.headerStatus}>
                    {otherUserTyping ? 'Typing...' : formatLastSeen(onlineStatus)}
                  </Text>
                )}
              </View>
            </>
          )}
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => item.id || `msg-${index}`}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={scrollToBottom}
        showsVerticalScrollIndicator={false}
      />

      {attachmentUrl && (
        <View style={styles.attachmentPreview}>
          <Image source={{ uri: attachmentUrl }} style={styles.attachmentPreviewImage} />
          <TouchableOpacity
            style={styles.removeAttachment}
            onPress={() => setAttachmentUrl('')}
          >
            <X size={16} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {!showVoiceRecorder && (
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleAttachment}
            disabled={!otherParticipant}
          >
            <Paperclip size={24} color={otherParticipant ? colors.primary : colors.textLight} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder={otherParticipant ? "Type a message..." : "Loading conversation..."}
            placeholderTextColor={colors.textLight}
            value={inputText}
            onChangeText={handleTextChange}
            multiline
            maxLength={1000}
            editable={!!otherParticipant}
          />

          {inputText.trim() || attachmentUrl ? (
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() && !attachmentUrl || !otherParticipant) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={sending || (!inputText.trim() && !attachmentUrl) || !otherParticipant}
            >
              <Send size={20} color={colors.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.voiceButton}
              onPress={() => setShowVoiceRecorder(true)}
              disabled={!otherParticipant}
            >
              <Mic size={24} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {showVoiceRecorder && (
        <View style={[styles.voiceRecorderContainer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <VoiceRecorder
            onRecordingComplete={handleVoiceRecordingComplete}
            onCancel={() => setShowVoiceRecorder(false)}
            maxDuration={120}
          />
        </View>
      )}

      <FileAttachmentPicker
        visible={showFilePicker}
        onClose={() => setShowFilePicker(false)}
        onFileSelected={handleFileSelected}
      />

      {uploadingFile && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.uploadingText}>Uploading file...</Text>
        </View>
      )}
    </KeyboardAvoidingView>
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
    backgroundColor: colors.white,
    padding: spacing.md,
    paddingTop: spacing.xxl + spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatarContainer: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.white,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  headerStatus: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  messagesContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  senderAvatarText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  senderAvatarPlaceholder: {
    width: 32,
    marginLeft: spacing.xs,
  },
  messageWrapper: {
    maxWidth: '70%',
  },
  messageBubble: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  ownMessage: {
    backgroundColor: colors.primary,
  },
  otherMessage: {
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  optimisticMessage: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 20,
  },
  ownMessageText: {
    color: colors.white,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  messageTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  deliveryStatus: {
    marginLeft: spacing.xs,
  },
  sendingIndicator: {
    marginLeft: spacing.xs,
  },
  attachmentContainer: {
    marginBottom: spacing.xs,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  voiceRecorderContainer: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachButton: {
    padding: spacing.sm,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  attachmentPreview: {
    position: 'relative',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachmentPreviewImage: {
    width: 100,
    height: 80,
    borderRadius: borderRadius.md,
  },
  removeAttachment: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  uploadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
});
