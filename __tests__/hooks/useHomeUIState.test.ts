import { renderHook, act } from '@testing-library/react-native';
import { useHomeUIState } from '@/hooks/useHomeUIState';

describe('useHomeUIState', () => {
  describe('initialization', () => {
    it('initializes with default values', () => {
      const { result } = renderHook(() => useHomeUIState());

      expect(result.current.viewMode).toBe('grid');
      expect(result.current.mapMode).toBe('listings');
      expect(result.current.mapZoomLevel).toBe(12);
      expect(result.current.showMapStatusHint).toBe(false);
    });

    it('initializes with custom values', () => {
      const { result } = renderHook(() =>
        useHomeUIState({
          initialViewMode: 'list',
          initialMapMode: 'providers',
          initialMapZoom: 15,
        })
      );

      expect(result.current.viewMode).toBe('list');
      expect(result.current.mapMode).toBe('providers');
      expect(result.current.mapZoomLevel).toBe(15);
    });
  });

  describe('view mode management', () => {
    it('changes view mode to list', () => {
      const { result } = renderHook(() => useHomeUIState());

      act(() => {
        result.current.changeViewMode('list');
      });

      expect(result.current.viewMode).toBe('list');
    });

    it('changes view mode to grid', () => {
      const { result } = renderHook(() =>
        useHomeUIState({ initialViewMode: 'list' })
      );

      act(() => {
        result.current.changeViewMode('grid');
      });

      expect(result.current.viewMode).toBe('grid');
    });

    it('changes view mode to map', () => {
      const { result } = renderHook(() => useHomeUIState());

      act(() => {
        result.current.changeViewMode('map');
      });

      expect(result.current.viewMode).toBe('map');
    });
  });

  describe('map mode management', () => {
    it('changes map mode to providers', () => {
      const { result } = renderHook(() => useHomeUIState());

      act(() => {
        result.current.changeMapMode('providers');
      });

      expect(result.current.mapMode).toBe('providers');
    });

    it('changes map mode to listings', () => {
      const { result } = renderHook(() =>
        useHomeUIState({ initialMapMode: 'providers' })
      );

      act(() => {
        result.current.changeMapMode('listings');
      });

      expect(result.current.mapMode).toBe('listings');
    });
  });

  describe('map zoom management', () => {
    it('updates map zoom level', () => {
      const { result } = renderHook(() => useHomeUIState());

      act(() => {
        result.current.updateMapZoom(15);
      });

      expect(result.current.mapZoomLevel).toBe(15);
    });

    it('updates zoom multiple times', () => {
      const { result } = renderHook(() => useHomeUIState());

      act(() => {
        result.current.updateMapZoom(10);
      });

      expect(result.current.mapZoomLevel).toBe(10);

      act(() => {
        result.current.updateMapZoom(18);
      });

      expect(result.current.mapZoomLevel).toBe(18);
    });
  });

  describe('map status hint management', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('shows map hint', () => {
      const { result } = renderHook(() => useHomeUIState());

      expect(result.current.showMapStatusHint).toBe(false);

      act(() => {
        result.current.showMapHint();
      });

      expect(result.current.showMapStatusHint).toBe(true);
    });

    it('hides map hint after default duration (3s)', () => {
      const { result } = renderHook(() => useHomeUIState());

      act(() => {
        result.current.showMapHint();
      });

      expect(result.current.showMapStatusHint).toBe(true);

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(result.current.showMapStatusHint).toBe(false);
    });

    it('hides map hint after custom duration', () => {
      const { result } = renderHook(() => useHomeUIState());

      act(() => {
        result.current.showMapHint(5000);
      });

      expect(result.current.showMapStatusHint).toBe(true);

      act(() => {
        jest.advanceTimersByTime(4999);
      });

      expect(result.current.showMapStatusHint).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1);
      });

      expect(result.current.showMapStatusHint).toBe(false);
    });

    it('hides map hint immediately when called', () => {
      const { result } = renderHook(() => useHomeUIState());

      act(() => {
        result.current.showMapHint();
      });

      expect(result.current.showMapStatusHint).toBe(true);

      act(() => {
        result.current.hideMapHint();
      });

      expect(result.current.showMapStatusHint).toBe(false);
    });

    it('clears previous timer when showing hint again', () => {
      const { result } = renderHook(() => useHomeUIState());

      act(() => {
        result.current.showMapHint(1000);
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      act(() => {
        result.current.showMapHint(2000);
      });

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(result.current.showMapStatusHint).toBe(true);

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.showMapStatusHint).toBe(false);
    });

    it('cleans up timer on unmount', () => {
      const { result, unmount } = renderHook(() => useHomeUIState());

      act(() => {
        result.current.showMapHint();
      });

      expect(result.current.showMapStatusHint).toBe(true);

      unmount();

      act(() => {
        jest.advanceTimersByTime(3000);
      });
    });
  });

  describe('callback stability', () => {
    it('callbacks are stable across renders', () => {
      const { result, rerender } = renderHook(() => useHomeUIState());

      const changeViewMode1 = result.current.changeViewMode;
      const changeMapMode1 = result.current.changeMapMode;
      const updateMapZoom1 = result.current.updateMapZoom;
      const showMapHint1 = result.current.showMapHint;
      const hideMapHint1 = result.current.hideMapHint;

      rerender();

      expect(result.current.changeViewMode).toBe(changeViewMode1);
      expect(result.current.changeMapMode).toBe(changeMapMode1);
      expect(result.current.updateMapZoom).toBe(updateMapZoom1);
      expect(result.current.showMapHint).toBe(showMapHint1);
      expect(result.current.hideMapHint).toBe(hideMapHint1);
    });
  });

  describe('complex interactions', () => {
    it('handles multiple state changes', () => {
      const { result } = renderHook(() => useHomeUIState());

      act(() => {
        result.current.changeViewMode('map');
        result.current.changeMapMode('providers');
        result.current.updateMapZoom(15);
        result.current.showMapHint();
      });

      expect(result.current.viewMode).toBe('map');
      expect(result.current.mapMode).toBe('providers');
      expect(result.current.mapZoomLevel).toBe(15);
      expect(result.current.showMapStatusHint).toBe(true);
    });
  });
});
