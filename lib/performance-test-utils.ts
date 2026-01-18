/**
 * Performance Test Utilities
 *
 * DEV-ONLY instrumentation for measuring Home screen and Filters performance
 *
 * ❌ NO business logic changes
 * ❌ NO caching
 * ❌ NO behavior modifications
 * ✅ Measurement and logging only
 */

export interface PerformanceMetric {
  eventName: string;
  timestamp: number;
  deltaMs?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceTestResult {
  action: string;
  avgMs: number;
  p95Ms: number;
  jsBlocks: number;
  framesDropped: number;
  networkCalls: number;
  rerenderCount: number;
  notes: string;
  rawTimings: number[];
}

// Module-level storage for performance metrics (DEV ONLY)
let performanceMetrics: PerformanceMetric[] = [];
let frameDrops: number = 0;
let networkCallCount: number = 0;
let renderCount: number = 0;
let jsBlockCount: number = 0;

// Track long tasks (>50ms)
let lastTaskTime: number = Date.now();

/**
 * Log a performance event with timestamp
 */
export function logPerfEvent(
  eventName: string,
  metadata?: Record<string, any>
): void {
  if (!__DEV__) return;

  const now = performance.now();
  const metric: PerformanceMetric = {
    eventName,
    timestamp: now,
    metadata,
  };

  performanceMetrics.push(metric);

  console.log(`[PERF] ${eventName}`, {
    timestamp: now.toFixed(2),
    metadata,
  });

  // Check for long tasks (JS thread blocking)
  const taskDuration = now - lastTaskTime;
  if (taskDuration > 50) {
    jsBlockCount++;
    console.log(`[PERF] JS_BLOCK_DETECTED`, {
      duration: taskDuration.toFixed(2),
      afterEvent: eventName,
    });
  }
  lastTaskTime = now;
}

/**
 * Log a network call
 */
export function logNetworkCall(
  endpoint: string,
  duration?: number
): void {
  if (!__DEV__) return;

  networkCallCount++;
  console.log(`[PERF] NETWORK_CALL`, {
    count: networkCallCount,
    endpoint,
    duration: duration?.toFixed(2),
  });
}

/**
 * Log a render event
 */
export function logRender(componentName: string): void {
  if (!__DEV__) return;

  renderCount++;
  console.log(`[PERF] RENDER`, {
    count: renderCount,
    component: componentName,
    timestamp: performance.now().toFixed(2),
  });
}

/**
 * Log a frame drop
 */
export function logFrameDrop(): void {
  if (!__DEV__) return;

  frameDrops++;
  console.log(`[PERF] FRAME_DROP`, {
    count: frameDrops,
    timestamp: performance.now().toFixed(2),
  });
}

/**
 * Calculate delta between two events
 */
export function calculateDelta(
  startEvent: string,
  endEvent: string
): number | null {
  if (!__DEV__) return null;

  const start = performanceMetrics.find(m => m.eventName === startEvent);
  const end = performanceMetrics.find(m => m.eventName === endEvent);

  if (!start || !end) return null;

  const delta = end.timestamp - start.timestamp;
  console.log(`[PERF] DELTA`, {
    from: startEvent,
    to: endEvent,
    deltaMs: delta.toFixed(2),
  });

  return delta;
}

/**
 * Reset all metrics for a new test run
 */
export function resetPerfMetrics(): void {
  if (!__DEV__) return;

  performanceMetrics = [];
  frameDrops = 0;
  networkCallCount = 0;
  renderCount = 0;
  jsBlockCount = 0;
  lastTaskTime = Date.now();

  console.log(`[PERF] METRICS_RESET`);
}

/**
 * Get current metrics snapshot
 */
export function getPerfMetrics(): {
  metrics: PerformanceMetric[];
  frameDrops: number;
  networkCalls: number;
  renderCount: number;
  jsBlocks: number;
} {
  if (!__DEV__) {
    return {
      metrics: [],
      frameDrops: 0,
      networkCalls: 0,
      renderCount: 0,
      jsBlocks: 0,
    };
  }

  return {
    metrics: [...performanceMetrics],
    frameDrops,
    networkCalls: networkCallCount,
    renderCount,
    jsBlocks: jsBlockCount,
  };
}

/**
 * Calculate P95 from array of values
 */
export function calculateP95(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculate average from array of values
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;

  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Format performance report table
 */
export function formatPerformanceReport(
  results: PerformanceTestResult[]
): string {
  const header = '| Action                    | Avg (ms) | P95 (ms) | JS Blocks | Frames Dropped | Network Calls | Notes |';
  const separator = '|---------------------------|----------|----------|-----------|----------------|---------------|-------|';

  const rows = results.map(r =>
    `| ${r.action.padEnd(25)} | ${r.avgMs.toFixed(0).padStart(8)} | ${r.p95Ms.toFixed(0).padStart(8)} | ${r.jsBlocks.toString().padStart(9)} | ${r.framesDropped.toString().padStart(14)} | ${r.networkCalls.toString().padStart(13)} | ${r.notes.padEnd(5)} |`
  );

  return [header, separator, ...rows].join('\n');
}

/**
 * Generate summary of top bottlenecks
 */
export function generateBottleneckSummary(
  results: PerformanceTestResult[]
): string[] {
  const sortedByP95 = [...results].sort((a, b) => b.p95Ms - a.p95Ms);

  const bottlenecks: string[] = [];

  // Top 3 slowest operations
  for (let i = 0; i < Math.min(3, sortedByP95.length); i++) {
    const result = sortedByP95[i];

    let reason = '';
    if (result.networkCalls > 5) {
      reason = `High network activity (${result.networkCalls} calls)`;
    } else if (result.jsBlocks > 3) {
      reason = `JS thread blocking (${result.jsBlocks} long tasks)`;
    } else if (result.rerenderCount > 10) {
      reason = `Excessive re-renders (${result.rerenderCount} renders)`;
    } else if (result.framesDropped > 5) {
      reason = `Frame drops (${result.framesDropped} frames)`;
    } else {
      reason = 'General slow execution';
    }

    bottlenecks.push(
      `${i + 1}. ${result.action} (P95: ${result.p95Ms.toFixed(0)}ms) - ${reason}`
    );
  }

  return bottlenecks;
}
