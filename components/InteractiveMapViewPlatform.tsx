import React from 'react';
import { Platform } from 'react-native';
import NativeInteractiveMapView from './NativeInteractiveMapView';
import InteractiveMapView from './InteractiveMapView';

interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  price?: number;
  type?: 'listing' | 'provider';
  listingType?: 'Service' | 'CustomService' | 'Job';
  pricingType?: 'fixed_price' | 'quote_based';
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

interface InteractiveMapViewPlatformProps {
  markers: MapMarker[];
  onMarkerPress?: (marker: MapMarker) => void;
  initialRegion?: MapRegion;
  style?: any;
  showControls?: boolean;
  onSwitchToList?: () => void;
  enableClustering?: boolean;
  clusterRadius?: number;
  showUserLocation?: boolean;
}

export default function InteractiveMapViewPlatform(props: InteractiveMapViewPlatformProps) {
  if (Platform.OS === 'web') {
    return (
      <InteractiveMapView
        markers={props.markers}
        onMarkerPress={props.onMarkerPress}
        initialRegion={props.initialRegion}
        style={props.style}
        showControls={props.showControls}
        onSwitchToList={props.onSwitchToList}
        enableClustering={props.enableClustering}
        clusterRadius={props.clusterRadius}
      />
    );
  }

  return (
    <NativeInteractiveMapView
      markers={props.markers}
      onMarkerPress={props.onMarkerPress}
      initialRegion={props.initialRegion}
      style={props.style}
      showControls={props.showControls}
      onSwitchToList={props.onSwitchToList}
      showUserLocation={props.showUserLocation}
      enableClustering={props.enableClustering}
    />
  );
}
