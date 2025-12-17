import { supabase } from './supabase';

// Performance Metrics Types
export interface APIPerformanceSummary {
  endpoint: string;
  avg_response_time: number;
  max_response_time: number;
  total_requests: number;
  error_count: number;
  error_rate: number;
}

export interface SlowQuery {
  query_name: string;
  table_name: string;
  avg_execution_time: number;
  max_execution_time: number;
  occurrence_count: number;
}

export interface ErrorSummary {
  error_type: string;
  error_message: string;
  severity: string;
  occurrence_count: number;
  last_occurred: string;
  is_resolved: boolean;
}

export interface SystemHealthMetrics {
  metric_date: string;
  avg_api_response_time: number;
  max_api_response_time: number;
  total_api_requests: number;
  failed_api_requests: number;
  error_rate: number;
  avg_db_query_time: number;
  slow_queries_count: number;
  total_db_queries: number;
  system_uptime_percentage: number;
}

export interface PerformanceAlert {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  metric_value: number;
  threshold_value: number;
  endpoint?: string;
  is_acknowledged: boolean;
  resolved: boolean;
  created_at: string;
}

// Log API performance
export async function logAPIPerformance(
  endpoint: string,
  method: string,
  responseTimeMs: number,
  statusCode: number,
  errorMessage?: string
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.rpc('log_api_performance', {
      p_endpoint: endpoint,
      p_method: method,
      p_response_time_ms: responseTimeMs,
      p_status_code: statusCode,
      p_user_id: user?.id || null,
      p_error_message: errorMessage || null,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error logging API performance:', error);
    return false;
  }
}

// Log database query performance
export async function logQueryPerformance(
  queryName: string,
  tableName: string,
  operation: string,
  executionTimeMs: number,
  rowsAffected?: number
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('log_query_performance', {
      p_query_name: queryName,
      p_table_name: tableName,
      p_operation: operation,
      p_execution_time_ms: executionTimeMs,
      p_rows_affected: rowsAffected || null,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error logging query performance:', error);
    return false;
  }
}

// Log error
export async function logError(
  errorType: string,
  errorMessage: string,
  options: {
    errorStack?: string;
    endpoint?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  } = {}
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.rpc('log_error', {
      p_error_type: errorType,
      p_error_message: errorMessage,
      p_error_stack: options.errorStack || null,
      p_endpoint: options.endpoint || null,
      p_user_id: user?.id || null,
      p_severity: options.severity || 'medium',
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error logging error:', error);
    return false;
  }
}

// Get API performance summary
export async function getAPIPerformanceSummary(
  days: number = 7
): Promise<APIPerformanceSummary[]> {
  try {
    const { data, error } = await supabase.rpc('get_api_performance_summary', {
      p_days: days,
    });

    if (error) throw error;
    return (data || []) as APIPerformanceSummary[];
  } catch (error) {
    console.error('Error fetching API performance summary:', error);
    return [];
  }
}

// Get slow queries
export async function getSlowQueries(days: number = 7): Promise<SlowQuery[]> {
  try {
    const { data, error } = await supabase.rpc('get_slow_queries', {
      p_days: days,
    });

    if (error) throw error;
    return (data || []) as SlowQuery[];
  } catch (error) {
    console.error('Error fetching slow queries:', error);
    return [];
  }
}

// Get error summary
export async function getErrorSummary(days: number = 7): Promise<ErrorSummary[]> {
  try {
    const { data, error } = await supabase.rpc('get_error_summary', {
      p_days: days,
    });

    if (error) throw error;
    return (data || []) as ErrorSummary[];
  } catch (error) {
    console.error('Error fetching error summary:', error);
    return [];
  }
}

// Get system health metrics
export async function getSystemHealthMetrics(
  days: number = 30
): Promise<SystemHealthMetrics[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('system_health_metrics')
      .select('*')
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .order('metric_date', { ascending: true });

    if (error) throw error;
    return (data || []) as SystemHealthMetrics[];
  } catch (error) {
    console.error('Error fetching system health metrics:', error);
    return [];
  }
}

// Get performance alerts
export async function getPerformanceAlerts(
  onlyUnresolved: boolean = true
): Promise<PerformanceAlert[]> {
  try {
    let query = supabase.from('performance_alerts').select('*').order('created_at', {
      ascending: false,
    });

    if (onlyUnresolved) {
      query = query.eq('resolved', false);
    }

    const { data, error } = await query.limit(50);

    if (error) throw error;
    return (data || []) as PerformanceAlert[];
  } catch (error) {
    console.error('Error fetching performance alerts:', error);
    return [];
  }
}

// Acknowledge alert
export async function acknowledgeAlert(alertId: string): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('performance_alerts')
      .update({
        is_acknowledged: true,
        acknowledged_by: user.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return false;
  }
}

// Resolve alert
export async function resolveAlert(alertId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('performance_alerts')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error resolving alert:', error);
    return false;
  }
}

// Resolve error
export async function resolveError(errorId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('error_tracking')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', errorId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error resolving error:', error);
    return false;
  }
}

