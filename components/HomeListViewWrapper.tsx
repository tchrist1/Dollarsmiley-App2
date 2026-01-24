import React from 'react';
import { View, FlatList, ActivityIndicator, Text } from 'react-native';
import { spacing, colors } from '@/constants/theme';

interface HomeListViewWrapperProps {
  viewMode: 'list' | 'grid' | 'map';
  feedData: any[];
  renderFeedItemList: (info: { item: any; index: number }) => React.ReactElement;
  feedKeyExtractor: (item: any) => string;
  onLoadMore: () => void;
  loadingMore: boolean;
  hasMore: boolean;
  listings: any[];
  styles: any;
}

export function HomeListViewWrapper({
  viewMode,
  feedData,
  renderFeedItemList,
  feedKeyExtractor,
  onLoadMore,
  loadingMore,
  hasMore,
  listings,
  styles,
}: HomeListViewWrapperProps) {
  return (
    <View
      style={[
        styles.viewContainer,
        viewMode !== 'list' && styles.viewContainerHidden
      ]}
      pointerEvents={viewMode === 'list' ? 'auto' : 'none'}
    >
      <FlatList
        data={feedData}
        renderItem={renderFeedItemList}
        keyExtractor={feedKeyExtractor}
        contentContainerStyle={styles.listingsContainer}
        showsVerticalScrollIndicator={false}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={6}
        maxToRenderPerBatch={3}
        updateCellsBatchingPeriod={100}
        windowSize={5}
        removeClippedSubviews={true}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
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
