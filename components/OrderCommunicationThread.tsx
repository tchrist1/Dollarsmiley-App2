import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Send, MessageCircle } from 'lucide-react-native';

interface Props {
  bookingId: string;
  otherPartyId: string;
  otherPartyName: string;
}

export default function OrderCommunicationThread({
  bookingId,
  otherPartyId,
  otherPartyName,
}: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMessages();
    subscribeToMessages();
  }, [bookingId]);

  async function loadMessages() {
    const { data, error } = await supabase
      .from('order_communications')
      .select('*, sender:profiles!order_communications_sender_id_fkey(id, full_name, avatar_url)')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  }

  function subscribeToMessages() {
    const channel = supabase
      .channel(`order_comm_${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_communications',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('order_communications').insert({
        booking_id: bookingId,
        sender_id: user.id,
        receiver_id: otherPartyId,
        communication_type: 'Text',
        message: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage('');
      await loadMessages();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MessageCircle size={20} color="#007AFF" />
        <Text style={styles.title}>Order Communication</Text>
      </View>

      <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No messages yet. Start a conversation about this order.
            </Text>
          </View>
        ) : (
          messages.map((message) => {
            const isMyMessage = message.sender_id === user?.id;
            return (
              <View
                key={message.id}
                style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.theirMessage]}
              >
                {!isMyMessage && (
                  <Text style={styles.senderName}>{message.sender?.full_name}</Text>
                )}
                <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
                  {message.message}
                </Text>
                <Text style={[styles.timestamp, isMyMessage && styles.myTimestamp]}>
                  {new Date(message.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || loading}
        >
          <Send size={20} color={newMessage.trim() ? '#FFF' : '#CCC'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginLeft: 8,
  },
  messagesContainer: {
    maxHeight: 300,
    marginBottom: 16,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFF',
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  myTimestamp: {
    color: '#FFF',
    opacity: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
});
