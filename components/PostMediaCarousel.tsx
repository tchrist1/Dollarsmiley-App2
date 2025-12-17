import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import VideoPlayer from './VideoPlayer';
import { colors, spacing, borderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const CAROUSEL_HEIGHT = CAROUSEL_WIDTH * 0.75;

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
}

interface PostMediaCarouselProps {
  mediaUrls: string[];
  style?: any;
}

export default function PostMediaCarousel({ mediaUrls, style }: PostMediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const fullscreenFlatListRef = useRef<FlatList>(null);

  if (!mediaUrls || mediaUrls.length === 0) {
    return null;
  }

  const mediaItems: MediaItem[] = mediaUrls.map((url) => ({
    uri: url,
    type: isVideoUrl(url) ? 'video' : 'image',
  }));

  function isVideoUrl(url: string): boolean {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    return videoExtensions.some((ext) => url.toLowerCase().includes(ext));
  }

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / CAROUSEL_WIDTH);
    setCurrentIndex(index);
  };

  const handleFullscreenScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const goToNext = () => {
    if (currentIndex < mediaItems.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
      setCurrentIndex(prevIndex);
    }
  };

  const openFullscreen = (index: number) => {
    setCurrentIndex(index);
    setFullscreenVisible(true);
    setTimeout(() => {
      fullscreenFlatListRef.current?.scrollToIndex({ index, animated: false });
    }, 100);
  };

  const closeFullscreen = () => {
    setFullscreenVisible(false);
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: currentIndex, animated: false });
    }, 100);
  };

  const renderCarouselItem = ({ item, index }: { item: MediaItem; index: number }) => {
    if (item.type === 'video') {
      return (
        <View style={styles.carouselItemContainer}>
          <VideoPlayer
            uri={item.uri}
            autoPlay={false}
            muted={true}
            loop={false}
            onFullscreen={() => openFullscreen(index)}
            isVisible={index === currentIndex}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => openFullscreen(index)}
        style={styles.carouselItemContainer}
      >
        <Image
          source={{ uri: item.uri }}
          style={styles.carouselImage}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  };

  const renderFullscreenItem = ({ item, index }: { item: MediaItem; index: number }) => {
    if (item.type === 'video') {
      return (
        <View style={styles.fullscreenItemContainer}>
          <VideoPlayer
            uri={item.uri}
            autoPlay={true}
            muted={false}
            loop={false}
            isVisible={index === currentIndex}
            style={styles.fullscreenVideo}
          />
        </View>
      );
    }

    return (
      <View style={styles.fullscreenItemContainer}>
        <ScrollView
          maximumZoomScale={3}
          minimumZoomScale={1}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.fullscreenScrollContent}
        >
          <Image
            source={{ uri: item.uri }}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
        </ScrollView>
      </View>
    );
  };

  const renderIndicators = () => {
    if (mediaItems.length <= 1) return null;

    return (
      <View style={styles.indicatorsContainer}>
        {mediaItems.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              index === currentIndex && styles.indicatorActive,
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <>
      <View style={[styles.container, style]}>
        <FlatList
          ref={flatListRef}
          data={mediaItems}
          renderItem={renderCarouselItem}
          keyExtractor={(_, index) => index.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({
            length: CAROUSEL_WIDTH,
            offset: CAROUSEL_WIDTH * index,
            index,
          })}
        />

        {mediaItems.length > 1 && (
          <>
            {currentIndex > 0 && (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonLeft]}
                onPress={goToPrevious}
                activeOpacity={0.7}
              >
                <ChevronLeft size={24} color={colors.white} />
              </TouchableOpacity>
            )}

            {currentIndex < mediaItems.length - 1 && (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonRight]}
                onPress={goToNext}
                activeOpacity={0.7}
              >
                <ChevronRight size={24} color={colors.white} />
              </TouchableOpacity>
            )}
          </>
        )}

        {renderIndicators()}
      </View>

      <Modal
        visible={fullscreenVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={closeFullscreen}
      >
        <View style={styles.fullscreenContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={closeFullscreen}
            activeOpacity={0.7}
          >
            <View style={styles.closeButtonCircle}>
              <X size={24} color={colors.white} />
            </View>
          </TouchableOpacity>

          <FlatList
            ref={fullscreenFlatListRef}
            data={mediaItems}
            renderItem={renderFullscreenItem}
            keyExtractor={(_, index) => `fullscreen-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleFullscreenScroll}
            scrollEventThrottle={16}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
          />

          <View style={styles.fullscreenIndicatorsContainer}>
            {mediaItems.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.fullscreenIndicator,
                  index === currentIndex && styles.fullscreenIndicatorActive,
                ]}
              />
            ))}
          </View>

          {mediaItems.length > 1 && (
            <View style={styles.fullscreenCounter}>
              <View style={styles.counterBadge}>
                {currentIndex + 1} / {mediaItems.length}
              </View>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CAROUSEL_WIDTH,
    height: CAROUSEL_HEIGHT,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    position: 'relative',
  },
  carouselItemContainer: {
    width: CAROUSEL_WIDTH,
    height: CAROUSEL_HEIGHT,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  navButtonLeft: {
    left: spacing.sm,
  },
  navButtonRight: {
    right: spacing.sm,
  },
  indicatorsContainer: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorActive: {
    width: 20,
    backgroundColor: colors.white,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: colors.text,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.xl + spacing.md,
    right: spacing.lg,
    zIndex: 10,
  },
  closeButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenItemContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  fullscreenVideo: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  fullscreenIndicatorsContainer: {
    position: 'absolute',
    bottom: spacing.xxxl,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fullscreenIndicator: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  fullscreenIndicatorActive: {
    width: 24,
    backgroundColor: colors.white,
  },
  fullscreenCounter: {
    position: 'absolute',
    top: spacing.xl + spacing.md,
    left: spacing.lg,
    zIndex: 10,
  },
  counterBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
