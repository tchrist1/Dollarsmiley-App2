import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Play, Pause } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface VoiceMessagePlayerProps {
  voiceUrl: string;
  duration: number;
  waveform?: number[];
  isOwnMessage?: boolean;
}

export default function VoiceMessagePlayer({
  voiceUrl,
  duration,
  waveform = [],
  isOwnMessage = false,
}: VoiceMessagePlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(duration * 1000);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadSound = async () => {
    try {
      setIsLoading(true);

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: voiceUrl },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsLoading(false);
      return newSound;
    } catch (error) {
      console.error('Error loading sound:', error);
      setIsLoading(false);
      return null;
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis);
      setPlaybackDuration(status.durationMillis || duration * 1000);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPlaybackPosition(0);
      }
    }
  };

  const handlePlayPause = async () => {
    try {
      let currentSound = sound;

      if (!currentSound) {
        currentSound = await loadSound();
        if (!currentSound) return;
      }

      if (isPlaying) {
        await currentSound.pauseAsync();
        setIsPlaying(false);
      } else {
        if (playbackPosition >= playbackDuration) {
          await currentSound.setPositionAsync(0);
        }
        await currentSound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const formatTime = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = playbackDuration > 0 ? playbackPosition / playbackDuration : 0;

  return (
    <View style={[styles.container, isOwnMessage && styles.ownMessageContainer]}>
      <TouchableOpacity
        style={[styles.playButton, isOwnMessage && styles.playButtonOwn]}
        onPress={handlePlayPause}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isOwnMessage ? colors.white : colors.primary} />
        ) : isPlaying ? (
          <Pause
            size={20}
            color={isOwnMessage ? colors.white : colors.primary}
            fill={isOwnMessage ? colors.white : colors.primary}
          />
        ) : (
          <Play
            size={20}
            color={isOwnMessage ? colors.white : colors.primary}
            fill={isOwnMessage ? colors.white : colors.primary}
          />
        )}
      </TouchableOpacity>

      <View style={styles.waveformContainer}>
        <View style={styles.waveform}>
          {waveform.length > 0 ? (
            waveform.map((amplitude, index) => {
              const barProgress = index / waveform.length;
              const isPlayed = barProgress <= progress;

              return (
                <View
                  key={index}
                  style={[
                    styles.waveformBar,
                    {
                      height: Math.max(4, amplitude * 30),
                      backgroundColor: isPlayed
                        ? isOwnMessage
                          ? 'rgba(255, 255, 255, 0.9)'
                          : colors.primary
                        : isOwnMessage
                          ? 'rgba(255, 255, 255, 0.4)'
                          : colors.border,
                    },
                  ]}
                />
              );
            })
          ) : (
            Array.from({ length: 30 }).map((_, index) => {
              const barProgress = index / 30;
              const isPlayed = barProgress <= progress;

              return (
                <View
                  key={index}
                  style={[
                    styles.waveformBar,
                    {
                      height: 20,
                      backgroundColor: isPlayed
                        ? isOwnMessage
                          ? 'rgba(255, 255, 255, 0.9)'
                          : colors.primary
                        : isOwnMessage
                          ? 'rgba(255, 255, 255, 0.4)'
                          : colors.border,
                    },
                  ]}
                />
              );
            })
          )}
        </View>

        <Text style={[styles.timeText, isOwnMessage && styles.timeTextOwn]}>
          {isPlaying || playbackPosition > 0
            ? formatTime(playbackPosition)
            : formatTime(playbackDuration)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  ownMessageContainer: {
    // No additional styles needed, handled by parent
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonOwn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  waveformContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 32,
  },
  waveformBar: {
    flex: 1,
    borderRadius: 1,
    maxWidth: 3,
  },
  timeText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  timeTextOwn: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
