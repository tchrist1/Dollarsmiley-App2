import React from 'react';
import { View, StyleSheet, Text, Platform, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { MapPin, Navigation } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  price?: number;
}

interface MapViewProps {
  markers: MapMarker[];
  onMarkerPress?: (marker: MapMarker) => void;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  style?: any;
}

const { width } = Dimensions.get('window');

export default function MapView({ markers, onMarkerPress, initialRegion, style }: MapViewProps) {
  const sortedMarkers = [...markers].sort((a, b) => {
    if (!initialRegion) return 0;

    const distA = Math.sqrt(
      Math.pow(a.latitude - initialRegion.latitude, 2) +
      Math.pow(a.longitude - initialRegion.longitude, 2)
    );
    const distB = Math.sqrt(
      Math.pow(b.latitude - initialRegion.latitude, 2) +
      Math.pow(b.longitude - initialRegion.longitude, 2)
    );

    return distA - distB;
  });

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    if (distance < 1) {
      return `${(distance * 5280).toFixed(0)} ft`;
    }
    return `${distance.toFixed(1)} mi`;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <MapPin size={24} color={theme.colors.primary} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Services Near You</Text>
            <Text style={styles.headerSubtitle}>
              {markers.length} {markers.length === 1 ? 'service' : 'services'} found
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {sortedMarkers.length === 0 ? (
          <View style={styles.emptyState}>
            <MapPin size={48} color={theme.colors.textLight} />
            <Text style={styles.emptyText}>No services with location data</Text>
            <Text style={styles.emptySubtext}>
              Services without geographic coordinates cannot be displayed
            </Text>
          </View>
        ) : (
          sortedMarkers.map((marker, index) => {
            const distance = initialRegion
              ? calculateDistance(
                  initialRegion.latitude,
                  initialRegion.longitude,
                  marker.latitude,
                  marker.longitude
                )
              : null;

            return (
              <TouchableOpacity
                key={marker.id}
                style={styles.markerCard}
                onPress={() => onMarkerPress?.(marker)}
                activeOpacity={0.7}
              >
                <View style={styles.markerHeader}>
                  <View style={styles.markerNumber}>
                    <Text style={styles.markerNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.markerInfo}>
                    <Text style={styles.markerTitle} numberOfLines={2}>
                      {marker.title}
                    </Text>
                    {marker.price && (
                      <Text style={styles.markerPrice}>${Math.round(marker.price).toLocaleString('en-US')}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.markerFooter}>
                  <View style={styles.locationInfo}>
                    <Navigation size={14} color={theme.colors.textSecondary} />
                    {distance && (
                      <Text style={styles.distanceText}>{distance} away</Text>
                    )}
                  </View>
                  <View style={styles.coordinatesInfo}>
                    <Text style={styles.coordinatesText}>
                      {marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerContent}>
          <MapPin size={16} color={theme.colors.primary} />
          <Text style={styles.footerText}>
            Sorted by distance from your location
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  markerCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  markerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  markerNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.white,
  },
  markerInfo: {
    flex: 1,
  },
  markerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  markerPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  markerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  coordinatesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coordinatesText: {
    fontSize: 12,
    color: theme.colors.textLight,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
