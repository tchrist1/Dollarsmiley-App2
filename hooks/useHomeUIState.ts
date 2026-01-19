import { useState, useCallback, useRef } from 'react';

export type ViewMode = 'list' | 'grid' | 'map';
export type MapMode = 'listings' | 'providers';

interface UseHomeUIStateOptions {
  initialViewMode?: ViewMode;
  initialMapMode?: MapMode;
  initialMapZoom?: number;
}

export function useHomeUIState(options: UseHomeUIStateOptions = {}) {
  const [viewMode, setViewMode] = useState<ViewMode>(options.initialViewMode || 'grid');
  const [mapMode, setMapMode] = useState<MapMode>(options.initialMapMode || 'listings');
  const [mapZoomLevel, setMapZoomLevel] = useState(options.initialMapZoom || 12);
  const [showMapStatusHint, setShowMapStatusHint] = useState(false);
  const mapStatusHintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const changeViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  const changeMapMode = useCallback((mode: MapMode) => {
    setMapMode(mode);
  }, []);

  const updateMapZoom = useCallback((zoom: number) => {
    setMapZoomLevel(zoom);
  }, []);

  const showMapHint = useCallback((duration: number = 3000) => {
    if (mapStatusHintTimer.current) {
      clearTimeout(mapStatusHintTimer.current);
    }

    setShowMapStatusHint(true);
    mapStatusHintTimer.current = setTimeout(() => {
      setShowMapStatusHint(false);
      mapStatusHintTimer.current = undefined;
    }, duration);
  }, []);

  const hideMapHint = useCallback(() => {
    if (mapStatusHintTimer.current) {
      clearTimeout(mapStatusHintTimer.current);
      mapStatusHintTimer.current = undefined;
    }
    setShowMapStatusHint(false);
  }, []);

  return {
    viewMode,
    mapMode,
    mapZoomLevel,
    showMapStatusHint,
    changeViewMode,
    changeMapMode,
    updateMapZoom,
    showMapHint,
    hideMapHint,
  };
}
