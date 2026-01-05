import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Mic, MicOff, X, Volume2, Search } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  requestAudioPermissions,
  parseVoiceQuery,
  searchByVoice,
  searchJobsByVoice,
  speakText,
  stopSpeaking,
  formatResultsForVoice,
  isVoiceSearchSupported,
  type VoiceSearchResult,
} from '@/lib/voice-search';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface VoiceSearchButtonProps {
  searchType?: 'providers' | 'jobs';
  onResults?: (results: any[], query: string) => void;
  onError?: (error: string) => void;
}

export default function VoiceSearchButton({
  searchType = 'providers',
  onResults,
  onError,
}: VoiceSearchButtonProps) {
  // Voice search only works on web browsers, not native mobile
  if (Platform.OS !== 'web' || !isVoiceSearchSupported()) {
    return null;
  }

  const { user } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<VoiceSearchResult | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isListening) {
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  const startListening = async () => {
    try {
      setError(null);

      // Check if voice search is supported
      if (!isVoiceSearchSupported()) {
        setError('Voice search is not supported on this device');
        onError?.('Voice search not supported');
        return;
      }

      // Request permissions
      const hasPermission = await requestAudioPermissions();
      if (!hasPermission) {
        setError('Microphone permission is required');
        onError?.('Permission denied');
        return;
      }

      setShowModal(true);
      setTranscript('');
      setParsedResult(null);
      setIsListening(true);

      // Initialize Web Speech API
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

      if (!SpeechRecognition) {
        setError('Speech recognition not available');
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('Voice recognition started');
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);

        if (event.results[current].isFinal) {
          handleTranscript(transcriptText);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError(`Error: ${event.error}`);
        setIsListening(false);
        onError?.(event.error);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      console.error('Error starting voice search:', err);
      setError(err.message);
      setIsListening(false);
      onError?.(err.message);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const handleTranscript = async (text: string) => {
    setIsProcessing(true);
    stopListening();

    try {
      // Parse the voice query
      const result = parseVoiceQuery(text);
      setParsedResult(result);

      // Search based on parsed query
      let results: any[] = [];
      if (searchType === 'providers') {
        results = await searchByVoice(result, user?.id);
      } else {
        results = await searchJobsByVoice(result, user?.id);
      }

      // Speak the results
      const feedback = formatResultsForVoice(results, searchType);
      await speakText(feedback);

      // Callback with results
      onResults?.(results, text);

      // Close modal after a delay
      setTimeout(() => {
        setShowModal(false);
        setTranscript('');
        setParsedResult(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error processing voice search:', err);
      setError(err.message);
      onError?.(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = async () => {
    stopListening();
    await stopSpeaking();
    setShowModal(false);
    setTranscript('');
    setParsedResult(null);
    setError(null);
  };

  return (
    <>
      {/* Voice Search Button */}
      <TouchableOpacity
        style={styles.voiceButton}
        onPress={startListening}
        activeOpacity={0.7}
      >
        <Mic size={20} color={colors.primary} />
      </TouchableOpacity>

      {/* Voice Search Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>

            {/* Microphone Animation */}
            <Animated.View
              style={[
                styles.micContainer,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              {isListening ? (
                <Mic size={48} color={colors.white} />
              ) : isProcessing ? (
                <ActivityIndicator size="large" color={colors.white} />
              ) : (
                <Volume2 size={48} color={colors.white} />
              )}
            </Animated.View>

            {/* Status Text */}
            <Text style={styles.statusText}>
              {isListening
                ? 'Listening...'
                : isProcessing
                ? 'Processing...'
                : 'Ready'}
            </Text>

            {/* Transcript */}
            {transcript && (
              <View style={styles.transcriptContainer}>
                <Text style={styles.transcriptLabel}>You said:</Text>
                <Text style={styles.transcriptText}>{transcript}</Text>
              </View>
            )}

            {/* Parsed Result */}
            {parsedResult && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultLabel}>Understood:</Text>
                {parsedResult.entities?.category && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultKey}>Category:</Text>
                    <Text style={styles.resultValue}>
                      {parsedResult.entities.category}
                    </Text>
                  </View>
                )}
                {parsedResult.entities?.location && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultKey}>Location:</Text>
                    <Text style={styles.resultValue}>
                      {parsedResult.entities.location}
                    </Text>
                  </View>
                )}
                {parsedResult.entities?.priceRange && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultKey}>Price Range:</Text>
                    <Text style={styles.resultValue}>
                      {parsedResult.entities.priceRange.min
                        ? `$${parsedResult.entities.priceRange.min}`
                        : ''}
                      {parsedResult.entities.priceRange.min &&
                      parsedResult.entities.priceRange.max
                        ? ' - '
                        : ''}
                      {parsedResult.entities.priceRange.max
                        ? `$${parsedResult.entities.priceRange.max}`
                        : ''}
                    </Text>
                  </View>
                )}
                {parsedResult.entities?.rating && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultKey}>Min Rating:</Text>
                    <Text style={styles.resultValue}>
                      {parsedResult.entities.rating} stars
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Error */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {isListening ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.stopButton]}
                  onPress={stopListening}
                >
                  <MicOff size={20} color={colors.white} />
                  <Text style={styles.actionButtonText}>Stop</Text>
                </TouchableOpacity>
              ) : !isProcessing ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.retryButton]}
                  onPress={startListening}
                >
                  <Mic size={20} color={colors.white} />
                  <Text style={styles.actionButtonText}>Try Again</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Help Text */}
            <Text style={styles.helpText}>
              Try saying: "Find a plumber near downtown" or "Show electricians under
              $100"
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  voiceButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  micContainer: {
    width: 120,
    height: 120,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statusText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  transcriptContainer: {
    width: '100%',
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  transcriptLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  transcriptText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 20,
  },
  resultContainer: {
    width: '100%',
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
  },
  resultLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  resultItem: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  resultKey: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginRight: spacing.xs,
  },
  resultValue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  errorContainer: {
    width: '100%',
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
  },
  actionButtons: {
    width: '100%',
    marginTop: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  stopButton: {
    backgroundColor: colors.error,
  },
  retryButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  helpText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 16,
  },
});
