import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react-native';

export default function CallScreen() {
  const { type, otherPartyId, otherPartyName, bookingId } = useLocalSearchParams();
  const { user } = useAuth();
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(type === 'video');
  const [callId, setCallId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initiateCall();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callStatus]);

  async function initiateCall() {
    try {
      const { data: call, error } = await supabase
        .from('call_logs')
        .insert({
          booking_id: bookingId as string,
          caller_id: user?.id,
          receiver_id: otherPartyId as string,
          call_type: type === 'video' ? 'Video' : 'Voice',
          status: 'Connecting',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setCallId(call.id);

      setTimeout(() => {
        setCallStatus('connected');
        updateCallStatus('Connected');
      }, 2000);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to initiate call');
      router.back();
    }
  }

  async function updateCallStatus(status: string) {
    if (!callId) return;

    await supabase
      .from('call_logs')
      .update({ status })
      .eq('id', callId);
  }

  async function endCall() {
    if (callId) {
      await supabase
        .from('call_logs')
        .update({
          status: 'Completed',
          ended_at: new Date().toISOString(),
          duration_seconds: callDuration,
        })
        .eq('id', callId);
    }

    setCallStatus('ended');
    setTimeout(() => router.back(), 1000);
  }

  function toggleMute() {
    setIsMuted(!isMuted);
  }

  function toggleSpeaker() {
    setIsSpeakerOn(!isSpeakerOn);
  }

  function toggleVideo() {
    setIsVideoOn(!isVideoOn);
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{otherPartyName}</Text>
        <Text style={styles.status}>
          {callStatus === 'connecting' && 'Connecting...'}
          {callStatus === 'connected' && formatDuration(callDuration)}
          {callStatus === 'ended' && 'Call Ended'}
        </Text>
      </View>

      {type === 'video' && (
        <View style={styles.videoContainer}>
          <View style={styles.remoteVideo}>
            <Text style={styles.videoPlaceholder}>Video Feed</Text>
            <Text style={styles.videoNote}>
              {Platform.OS === 'web'
                ? 'Video calling is available on mobile apps'
                : 'Camera feed will appear here'}
            </Text>
          </View>
          {isVideoOn && (
            <View style={styles.localVideo}>
              <Text style={styles.localVideoLabel}>You</Text>
            </View>
          )}
        </View>
      )}

      {type === 'voice' && (
        <View style={styles.voiceContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(otherPartyName as string).charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={toggleMute}
        >
          {isMuted ? (
            <MicOff size={28} color={colors.white} />
          ) : (
            <Mic size={28} color={colors.white} />
          )}
        </TouchableOpacity>

        {type === 'video' && (
          <TouchableOpacity
            style={[styles.controlButton, !isVideoOn && styles.controlButtonActive]}
            onPress={toggleVideo}
          >
            {isVideoOn ? (
              <Video size={28} color={colors.white} />
            ) : (
              <VideoOff size={28} color={colors.white} />
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
          onPress={toggleSpeaker}
        >
          {isSpeakerOn ? (
            <Volume2 size={28} color={colors.white} />
          ) : (
            <VolumeX size={28} color={colors.white} />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
          <PhoneOff size={32} color={colors.white} />
        </TouchableOpacity>
      </View>

      {Platform.OS === 'web' && (
        <View style={styles.demoNote}>
          <Text style={styles.demoNoteText}>
            Note: This is a demo interface. Full voice/video calling requires native mobile app with
            WebRTC integration or Twilio SDK.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  header: {
    paddingTop: spacing.xxl + spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  name: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  status: {
    fontSize: fontSize.lg,
    color: colors.white,
    opacity: 0.8,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    fontSize: fontSize.xl,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  videoNote: {
    fontSize: fontSize.sm,
    color: colors.white,
    opacity: 0.6,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  localVideo: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
    width: 120,
    height: 160,
    backgroundColor: '#2a2a2a',
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localVideoLabel: {
    fontSize: fontSize.sm,
    color: colors.white,
  },
  voiceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: colors.error,
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoNote: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.5)',
  },
  demoNoteText: {
    fontSize: fontSize.sm,
    color: colors.white,
    textAlign: 'center',
  },
});
