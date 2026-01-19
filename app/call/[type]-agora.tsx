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
import AgoraService from '@/lib/agora-service';
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
  RefreshCw,
} from 'lucide-react-native';

export default function AgoraCallScreen() {
  const { type, otherPartyId, otherPartyName, bookingId } = useLocalSearchParams();
  const { user } = useAuth();
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(type === 'video');
  const [callId, setCallId] = useState<string | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<number[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const agoraEngine = useRef(AgoraService.getEngine());

  useEffect(() => {
    initializeCall();

    return () => {
      cleanup();
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

  async function initializeCall() {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Video calling is only available on mobile devices');
      router.back();
      return;
    }

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

      const config = await AgoraService.getCallToken(call.id, call.id);

      await AgoraService.initialize(config.appId, {
        onUserJoined: (connection, remoteUid) => {
          setRemoteUsers((prev) => [...prev, remoteUid]);
          if (callStatus === 'connecting') {
            setCallStatus('connected');
            updateCallStatus('Connected');
          }
        },
        onUserOffline: (connection, remoteUid) => {
          setRemoteUsers((prev) => prev.filter((uid) => uid !== remoteUid));
        },
        onJoinChannelSuccess: (connection, elapsed) => {
          console.log('Successfully joined channel');
        },
        onError: (err, msg) => {
          console.error('Agora Error:', err, msg);
          Alert.alert('Call Error', 'An error occurred during the call');
        },
      });

      await AgoraService.joinChannel(config);

      if (!isVideoOn) {
        await AgoraService.toggleCamera(false);
      }

      setTimeout(() => {
        if (callStatus === 'connecting') {
          setCallStatus('connected');
          updateCallStatus('Connected');
        }
      }, 5000);
    } catch (error: any) {
      console.error('Failed to initialize call:', error);
      Alert.alert('Error', error.message || 'Failed to initiate call');
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

  async function cleanup() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

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

    await AgoraService.leaveChannel();
  }

  async function endCall() {
    setCallStatus('ended');
    await cleanup();
    setTimeout(() => router.back(), 1000);
  }

  async function toggleMute() {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    await AgoraService.toggleMicrophone(newMutedState);
  }

  async function toggleSpeaker() {
    const newSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(newSpeakerState);
    await AgoraService.enableSpeakerphone(newSpeakerState);
  }

  async function toggleVideo() {
    const newVideoState = !isVideoOn;
    setIsVideoOn(newVideoState);
    await AgoraService.toggleCamera(newVideoState);
  }

  async function switchCamera() {
    await AgoraService.switchCamera();
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.webMessage}>
          Video calling is only available on mobile devices. Please use the iOS or Android app.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{otherPartyName}</Text>
        <Text style={styles.status}>
          {callStatus === 'connecting' && <Text>Connecting...</Text>}
          {callStatus === 'connected' && formatDuration(callDuration)}
          {callStatus === 'ended' && <Text>Call Ended</Text>}
        </Text>
        {remoteUsers.length > 0 && (
          <Text style={styles.participantsCount}>{remoteUsers.length} participant(s)</Text>
        )}
      </View>

      <View style={styles.videoContainer}>
        {type === 'video' ? (
          <Text style={styles.videoPlaceholder}>Video rendering requires native Agora components</Text>
        ) : (
          <View style={styles.voiceContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(otherPartyName as string).charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
        )}
      </View>

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
          <>
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

            <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
              <RefreshCw size={28} color={colors.white} />
            </TouchableOpacity>
          </>
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
  participantsCount: {
    fontSize: fontSize.sm,
    color: colors.white,
    opacity: 0.6,
    marginTop: spacing.xs,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  videoPlaceholder: {
    fontSize: fontSize.lg,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
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
  webMessage: {
    fontSize: fontSize.lg,
    color: colors.white,
    textAlign: 'center',
    padding: spacing.xl,
    marginTop: spacing.xxl,
  },
});
