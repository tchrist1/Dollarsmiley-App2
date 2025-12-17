import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { spacing } from '@/constants/theme';

interface ResponsiveGridProps {
  children: React.ReactNode;
  minColumns?: number;
  maxColumns?: number;
  gap?: number;
  itemMinWidth?: number;
}

/**
 * ResponsiveGrid - A flexible grid component that adapts to screen size
 *
 * @param minColumns - Minimum number of columns (default: 2)
 * @param maxColumns - Maximum number of columns (default: 4)
 * @param gap - Space between items (default: spacing.md)
 * @param itemMinWidth - Minimum width for each item in pixels (default: 150)
 */
export default function ResponsiveGrid({
  children,
  minColumns = 2,
  maxColumns = 4,
  gap = spacing.md,
  itemMinWidth = 150,
}: ResponsiveGridProps) {
  const { width } = useWindowDimensions();

  // Calculate optimal number of columns based on screen width
  const getColumns = () => {
    // Don't account for container padding here since it's handled externally
    const columnsFromWidth = Math.floor(width / (itemMinWidth + gap));
    return Math.max(minColumns, Math.min(maxColumns, columnsFromWidth));
  };

  const columns = getColumns();
  const childrenArray = React.Children.toArray(children);

  return (
    <View style={[styles.container, { marginHorizontal: -gap / 2 }]}>
      {childrenArray.map((child, index) => {
        const itemsInLastRow = childrenArray.length % columns || columns;
        const isInLastRow = index >= childrenArray.length - itemsInLastRow;

        return (
          <View
            key={index}
            style={[
              styles.item,
              {
                width: `${100 / columns}%`,
                paddingHorizontal: gap / 2,
                marginBottom: isInLastRow ? 0 : gap,
              },
            ]}
          >
            {child}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  item: {
    // Items will have dynamic width based on columns
  },
});
