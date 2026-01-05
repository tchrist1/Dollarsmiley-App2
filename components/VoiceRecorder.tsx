import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { Mic, Square, Trash2, Send } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, duration: number, waveform: number[]) => void;
  onCancel: () => void;
  maxDuration?: number;
}

export default function VoiceRecorder({
  onRecordingComplete,
  onCancel,
  maxDuration = 120,
}: VoiceRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((prev) => {
          const newDuration = prev + 1;
          if (newDuration >= maxDuration) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, maxDuration]);

  const setupAudio = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      }
    } catch (error) {
      console.error('Failed to setup audio:', error);
    }
  };

  const startRecording = async () => {
    try {
      if (permissionResponse?.status !== 'granted') {
        const result = await requestPermission();
        if (!result.granted) {
          Alert.alert('Permission Required', 'Please grant microphone permission to record voice messages');
          return;
        }
      }

      await setupAudio();

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (status.isRecording && status.metering !== undefined) {
            const normalizedLevel = Math.abs(status.metering) / 160;
            const amplitude = Math.min(1, Math.max(0, normalizedLevel));
            setWaveformData((prev) => [...prev, amplitude]);
          }
        },
        100
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      setWaveformData([]);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri) {
        setAudioUri(uri);
      }

      setRecording(null);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const handleDelete = () => {
    setAudioUri(null);
    setRecordingDuration(0);
    setWaveformData([]);
  };

  const handleSend = () => {
    if (audioUri) {
      onRecordingComplete(audioUri, recordingDuration, waveformData);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.webNotSupported}>
          <Mic size={32} color={colors.textSecondary} />
          <Text style={styles.webText}>Voice messages are not supported on web</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!audioUri ? (
        <View style={styles.recordingContainer}>
          <View style={styles.waveformContainer}>
            {isRecording ? (
              <View style={styles.waveform}>
                {waveformData.slice(-30).map((amplitude, index) => (
                  <View
                    key={index}
                    style={[
                      styles.waveformBar,
                      { height: Math.max(4, amplitude * 40) },
                    ]}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.readyState}>
                <Mic size={48} color={colors.primary} />
                <Text style={styles.instructionText}>Tap to start recording</Text>
              </View>
            )}
          </View>

          {isRecording && (
            <View style={styles.durationContainer}>
              <View style={styles.recordingIndicator} />
              <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
              <Text style={styles.maxDurationText}>/ {formatDuration(maxDuration)}</Text>
            </View>
          )}

          <View style={styles.controls}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText} numberOfLines={1}>Cancel</Text>
            </TouchableOpacity>

            {!isRecording ? (
              <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
                <View style={styles.recordButtonInner}>
                  <Mic size={28} color={colors.white} />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                <Square size={24} color={colors.white} fill={colors.white} />
              </TouchableOpacity>
            )}

            <View style={styles.cancelButtonSpacer} />
          </View>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <View style={styles.previewInfo}>
            <Mic size={32} color={colors.primary} />
            <View style={styles.previewText}>
              <Text style={styles.previewTitle}>Voice Message</Text>
              <Text style={styles.previewDuration}>{formatDuration(recordingDuration)}</Text>
            </View>
          </View>

          <View style={styles.previewWaveform}>
            {waveformData.map((amplitude, index) => (
              <View
                key={index}
                style={[
                  styles.previewWaveformBar,
                  { height: Math.max(2, amplitude * 30) },
                ]}
              />
            ))}
          </View>

          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Trash2 size={24} color={colors.error} />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sendVoiceButton} onPress={handleSend}>
              <Send size={20} color={colors.white} />
              <Text style={styles.sendVoiceButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  webNotSupported: {
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  webText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  closeButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  closeButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  recordingContainer: {
    padding: spacing.lg,
  },
  waveformContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 60,
  },
  waveformBar: {
    width: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  readyState: {
    alignItems: 'center',
    gap: spacing.md,
  },
  instructionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  recordingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  durationText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  maxDurationText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonSpacer: {
    minWidth: 88,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    flexWrap: 'nowrap',
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    padding: spacing.lg,
  },
  previewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  previewText: {
    flex: 1,
  },
  previewTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  previewDuration: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  previewWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 40,
    marginBottom: spacing.lg,
  },
  previewWaveformBar: {
    flex: 1,
    backgroundColor: colors.primary + '40',
    borderRadius: 1,
  },
  previewActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  deleteButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.error,
  },
  sendVoiceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  sendVoiceButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
