import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { CustomServicePayments } from '@/lib/custom-service-payments';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  CheckCircle,
  MessageCircle,
  Clock,
} from 'lucide-react-native';

interface ConsultationData {
  id: string;
  production_order_id: string;
  status: string;
  provider_id: string;
  customer_id: string;
  started_at?: string;
  production_order?: {
    title: string;
    customer?: { full_name: string };
    provider?: { full_name: string };
  };
}

export default function ConsultationCallScreen() {
  const { id } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const [consultation, setConsultation] = useState<ConsultationData | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<'loading' | 'connecting' | 'connected' | 'ended'>('loading');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [ending, setEnding] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchConsultation();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [id]);

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

  const fetchConsultation = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('custom_service_consultations')
      .select(`
        *,
        production_order:production_orders(
          title,
          customer:profiles!production_orders_customer_id_fkey(full_name),
          provider:profiles!production_orders_provider_id_fkey(full_name)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      Alert.alert('Error', 'Consultation not found');
      router.back();
      return;
    }

    setConsultation(data);

    if (data.status === 'pending') {
      await supabase
        .from('custom_service_consultations')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', id);
    }

    setCallStatus('connecting');
    setTimeout(() => {
      setCallStatus('connected');
    }, 2000);
  };

  const isProvider = profile?.id === consultation?.provider_id;
  const otherPartyName = isProvider
    ? consultation?.production_order?.customer?.full_name
    : consultation?.production_order?.provider?.full_name;

  const endCall = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setCallStatus('ended');
    setTimeout(() => router.back(), 1500);
  };

  const handleCompleteConsultation = async () => {
    if (!consultation) return;

    Alert.alert(
      'Complete Consultation',
      'Mark this consultation as completed? This will allow the order to proceed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            setEnding(true);
            const result = await CustomServicePayments.completeConsultation(consultation.id);

            if (result.success) {
              Alert.alert('Success', 'Consultation completed successfully', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } else {
              Alert.alert('Error', result.error || 'Failed to complete consultation');
              setEnding(false);
            }
          },
        },
      ]
    );
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (callStatus === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading consultation...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.consultationBadge}>
          <MessageCircle size={16} color={colors.primary} />
          <Text style={styles.consultationBadgeText}>Consultation</Text>
        </View>
        <Text style={styles.orderTitle} numberOfLines={1}>
          {consultation?.production_order?.title || 'Custom Order'}
        </Text>
        <Text style={styles.name}>{otherPartyName || 'Participant'}</Text>
        <View style={styles.statusRow}>
          <Clock size={16} color={colors.white} />
          <Text style={styles.status}>
            {callStatus === 'connecting' && 'Connecting...'}
            {callStatus === 'connected' && formatDuration(callDuration)}
            {callStatus === 'ended' && 'Call Ended'}
          </Text>
        </View>
      </View>

      <View style={styles.videoContainer}>
        <View style={styles.remoteVideo}>
          <Text style={styles.videoPlaceholder}>Video Consultation</Text>
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

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={() => setIsMuted(!isMuted)}
        >
          {isMuted ? (
            <MicOff size={28} color={colors.white} />
          ) : (
            <Mic size={28} color={colors.white} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !isVideoOn && styles.controlButtonActive]}
          onPress={() => setIsVideoOn(!isVideoOn)}
        >
          {isVideoOn ? (
            <Video size={28} color={colors.white} />
          ) : (
            <VideoOff size={28} color={colors.white} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
          onPress={() => setIsSpeakerOn(!isSpeakerOn)}
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

      {isProvider && callStatus === 'connected' && (
        <View style={styles.providerActions}>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleCompleteConsultation}
            disabled={ending}
          >
            {ending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <CheckCircle size={20} color={colors.white} />
                <Text style={styles.completeButtonText}>Complete Consultation</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {Platform.OS === 'web' && (
        <View style={styles.demoNote}>
          <Text style={styles.demoNoteText}>
            Demo interface. Full video calling requires native mobile app with WebRTC or Agora SDK integration.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.white,
  },
  header: {
    paddingTop: spacing.xxl + spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  consultationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '30',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  consultationBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  orderTitle: {
    fontSize: fontSize.md,
    color: colors.white,
    opacity: 0.7,
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xl,
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
  providerActions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  completeButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
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
