import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { MessageCircle, Phone, Video, Clock } from 'lucide-react-native';
import { router } from 'expo-router';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface Props {
  bookingId: string;
  otherPartyId: string;
  otherPartyName: string;
  otherPartyPhone?: string;
  conversationId?: string;
}

export default function CommunicationPanel({
  bookingId,
  otherPartyId,
  otherPartyName,
  otherPartyPhone,
  conversationId,
}: Props) {
  const [showCallModal, setShowCallModal] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');

  function handleTextMessage() {
    if (conversationId) {
      router.push(`/chat/${conversationId}` as any);
    } else {
      router.push(`/chat/${bookingId}` as any);
    }
  }

  function handleVoiceCall() {
    setCallType('voice');
    setShowCallModal(true);
  }

  function handleVideoCall() {
    setCallType('video');
    setShowCallModal(true);
  }

  function initiateCall() {
    setShowCallModal(false);
    router.push({
      pathname: '/call/[type]',
      params: {
        type: callType,
        otherPartyId,
        otherPartyName,
        bookingId,
      },
    } as any);
  }

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.title}>Communication</Text>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.commButton} onPress={handleTextMessage}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
              <MessageCircle size={24} color={colors.primary} />
            </View>
            <Text style={styles.buttonLabel}>Message</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.commButton} onPress={handleVoiceCall}>
            <View style={[styles.iconCircle, { backgroundColor: colors.success + '20' }]}>
              <Phone size={24} color={colors.success} />
            </View>
            <Text style={styles.buttonLabel}>Voice Call</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.commButton} onPress={handleVideoCall}>
            <View style={[styles.iconCircle, { backgroundColor: colors.info + '20' }]}>
              <Video size={24} color={colors.info} />
            </View>
            <Text style={styles.buttonLabel}>Video Call</Text>
          </TouchableOpacity>
        </View>

        {otherPartyPhone && (
          <View style={styles.phoneInfo}>
            <Phone size={14} color={colors.textSecondary} />
            <Text style={styles.phoneText}>{otherPartyPhone}</Text>
          </View>
        )}
      </View>

      <Modal
        visible={showCallModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCallModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              {callType === 'voice' ? (
                <Phone size={48} color={colors.success} />
              ) : (
                <Video size={48} color={colors.info} />
              )}
            </View>

            <Text style={styles.modalTitle}>
              {callType === 'voice' ? 'Voice Call' : 'Video Call'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Start a {callType} call with {otherPartyName}?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCallModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.callButton]}
                onPress={initiateCall}
              >
                <Text style={styles.callButtonText}>Start Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  commButton: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    textAlign: 'center',
  },
  phoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  phoneText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  callButton: {
    backgroundColor: colors.primary,
  },
  callButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
