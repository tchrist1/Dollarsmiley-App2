import React from 'react';
import { View } from 'react-native';
import InteractiveMapViewPlatform from '@/components/InteractiveMapViewPlatform';
import MapStatusHint from '@/components/MapStatusHint';
import MapViewFAB from '@/components/MapViewFAB';
import MapFAB from '@/components/MapFAB';
import { NativeInteractiveMapViewRef } from '@/components/NativeInteractiveMapView';
import { MapViewMode } from '@/types/map';

interface HomeMapViewWrapperProps {
  viewMode: 'list' | 'grid' | 'map';
  mapRef: React.RefObject<NativeInteractiveMapViewRef | null>;
  mapMarkers: any[];
  onMarkerPress: (marker: any) => void;
  initialRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | undefined;
  onZoomChange: (zoom: number) => void;
  filterLocation: { latitude: number; longitude: number } | undefined;
  filterDistance: number | undefined;
  showMapStatusHint: boolean;
  mapZoomLevel: number;
  mapMode: MapViewMode;
  onMapModeChange: (mode: MapViewMode) => void;
  onMapZoomIn: () => void;
  onMapZoomOut: () => void;
  onMapRecenter: () => void;
  onMapLayers: () => void;
  styles: any;
}

export function HomeMapViewWrapper({
  viewMode,
  mapRef,
  mapMarkers,
  onMarkerPress,
  initialRegion,
  onZoomChange,
  filterLocation,
  filterDistance,
  showMapStatusHint,
  mapZoomLevel,
  mapMode,
  onMapModeChange,
  onMapZoomIn,
  onMapZoomOut,
  onMapRecenter,
  onMapLayers,
  styles,
}: HomeMapViewWrapperProps) {
  return (
    <View
      style={[
        styles.viewContainer,
        styles.mapViewContainer,
        viewMode !== 'map' && styles.viewContainerHidden
      ]}
      pointerEvents={viewMode === 'map' ? 'auto' : 'none'}
    >
      <InteractiveMapViewPlatform
        ref={mapRef}
        markers={mapMarkers}
        onMarkerPress={onMarkerPress}
        initialRegion={initialRegion}
        showUserLocation={true}
        enableClustering={true}
        onZoomChange={onZoomChange}
        filterLocation={filterLocation}
        filterDistance={filterDistance}
      />

      {viewMode === 'map' && (
        <>
          <MapStatusHint
            locationCount={mapMarkers.length}
            zoomLevel={mapZoomLevel}
            visible={showMapStatusHint}
            mode={mapMode}
          />

          <MapViewFAB
            mode={mapMode}
            onModeChange={onMapModeChange}
          />

          <MapFAB
            onZoomIn={onMapZoomIn}
            onZoomOut={onMapZoomOut}
            onFullscreen={onMapRecenter}
            onLayersPress={onMapLayers}
          />
        </>
      )}
    </View>
  );
}
