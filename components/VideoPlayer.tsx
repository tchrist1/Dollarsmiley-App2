import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  Platform,
} from 'react-native';
// TODO: Migrate from expo-av to expo-video (expo-av deprecated in SDK 54+)
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCw,
} from 'lucide-react-native';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';

interface VideoPlayerProps {
  uri: string;
  style?: any;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onFullscreen?: () => void;
  isVisible?: boolean;
}

export default function VideoPlayer({
  uri,
  style,
  autoPlay = false,
  muted = false,
  loop = false,
  onFullscreen,
  isVisible = true,
}: VideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!isVisible && isPlaying) {
      pauseVideo();
    }
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error('Video error:', status.error);
        setError(true);
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(false);
    setIsPlaying(status.isPlaying);
    setDuration(status.durationMillis || 0);
    setPosition(status.positionMillis || 0);

    if (status.didJustFinish && !loop) {
      setIsPlaying(false);
      setPosition(0);
    }
  };

  const playVideo = async () => {
    try {
      await videoRef.current?.playAsync();
      setIsPlaying(true);
      hideControlsAfterDelay();
    } catch (error) {
      console.error('Error playing video:', error);
    }
  };

  const pauseVideo = async () => {
    try {
      await videoRef.current?.pauseAsync();
      setIsPlaying(false);
      showControlsPermanently();
    } catch (error) {
      console.error('Error pausing video:', error);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  };

  const toggleMute = async () => {
    try {
      await videoRef.current?.setIsMutedAsync(!isMuted);
      setIsMuted(!isMuted);
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const replay = async () => {
    try {
      await videoRef.current?.replayAsync();
      setIsPlaying(true);
      hideControlsAfterDelay();
    } catch (error) {
      console.error('Error replaying video:', error);
    }
  };

  const seekTo = async (value: number) => {
    try {
      await videoRef.current?.setPositionAsync(value);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const hideControlsAfterDelay = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const showControlsPermanently = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
  };

  const handleVideoPress = () => {
    if (showControls) {
      hideControlsAfterDelay();
    } else {
      showControlsPermanently();
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  if (error) {
    return (
      <View style={[styles.container, style, styles.errorContainer]}>
        <Text style={styles.errorText}>Failed to load video</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handleVideoPress}
      style={[styles.container, style]}
    >
      <Video
        ref={videoRef}
        source={{ uri }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        isLooping={loop}
        isMuted={isMuted}
        shouldPlay={autoPlay}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        useNativeControls={false}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.white} />
        </View>
      )}

      {showControls && !isLoading && (
        <>
          <View style={styles.controlsOverlay}>
            <View style={styles.centerControls}>
              <TouchableOpacity
                style={styles.playPauseButton}
                onPress={togglePlayPause}
                activeOpacity={0.7}
              >
                {isPlaying ? (
                  <Pause size={48} color={colors.white} fill={colors.white} />
                ) : (
                  <Play size={48} color={colors.white} fill={colors.white} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.topControls}>
              {position === duration && duration > 0 && (
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={replay}
                  activeOpacity={0.7}
                >
                  <RotateCw size={24} color={colors.white} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.bottomControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleMute}
                activeOpacity={0.7}
              >
                {isMuted ? (
                  <VolumeX size={24} color={colors.white} />
                ) : (
                  <Volume2 size={24} color={colors.white} />
                )}
              </TouchableOpacity>

              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>
                  {formatTime(position)} / {formatTime(duration)}
                </Text>
              </View>

              {onFullscreen && (
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={onFullscreen}
                  activeOpacity={0.7}
                >
                  <Maximize size={24} color={colors.white} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[styles.progressBarFill, { width: `${progressPercentage}%` }]}
              />
            </View>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.text,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'space-between',
  },
  centerControls: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topControls: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeContainer: {
    flex: 1,
    alignItems: 'center',
  },
  timeText: {
    fontSize: fontSize.sm,
    color: colors.white,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
});
