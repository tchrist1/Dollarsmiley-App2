/**
 * Performance Monitoring Utility
 * Dev-only instrumentation for measuring user interaction response times
 */

interface PerformanceMetric {
  action: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private enabled: boolean = __DEV__;

  /**
   * Mark the start of a performance measurement
   */
  start(action: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    const startTime = performance.now();
    this.metrics.set(action, {
      action,
      startTime,
      metadata,
    });

    console.log(`[PERF] ${action}_START`, metadata ? metadata : '');
  }

  /**
   * Mark the end of a performance measurement
   */
  end(action: string, metadata?: Record<string, any>): number | null {
    if (!this.enabled) return null;

    const endTime = performance.now();
    const metric = this.metrics.get(action);

    if (!metric) {
      console.warn(`[PERF] No start mark found for action: ${action}`);
      return null;
    }

    const duration = endTime - metric.startTime;
    metric.endTime = endTime;
    metric.duration = duration;
    if (metadata) {
      metric.metadata = { ...metric.metadata, ...metadata };
    }

    console.log(`[PERF] ${action}_END (+${duration.toFixed(2)}ms)`, metric.metadata || '');

    return duration;
  }

  /**
   * Mark a single instant event
   */
  mark(event: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    const timestamp = performance.now();
    console.log(`[PERF] ${event} (${timestamp.toFixed(2)}ms)`, metadata || '');
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metrics for a specific action
   */
  getMetric(action: string): PerformanceMetric | undefined {
    return this.metrics.get(action);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    if (this.enabled) {
      console.log('[PERF] Metrics cleared');
    }
  }

  /**
   * Generate a performance report
   */
  generateReport(): string {
    if (!this.enabled) return 'Performance monitoring disabled';

    const metrics = this.getMetrics();
    const completedMetrics = metrics.filter((m) => m.duration !== undefined);

    if (completedMetrics.length === 0) {
      return 'No completed metrics to report';
    }

    let report = '\n=== PERFORMANCE REPORT ===\n\n';
    report += '| Action                    | Duration (ms) | Metadata\n';
    report += '|---------------------------|---------------|----------\n';

    completedMetrics.forEach((metric) => {
      const action = metric.action.padEnd(25);
      const duration = metric.duration!.toFixed(2).padStart(13);
      const metadata = metric.metadata ? JSON.stringify(metric.metadata) : '';
      report += `| ${action} | ${duration} | ${metadata}\n`;
    });

    report += '\n=========================\n';

    return report;
  }

  /**
   * Print the performance report to console
   */
  printReport(): void {
    if (!this.enabled) return;
    console.log(this.generateReport());
  }
}

// Singleton instance
export const perfMonitor = new PerformanceMonitor();

// Helper to measure async operations
export async function measureAsync<T>(
  action: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  perfMonitor.start(action, metadata);
  try {
    const result = await fn();
    perfMonitor.end(action);
    return result;
  } catch (error) {
    perfMonitor.end(action, { error: String(error) });
    throw error;
  }
}

// Helper to measure synchronous operations
export function measureSync<T>(
  action: string,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  perfMonitor.start(action, metadata);
  try {
    const result = fn();
    perfMonitor.end(action);
    return result;
  } catch (error) {
    perfMonitor.end(action, { error: String(error) });
    throw error;
  }
}
