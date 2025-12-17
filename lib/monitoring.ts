import { supabase } from './supabase';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

/**
 * Monitoring and Alerting System for Production Scaling
 *
 * Features:
 * - Error tracking
 * - Performance monitoring
 * - User behavior analytics
 * - Health checks
 * - Alert system
 */

// ============================================================================
// ERROR TRACKING
// ============================================================================

export interface ErrorLog {
  error_type: string;
  error_message: string;
  error_stack?: string;
  user_id?: string;
  user_agent: string;
  app_version: string;
  device_info: string;
  screen_name?: string;
  additional_context?: Record<string, any>;
}

export async function logError(error: Error, context?: Record<string, any>): Promise<void> {
  try {
    const errorLog: ErrorLog = {
      error_type: error.name,
      error_message: error.message,
      error_stack: error.stack,
      user_agent: Device.osName || 'unknown',
      app_version: Constants.expoConfig?.version || '1.0.0',
      device_info: JSON.stringify({
        brand: Device.brand,
        model: Device.modelName,
        os: Device.osName,
        osVersion: Device.osVersion,
      }),
      additional_context: context,
    };

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      errorLog.user_id = user.id;
    }

    // Log to Supabase
    await supabase.from('error_logs').insert(errorLog);

    // Console log in development
    if (__DEV__) {
      console.error('Error logged:', errorLog);
    }
  } catch (loggingError) {
    console.error('Failed to log error:', loggingError);
  }
}

// Global error handler
export function setupGlobalErrorHandler(): void {
  const originalErrorHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler(async (error, isFatal) => {
    await logError(error, { isFatal });

    if (originalErrorHandler) {
      originalErrorHandler(error, isFatal);
    }
  });
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

export interface PerformanceMetric {
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  user_id?: string;
  screen_name?: string;
  additional_data?: Record<string, any>;
}

class PerformanceMonitor {
  private startTimes: Map<string, number> = new Map();

  start(metricName: string): void {
    this.startTimes.set(metricName, Date.now());
  }

  async end(metricName: string, additionalData?: Record<string, any>): Promise<void> {
    const startTime = this.startTimes.get(metricName);

    if (!startTime) {
      console.warn(`No start time found for metric: ${metricName}`);
      return;
    }

    const duration = Date.now() - startTime;
    this.startTimes.delete(metricName);

    await this.track({
      metric_name: metricName,
      metric_value: duration,
      metric_unit: 'milliseconds',
      additional_data: additionalData,
    });
  }

  async track(metric: PerformanceMetric): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        metric.user_id = user.id;
      }

      await supabase.from('performance_metrics').insert(metric);

      if (__DEV__) {
        console.log('Performance metric:', metric);
      }
    } catch (error) {
      console.error('Failed to track performance metric:', error);
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Helper functions for common metrics
export async function trackScreenLoadTime(screenName: string, duration: number): Promise<void> {
  await performanceMonitor.track({
    metric_name: 'screen_load_time',
    metric_value: duration,
    metric_unit: 'milliseconds',
    screen_name: screenName,
  });
}

export async function trackAPIResponseTime(endpoint: string, duration: number): Promise<void> {
  await performanceMonitor.track({
    metric_name: 'api_response_time',
    metric_value: duration,
    metric_unit: 'milliseconds',
    additional_data: { endpoint },
  });
}

export async function trackQueryPerformance(queryName: string, duration: number): Promise<void> {
  await performanceMonitor.track({
    metric_name: 'database_query_time',
    metric_value: duration,
    metric_unit: 'milliseconds',
    additional_data: { query: queryName },
  });
}

// ============================================================================
// USER BEHAVIOR ANALYTICS
// ============================================================================

export interface UserEvent {
  event_name: string;
  event_properties?: Record<string, any>;
  user_id?: string;
  session_id?: string;
  screen_name?: string;
}

export async function trackEvent(event: UserEvent): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      event.user_id = user.id;
    }

    await supabase.from('user_events').insert({
      ...event,
      created_at: new Date().toISOString(),
    });

    if (__DEV__) {
      console.log('Event tracked:', event);
    }
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

// Common event trackers
export async function trackScreenView(screenName: string): Promise<void> {
  await trackEvent({
    event_name: 'screen_view',
    screen_name: screenName,
  });
}

export async function trackButtonClick(buttonName: string, screenName?: string): Promise<void> {
  await trackEvent({
    event_name: 'button_click',
    screen_name: screenName,
    event_properties: { button: buttonName },
  });
}

export async function trackFeatureUsage(featureName: string, properties?: Record<string, any>): Promise<void> {
  await trackEvent({
    event_name: 'feature_usage',
    event_properties: { feature: featureName, ...properties },
  });
}

