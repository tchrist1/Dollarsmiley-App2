import React from 'react';
import { View, FlatList, ActivityIndicator, Text } from 'react-native';
import { colors } from '@/constants/theme';

interface HomeGridViewWrapperProps {
  viewMode: 'list' | 'grid' | 'map';
  feedData: any[];
  renderFeedItemGrid: (info: { item: any; index: number }) => React.ReactElement;
  feedKeyExtractor: (item: any) => string;
  onLoadMore: () => void;
  loadingMore: boolean;
  hasMore: boolean;
  listings: any[];
  styles: any;
}

export function HomeGridViewWrapper({
  viewMode,
  feedData,
  renderFeedItemGrid,
  feedKeyExtractor,
  onLoadMore,
  loadingMore,
  hasMore,
  listings,
  styles,
}: HomeGridViewWrapperProps) {
  return (
    <View
      style={[
        styles.viewContainer,
        viewMode !== 'grid' && styles.viewContainerHidden
      ]}
      pointerEvents={viewMode === 'grid' ? 'auto' : 'none'}
    >
      <FlatList
        data={feedData}
        renderItem={renderFeedItemGrid}
        keyExtractor={feedKeyExtractor}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={8}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={100}
        windowSize={5}
        removeClippedSubviews={true}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
          ) : !hasMore && listings.length > 0 ? (
            <View style={styles.endReachedContainer}>
              <Text style={styles.endReachedText}>You've reached the end</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
