import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';
import { decode as atob } from 'base-64';

export interface VoiceMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  message_type: 'voice';
  voice_url: string;
  voice_duration: number;
  voice_waveform: number[];
  is_read: boolean;
  created_at: string;
}

export async function uploadVoiceMessage(
  userId: string,
  audioUri: string
): Promise<{ url: string; error?: string }> {
  try {
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}.m4a`;

    const base64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: 'base64' as any,
    });

    const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const { data, error } = await supabase.storage
      .from('voice-messages')
      .upload(fileName, arrayBuffer.buffer, {
        contentType: 'audio/m4a',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return { url: '', error: error.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('voice-messages').getPublicUrl(data.path);

    return { url: publicUrl };
  } catch (error: any) {
    console.error('Voice message upload error:', error);
    return { url: '', error: error.message };
  }
}

export async function sendVoiceMessage(
  conversationId: string,
  senderId: string,
  recipientId: string,
  voiceUrl: string,
  duration: number,
  waveform: number[]
): Promise<{ success: boolean; error?: string; message?: any }> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        recipient_id: recipientId,
        content: '🎤 Voice message',
        message_type: 'voice',
        voice_url: voiceUrl,
        voice_duration: duration,
        voice_waveform: waveform,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Send voice message error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, message: data };
  } catch (error: any) {
    console.error('Send voice message error:', error);
    return { success: false, error: error.message };
  }
}

export async function getVoiceMessage(messageId: string): Promise<VoiceMessage | null> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .eq('message_type', 'voice')
      .single();

    if (error) {
      console.error('Get voice message error:', error);
      return null;
    }

    return data as VoiceMessage;
  } catch (error) {
    console.error('Get voice message error:', error);
    return null;
  }
}

export async function deleteVoiceMessage(messageId: string, userId: string): Promise<boolean> {
  try {
    const message = await getVoiceMessage(messageId);

    if (!message || message.sender_id !== userId) {
      return false;
    }

    if (message.voice_url) {
      const urlParts = message.voice_url.split('/voice-messages/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('voice-messages').remove([filePath]);
      }
    }

    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', userId);

    if (error) {
      console.error('Delete voice message error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete voice message error:', error);
    return false;
  }
}

export function normalizeWaveform(waveform: number[], targetLength: number = 50): number[] {
  if (waveform.length === 0) return Array(targetLength).fill(0.3);

  if (waveform.length <= targetLength) {
    return waveform;
  }

  const normalized: number[] = [];
  const chunkSize = waveform.length / targetLength;

  for (let i = 0; i < targetLength; i++) {
    const start = Math.floor(i * chunkSize);
    const end = Math.floor((i + 1) * chunkSize);
    const chunk = waveform.slice(start, end);
    const average = chunk.reduce((sum, val) => sum + val, 0) / chunk.length;
    normalized.push(average);
  }

  return normalized;
}

export function formatVoiceDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export async function getVoiceMessageStats(
  conversationId: string
): Promise<{
  totalVoiceMessages: number;
  totalDuration: number;
  averageDuration: number;
}> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('voice_duration')
      .eq('conversation_id', conversationId)
      .eq('message_type', 'voice')
      .is('deleted_at', null);

    if (error) {
      console.error('Get voice message stats error:', error);
      return { totalVoiceMessages: 0, totalDuration: 0, averageDuration: 0 };
    }

    const totalVoiceMessages = data.length;
    const totalDuration = data.reduce((sum, msg) => sum + (msg.voice_duration || 0), 0);
    const averageDuration = totalVoiceMessages > 0 ? totalDuration / totalVoiceMessages : 0;

    return {
      totalVoiceMessages,
      totalDuration,
      averageDuration,
    };
  } catch (error) {
    console.error('Get voice message stats error:', error);
    return { totalVoiceMessages: 0, totalDuration: 0, averageDuration: 0 };
  }
}

export async function preloadVoiceMessage(voiceUrl: string): Promise<boolean> {
  try {
    const response = await fetch(voiceUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Preload voice message error:', error);
    return false;
  }
}
