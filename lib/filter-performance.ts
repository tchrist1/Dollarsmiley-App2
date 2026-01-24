/**
 * WEEK 3: Filter Performance Monitoring
 *
 * Production-ready performance monitoring for filter operations.
 * Tracks key metrics and provides real-time performance insights.
 */

interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface PerformanceReport {
  timestamp: string;
  metrics: PerformanceMetric[];
  summary: {
    totalOperations: number;
    averageDuration: number;
    slowestOperation: string;
    fastestOperation: string;
  };
}

class FilterPerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private completed: PerformanceMetric[] = [];
  private enabled: boolean;

  constructor() {
    // Enable in development and opt-in production mode
    this.enabled = __DEV__ || (typeof window !== 'undefined' && (window as any).__ENABLE_PERF_MONITORING);
  }

  /**
   * Start tracking a filter operation
   */
  start(operation: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    this.metrics.set(operation, {
      operation,
      startTime: performance.now(),
      metadata,
    });
  }

  /**
   * End tracking a filter operation
   */
  end(operation: string, additionalMetadata?: Record<string, any>): void {
    if (!this.enabled) return;

    const metric = this.metrics.get(operation);
    if (!metric) {
      // DEV-only: Warn about missing start metric
      if (__DEV__) {
        console.warn(`[FilterPerf] No start metric found for: ${operation}`);
      }
      return;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    const completed: PerformanceMetric = {
      ...metric,
      endTime,
      duration,
      metadata: { ...metric.metadata, ...additionalMetadata },
    };

    this.completed.push(completed);
    this.metrics.delete(operation);

    // DEV-only: Log slow operations (> 100ms)
    if (__DEV__ && duration > 100) {
      console.warn(`[FilterPerf] SLOW OPERATION: ${operation} took ${duration.toFixed(2)}ms`, additionalMetadata);
    }
  }

  /**
   * Measure a synchronous operation
   */
  measure<T>(operation: string, fn: () => T, metadata?: Record<string, any>): T {
    if (!this.enabled) return fn();

    this.start(operation, metadata);
    try {
      const result = fn();
      this.end(operation);
      return result;
    } catch (error) {
      this.end(operation, { error: String(error) });
      throw error;
    }
  }

  /**
   * Measure an async operation
   */
  async measureAsync<T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    if (!this.enabled) return fn();

    this.start(operation, metadata);
    try {
      const result = await fn();
      this.end(operation);
      return result;
    } catch (error) {
      this.end(operation, { error: String(error) });
      throw error;
    }
  }

  /**
   * Get performance report
   */
  getReport(): PerformanceReport {
    if (this.completed.length === 0) {
      return {
        timestamp: new Date().toISOString(),
        metrics: [],
        summary: {
          totalOperations: 0,
          averageDuration: 0,
          slowestOperation: 'N/A',
          fastestOperation: 'N/A',
        },
      };
    }

    const durations = this.completed.map(m => m.duration!);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    const slowest = this.completed.reduce((prev, curr) =>
      (curr.duration! > prev.duration!) ? curr : prev
    );

    const fastest = this.completed.reduce((prev, curr) =>
      (curr.duration! < prev.duration!) ? curr : prev
    );

    return {
      timestamp: new Date().toISOString(),
      metrics: [...this.completed],
      summary: {
        totalOperations: this.completed.length,
        averageDuration: avgDuration,
        slowestOperation: `${slowest.operation} (${slowest.duration!.toFixed(2)}ms)`,
        fastestOperation: `${fastest.operation} (${fastest.duration!.toFixed(2)}ms)`,
      },
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.completed = [];
  }

  /**
   * Export metrics for analysis
   */
  export(): string {
    return JSON.stringify(this.getReport(), null, 2);
  }

  /**
   * Log report to console
   */
  logReport(): void {
    if (!this.enabled) return;

    const report = this.getReport();
    console.log('[FilterPerf] Performance Report:', report.summary);
    console.table(report.metrics.map(m => ({
      Operation: m.operation,
      Duration: `${m.duration!.toFixed(2)}ms`,
      Metadata: JSON.stringify(m.metadata || {}),
    })));
  }
}

// Singleton instance
export const filterPerf = new FilterPerformanceMonitor();

// Import useRef, useEffect, and useCallback for the hook
import { useRef, useEffect, useCallback } from 'react';

/**
 * React hook for filter performance tracking
 */
export function useFilterPerformance(componentName: string) {
  const mountTime = useRef<number>(performance.now());

  useEffect(() => {
    if (__DEV__) {
      filterPerf.start(`${componentName}_mount`);
      return () => {
        filterPerf.end(`${componentName}_mount`);
        const totalTime = performance.now() - mountTime.current;
        console.log(`[${componentName}] Total lifetime: ${totalTime.toFixed(2)}ms`);
      };
    }
  }, [componentName]);

  const trackOperation = useCallback((operation: string, metadata?: Record<string, any>) => {
    filterPerf.start(`${componentName}_${operation}`, metadata);
    return () => filterPerf.end(`${componentName}_${operation}`);
  }, [componentName]);

  const measure = useCallback(<T,>(operation: string, fn: () => T, metadata?: Record<string, any>) => {
    return filterPerf.measure(`${componentName}_${operation}`, fn, metadata);
  }, [componentName]);

  const measureAsync = useCallback(<T,>(operation: string, fn: () => Promise<T>, metadata?: Record<string, any>) => {
    return filterPerf.measureAsync(`${componentName}_${operation}`, fn, metadata);
  }, [componentName]);

  return {
    trackOperation,
    measure,
    measureAsync,
  };
}

/**
 * Performance thresholds for warnings
 */
export const PERF_THRESHOLDS = {
  FILTER_MODAL_OPEN: 400,     // Modal should open in < 400ms
  FILTER_CHANGE: 50,           // Filter changes should feel instant < 50ms
  SECTION_RENDER: 20,          // Individual sections < 20ms
  APPLY_FILTERS: 100,          // Apply operation < 100ms
  FETCH_RESULTS: 1000,         // Network fetch < 1s
} as const;

/**
 * Validate performance against thresholds
 */
export function validatePerformance(operation: keyof typeof PERF_THRESHOLDS, duration: number): boolean {
  const threshold = PERF_THRESHOLDS[operation];
  const passed = duration <= threshold;

  if (!passed && __DEV__) {
    console.warn(
      `[FilterPerf] THRESHOLD EXCEEDED: ${operation} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`
    );
  }

  return passed;
}
