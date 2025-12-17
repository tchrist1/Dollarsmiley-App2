import { supabase } from './supabase';

export type ExperimentStatus = 'Draft' | 'Running' | 'Paused' | 'Completed' | 'Cancelled';
export type ExperimentType = 'UI' | 'Pricing' | 'Email' | 'Content' | 'Feature';
export type TargetMetric = 'Conversion' | 'CTR' | 'Revenue' | 'Engagement' | 'Retention';
export type EventType = 'View' | 'Click' | 'Conversion' | 'Purchase' | 'Signup';

export interface ABExperiment {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  hypothesis: string | null;
  experiment_type: ExperimentType;
  target_metric: TargetMetric;
  status: ExperimentStatus;
  traffic_allocation: number;
  start_date: string | null;
  end_date: string | null;
  min_sample_size: number;
  confidence_level: number;
  winning_variant_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ABVariant {
  id: string;
  experiment_id: string;
  name: string;
  description: string | null;
  configuration: Record<string, any>;
  traffic_weight: number;
  is_control: boolean;
  created_at: string;
}

export interface ABParticipant {
  id: string;
  experiment_id: string;
  variant_id: string;
  user_id: string | null;
  session_id: string | null;
  assigned_at: string;
  first_exposure_at: string | null;
  last_exposure_at: string | null;
  exposure_count: number;
}

export interface ABEvent {
  id: string;
  experiment_id: string;
  variant_id: string;
  participant_id: string | null;
  user_id: string | null;
  event_type: EventType;
  event_name: string;
  event_value: number | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ABMetrics {
  id: string;
  experiment_id: string;
  variant_id: string;
  metric_date: string;
  participants_count: number;
  unique_users: number;
  impressions: number;
  conversions: number;
  conversion_rate: number;
  revenue: number;
  avg_revenue_per_user: number;
  bounce_rate: number;
  avg_time_on_page: number;
  calculated_at: string;
}

export interface StatisticalResult {
  id: string;
  experiment_id: string;
  control_variant_id: string;
  treatment_variant_id: string;
  metric_name: string;
  control_value: number;
  treatment_value: number;
  lift: number;
  p_value: number;
  confidence_level: number;
  is_significant: boolean;
  sample_size_control: number;
  sample_size_treatment: number;
  calculated_at: string;
}

/**
 * Get all experiments
 */
export async function getExperiments(): Promise<ABExperiment[]> {
  try {
    const { data, error } = await supabase
      .from('ab_experiments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching experiments:', error);
    return [];
  }
}

/**
 * Get experiment by ID
 */
export async function getExperimentById(experimentId: string): Promise<ABExperiment | null> {
  try {
    const { data, error } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('id', experimentId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching experiment:', error);
    return null;
  }
}

/**
 * Get running experiments
 */
export async function getRunningExperiments(): Promise<ABExperiment[]> {
  try {
    const { data, error } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('status', 'Running')
      .lte('start_date', new Date().toISOString())
      .or(`end_date.is.null,end_date.gt.${new Date().toISOString()}`);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching running experiments:', error);
    return [];
  }
}

/**
 * Create experiment
 */
export async function createExperiment(
  experiment: Omit<ABExperiment, 'id' | 'created_at' | 'updated_at'>
): Promise<ABExperiment | null> {
  try {
    const { data, error } = await supabase
      .from('ab_experiments')
      .insert([experiment])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating experiment:', error);
    return null;
  }
}

/**
 * Update experiment
 */
export async function updateExperiment(
  experimentId: string,
  updates: Partial<ABExperiment>
): Promise<ABExperiment | null> {
  try {
    const { data, error } = await supabase
      .from('ab_experiments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', experimentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating experiment:', error);
    return null;
  }
}

/**
 * Get variants for experiment
 */
export async function getExperimentVariants(experimentId: string): Promise<ABVariant[]> {
  try {
    const { data, error } = await supabase
      .from('ab_variants')
      .select('*')
      .eq('experiment_id', experimentId)
      .order('is_control', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching variants:', error);
    return [];
  }
}

/**
 * Create variant
 */
export async function createVariant(
  variant: Omit<ABVariant, 'id' | 'created_at'>
): Promise<ABVariant | null> {
  try {
    const { data, error } = await supabase
      .from('ab_variants')
      .insert([variant])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating variant:', error);
    return null;
  }
}

/**
 * Assign user to variant
 */
export async function assignToVariant(
  experimentId: string,
  userId?: string,
  sessionId?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('assign_to_variant', {
      experiment_id_param: experimentId,
      user_id_param: userId || null,
      session_id_param: sessionId || null,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error assigning to variant:', error);
    return null;
  }
}

/**
 * Track experiment event
 */
export async function trackExperimentEvent(
  experimentId: string,
  variantId: string,
  eventType: EventType,
  eventName: string,
  userId?: string,
  sessionId?: string,
  eventValue?: number,
  metadata?: Record<string, any>
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('track_experiment_event', {
      experiment_id_param: experimentId,
      variant_id_param: variantId,
      user_id_param: userId || null,
      session_id_param: sessionId || null,
      event_type_param: eventType,
      event_name_param: eventName,
      event_value_param: eventValue || null,
      metadata_param: metadata || {},
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error tracking event:', error);
    return false;
  }
}

/**
 * Get experiment metrics
 */
export async function getExperimentMetrics(
  experimentId: string
): Promise<ABMetrics[]> {
  try {
    const { data, error } = await supabase
      .from('ab_metrics')
      .select('*')
      .eq('experiment_id', experimentId)
      .order('metric_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return [];
  }
}

/**
 * Calculate experiment metrics
 */
export async function calculateExperimentMetrics(
  experimentId: string,
  metricDate?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('calculate_experiment_metrics', {
      experiment_id_param: experimentId,
      metric_date_param: metricDate || new Date().toISOString().split('T')[0],
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error calculating metrics:', error);
    return false;
  }
}

/**
 * Get statistical results
 */
export async function getStatisticalResults(
  experimentId: string
): Promise<StatisticalResult[]> {
  try {
    const { data, error } = await supabase
      .from('ab_statistical_results')
      .select('*')
      .eq('experiment_id', experimentId)
      .order('calculated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching statistical results:', error);
    return [];
  }
}

/**
 * Get experiment summary
 */
export async function getExperimentSummary(experimentId: string): Promise<{
  experiment: ABExperiment;
  variants: ABVariant[];
  metrics: ABMetrics[];
  totalParticipants: number;
} | null> {
  try {
    const [experiment, variants, metrics] = await Promise.all([
      getExperimentById(experimentId),
      getExperimentVariants(experimentId),
      getExperimentMetrics(experimentId),
    ]);

    if (!experiment) return null;

    const totalParticipants = metrics.reduce(
      (sum, m) => sum + m.participants_count,
      0
    );

    return {
      experiment,
      variants,
      metrics,
      totalParticipants,
    };
  } catch (error) {
    console.error('Error fetching experiment summary:', error);
    return null;
  }
}

/**
 * Calculate statistical significance
 */
export function calculateStatisticalSignificance(
  controlConversions: number,
  controlSampleSize: number,
  treatmentConversions: number,
  treatmentSampleSize: number
): {
  lift: number;
  pValue: number;
  isSignificant: boolean;
  confidenceLevel: number;
} {
  const controlRate = controlConversions / controlSampleSize;
  const treatmentRate = treatmentConversions / treatmentSampleSize;

  const lift = ((treatmentRate - controlRate) / controlRate) * 100;

  const pooledRate =
    (controlConversions + treatmentConversions) /
    (controlSampleSize + treatmentSampleSize);

  const standardError = Math.sqrt(
    pooledRate *
      (1 - pooledRate) *
      (1 / controlSampleSize + 1 / treatmentSampleSize)
  );

  const zScore = (treatmentRate - controlRate) / standardError;

  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));

  const isSignificant = pValue < 0.05;
  const confidenceLevel = (1 - pValue) * 100;

  return {
    lift: isNaN(lift) ? 0 : lift,
    pValue: isNaN(pValue) ? 1 : pValue,
    isSignificant,
    confidenceLevel: isNaN(confidenceLevel) ? 0 : confidenceLevel,
  };
}

function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

/**
 * Get experiment status display
 */
export function getExperimentStatusDisplay(status: ExperimentStatus): {
  label: string;
  color: string;
} {
  const displays: Record<
    ExperimentStatus,
    { label: string; color: string }
  > = {
    Draft: { label: 'Draft', color: '#6B7280' },
    Running: { label: 'Running', color: '#10B981' },
    Paused: { label: 'Paused', color: '#F59E0B' },
    Completed: { label: 'Completed', color: '#3B82F6' },
    Cancelled: { label: 'Cancelled', color: '#EF4444' },
  };
  return displays[status];
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format currency
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

/**
 * Validate traffic weights sum to 100
 */
export function validateTrafficWeights(variants: Pick<ABVariant, 'traffic_weight'>[]): boolean {
  const sum = variants.reduce((total, v) => total + v.traffic_weight, 0);
  return Math.abs(sum - 100) < 0.01;
}

/**
 * Get experiment type options
 */
export function getExperimentTypeOptions(): Array<{
  value: ExperimentType;
  label: string;
}> {
  return [
    { value: 'UI', label: 'UI/Design' },
    { value: 'Pricing', label: 'Pricing' },
    { value: 'Email', label: 'Email' },
    { value: 'Content', label: 'Content' },
    { value: 'Feature', label: 'Feature' },
  ];
}

/**
 * Get target metric options
 */
export function getTargetMetricOptions(): Array<{
  value: TargetMetric;
  label: string;
}> {
  return [
    { value: 'Conversion', label: 'Conversion Rate' },
    { value: 'CTR', label: 'Click-Through Rate' },
    { value: 'Revenue', label: 'Revenue' },
    { value: 'Engagement', label: 'Engagement' },
    { value: 'Retention', label: 'Retention' },
  ];
}

/**
 * Check if experiment can be started
 */
export function canStartExperiment(
  experiment: ABExperiment,
  variants: ABVariant[]
): { canStart: boolean; reason?: string } {
  if (variants.length < 2) {
    return { canStart: false, reason: 'At least 2 variants required' };
  }

  const hasControl = variants.some((v) => v.is_control);
  if (!hasControl) {
    return { canStart: false, reason: 'Must have a control variant' };
  }

  if (!validateTrafficWeights(variants)) {
    return { canStart: false, reason: 'Traffic weights must sum to 100%' };
  }

  return { canStart: true };
}

/**
 * Check if experiment has sufficient data
 */
export function hasSufficientData(
  experiment: ABExperiment,
  totalParticipants: number
): boolean {
  return totalParticipants >= experiment.min_sample_size;
}