// ============================================================================
// HEALTH CHECKS
// ============================================================================

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time_ms?: number;
  error_message?: string;
  checked_at: string;
}

export async function checkSupabaseHealth(): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);

    if (error) throw error;

    return {
      service: 'supabase',
      status: 'healthy',
      response_time_ms: Date.now() - start,
      checked_at: new Date().toISOString(),
    };
  } catch (error) {
    return {
      service: 'supabase',
      status: 'down',
      response_time_ms: Date.now() - start,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      checked_at: new Date().toISOString(),
    };
  }
}

export async function checkStripeHealth(): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    const response = await fetch('https://api.stripe.com/v1/ping');

    if (!response.ok) throw new Error('Stripe API unhealthy');

    return {
      service: 'stripe',
      status: 'healthy',
      response_time_ms: Date.now() - start,
      checked_at: new Date().toISOString(),
    };
  } catch (error) {
    return {
      service: 'stripe',
      status: 'down',
      response_time_ms: Date.now() - start,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      checked_at: new Date().toISOString(),
    };
  }
}

export async function performHealthCheck(): Promise<HealthCheckResult[]> {
  const checks = await Promise.all([
    checkSupabaseHealth(),
    checkStripeHealth(),
  ]);

  return checks;
}

// ============================================================================
// ALERTING SYSTEM
// ============================================================================

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface Alert {
  title: string;
  message: string;
  severity: AlertSeverity;
  service?: string;
  metadata?: Record<string, any>;
}

export async function sendAlert(alert: Alert): Promise<void> {
  try {
    await supabase.from('system_alerts').insert({
      ...alert,
      created_at: new Date().toISOString(),
    });

    // In production, send to external alerting service
    if (!__DEV__) {
      // TODO: Integrate with PagerDuty, Sentry, or similar
      console.warn('ALERT:', alert);
    }
  } catch (error) {
    console.error('Failed to send alert:', error);
  }
}

// Alert when error rate is high
export async function checkErrorRate(): Promise<void> {
  try {
    const { count } = await supabase
      .from('error_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()); // Last hour

    if (count && count > 100) {
      await sendAlert({
        title: 'High Error Rate Detected',
        message: `${count} errors in the last hour`,
        severity: 'warning',
        service: 'app',
        metadata: { error_count: count },
      });
    }
  } catch (error) {
    console.error('Failed to check error rate:', error);
  }
}

// Alert when response time is slow
export async function checkResponseTime(): Promise<void> {
  try {
    const { data } = await supabase
      .from('performance_metrics')
      .select('metric_value')
      .eq('metric_name', 'api_response_time')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString())
      .order('metric_value', { ascending: false })
      .limit(10);

    if (data && data.length > 0) {
      const avgResponseTime = data.reduce((sum, m) => sum + m.metric_value, 0) / data.length;

      if (avgResponseTime > 1000) {
        await sendAlert({
          title: 'Slow API Response Time',
          message: `Average response time: ${avgResponseTime.toFixed(0)}ms`,
          severity: 'warning',
          service: 'api',
          metadata: { avg_response_time: avgResponseTime },
        });
      }
    }
  } catch (error) {
    console.error('Failed to check response time:', error);
  }
}

// ============================================================================
// REAL-TIME MONITORING DASHBOARD
// ============================================================================

export interface SystemMetrics {
  total_users: number;
  active_sessions: number;
  error_rate: number;
  avg_response_time: number;
  health_status: HealthCheckResult[];
}

export async function getSystemMetrics(): Promise<SystemMetrics> {
  try {
    const [
      usersResult,
      errorsResult,
      performanceResult,
      healthChecks,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase
        .from('error_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 3600000).toISOString()),
      supabase
        .from('performance_metrics')
        .select('metric_value')
        .eq('metric_name', 'api_response_time')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString()),
      performHealthCheck(),
    ]);

    const avgResponseTime = performanceResult.data && performanceResult.data.length > 0
      ? performanceResult.data.reduce((sum, m) => sum + m.metric_value, 0) / performanceResult.data.length
      : 0;

    return {
      total_users: usersResult.count || 0,
      active_sessions: 0, // TODO: Track active sessions
      error_rate: errorsResult.count || 0,
      avg_response_time: avgResponseTime,
      health_status: healthChecks,
    };
  } catch (error) {
    console.error('Failed to get system metrics:', error);
    throw error;
  }
}

// ============================================================================
// AUTOMATIC MONITORING
// ============================================================================

let monitoringInterval: NodeJS.Timeout | null = null;

export function startMonitoring(intervalMs: number = 300000): void {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }

  monitoringInterval = setInterval(async () => {
    await checkErrorRate();
    await checkResponseTime();
  }, intervalMs);
}

export function stopMonitoring(): void {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
}
