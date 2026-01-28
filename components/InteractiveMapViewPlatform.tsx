import React, { forwardRef } from 'react';
import { Platform } from 'react-native';
import NativeInteractiveMapView, { NativeInteractiveMapViewRef } from './NativeInteractiveMapView';
import InteractiveMapView from './InteractiveMapView';
import { MapMarker, MapRegion } from '@/types/map';

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
  filterLocation?: { latitude: number; longitude: number };
  filterDistance?: number;
  hasNearbyExpansion?: boolean;
}

const InteractiveMapViewPlatform = forwardRef<NativeInteractiveMapViewRef, InteractiveMapViewPlatformProps>((props, ref) => {
  try {
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
          onZoomChange={props.onZoomChange}
          filterLocation={props.filterLocation}
          filterDistance={props.filterDistance}
          hasNearbyExpansion={props.hasNearbyExpansion}
        />
      );
    }

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
        filterLocation={props.filterLocation}
        filterDistance={props.filterDistance}
        hasNearbyExpansion={props.hasNearbyExpansion}
      />
    );
  } catch (error) {
    console.error('InteractiveMapViewPlatform error:', error);
    return null;
  }
});

export default InteractiveMapViewPlatform;
