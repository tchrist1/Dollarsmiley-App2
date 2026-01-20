import React, { forwardRef } from 'react';
import { Platform, View } from 'react-native';
import type { NativeInteractiveMapViewRef } from './NativeInteractiveMapView';

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
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onRecenter?: () => void;
  onLayersPress?: () => void;
  onZoomChange?: (zoom: number) => void;
  onMapGestureStart?: () => void;
  onMapGestureEnd?: () => void;
}

const InteractiveMapViewPlatform = forwardRef<NativeInteractiveMapViewRef, InteractiveMapViewPlatformProps>((props, ref) => {
  if (Platform.OS === 'web') {
    // Lazy load web map component
    const InteractiveMapView = require('./InteractiveMapView').default;
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
        onZoomChange={props.onZoomChange}
      />
    );
  }

  // Lazy load native map component
  const NativeInteractiveMapView = require('./NativeInteractiveMapView').default;
  return (
    <NativeInteractiveMapView
      ref={ref}
      markers={props.markers}
      onMarkerPress={props.onMarkerPress}
      initialRegion={props.initialRegion}
      style={props.style}
      showUserLocation={props.showUserLocation}
      enableClustering={props.enableClustering}
      onZoomIn={props.onZoomIn}
      onZoomOut={props.onZoomOut}
      onRecenter={props.onRecenter}
      onLayersPress={props.onLayersPress}
      onZoomChange={props.onZoomChange}
      onMapGestureStart={props.onMapGestureStart}
      onMapGestureEnd={props.onMapGestureEnd}
    />
  );
});

export default InteractiveMapViewPlatform;
