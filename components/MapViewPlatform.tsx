import React from 'react';
import { Platform } from 'react-native';
import NativeMapView from './NativeMapView';
import MapView from './MapView';

interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  price?: number;
  type?: 'listing' | 'provider';
  subtitle?: string;
  rating?: number;
  isVerified?: boolean;
  reviewCount?: number;
  categories?: string[];
  responseTime?: string;
  completionRate?: number;
  avatarUrl?: string;
}

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface MapViewPlatformProps {
  markers: MapMarker[];
  onMarkerPress?: (marker: MapMarker) => void;
  initialRegion?: MapRegion;
  style?: any;
  showUserLocation?: boolean;
  followUserLocation?: boolean;
  mapStyle?: string;
  showControls?: boolean;
}

export default function MapViewPlatform(props: MapViewPlatformProps) {
  if (Platform.OS === 'web') {
    return (
      <MapView
        markers={props.markers}
        onMarkerPress={props.onMarkerPress}
        initialRegion={props.initialRegion}
        style={props.style}
      />
    );
  }

  return <NativeMapView {...props} />;
}