// Performance monitoring helper
export class PerformanceMonitor {
  private startTime: number;
  private endpoint: string;
  private method: string;

  constructor(endpoint: string, method: string = 'GET') {
    this.endpoint = endpoint;
    this.method = method;
    this.startTime = Date.now();
  }

  async finish(statusCode: number, errorMessage?: string): Promise<void> {
    const responseTime = Date.now() - this.startTime;
    await logAPIPerformance(this.endpoint, this.method, responseTime, statusCode, errorMessage);
  }
}

// Query performance monitor helper
export class QueryMonitor {
  private startTime: number;
  private queryName: string;
  private tableName: string;
  private operation: string;

  constructor(queryName: string, tableName: string, operation: string) {
    this.queryName = queryName;
    this.tableName = tableName;
    this.operation = operation;
    this.startTime = Date.now();
  }

  async finish(rowsAffected?: number): Promise<void> {
    const executionTime = Date.now() - this.startTime;
    await logQueryPerformance(
      this.queryName,
      this.tableName,
      this.operation,
      executionTime,
      rowsAffected
    );
  }
}

// Calculate performance metrics summary
export async function getPerformanceMetricsSummary(days: number = 7) {
  try {
    const [apiSummary, slowQueries, errors, healthMetrics] = await Promise.all([
      getAPIPerformanceSummary(days),
      getSlowQueries(days),
      getErrorSummary(days),
      getSystemHealthMetrics(days),
    ]);

    const totalRequests = apiSummary.reduce((sum, api) => sum + api.total_requests, 0);
    const totalErrors = apiSummary.reduce((sum, api) => sum + api.error_count, 0);
    const avgResponseTime =
      apiSummary.length > 0
        ? apiSummary.reduce((sum, api) => sum + api.avg_response_time, 0) / apiSummary.length
        : 0;

    const unresolvedErrors = errors.filter((e) => !e.is_resolved).length;
    const criticalErrors = errors.filter((e) => e.severity === 'critical').length;

    const latestHealth = healthMetrics[healthMetrics.length - 1];

    return {
      totalRequests,
      totalErrors,
      avgResponseTime: avgResponseTime.toFixed(2),
      errorRate: totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : '0',
      slowQueriesCount: slowQueries.length,
      unresolvedErrors,
      criticalErrors,
      systemUptime: latestHealth?.system_uptime_percentage || 100,
    };
  } catch (error) {
    console.error('Error calculating performance summary:', error);
    return {
      totalRequests: 0,
      totalErrors: 0,
      avgResponseTime: '0',
      errorRate: '0',
      slowQueriesCount: 0,
      unresolvedErrors: 0,
      criticalErrors: 0,
      systemUptime: 100,
    };
  }
}

// Format response time
export function formatResponseTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Get severity color
export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    low: '#34C759',
    medium: '#FF9500',
    high: '#FF3B30',
    critical: '#8B0000',
    warning: '#FF9500',
    error: '#FF3B30',
  };
  return colors[severity] || '#8E8E93';
}

// Get alert type label
export function getAlertTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    slow_api: 'Slow API',
    high_error_rate: 'High Error Rate',
    slow_query: 'Slow Query',
    high_memory: 'High Memory Usage',
    system_down: 'System Down',
    database_connection: 'Database Connection Issue',
  };
  return labels[type] || type;
}
