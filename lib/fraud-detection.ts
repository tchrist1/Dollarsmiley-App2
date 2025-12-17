import { supabase } from './supabase';

export type FraudRuleType = 'Transaction' | 'User' | 'Booking' | 'Payment' | 'Behavior';
export type FraudAction = 'Flag' | 'Block' | 'Review' | 'Alert';
export type AlertType = 'Suspicious' | 'HighRisk' | 'Fraud' | 'FalsePositive';
export type AlertSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type AlertStatus = 'Open' | 'UnderReview' | 'Resolved' | 'FalsePositive' | 'Confirmed';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type BlacklistType = 'Email' | 'Phone' | 'IP' | 'Device' | 'Card' | 'Address';
export type PatternType = 'Login' | 'Transaction' | 'Booking' | 'Navigation';
export type VelocityCheckType = 'LoginAttempts' | 'Transactions' | 'Bookings' | 'Messages';

export interface FraudRule {
  id: string;
  name: string;
  description: string | null;
  rule_type: FraudRuleType;
  condition: Record<string, any>;
  risk_score: number;
  action: FraudAction;
  is_active: boolean;
  priority: number;
  false_positive_rate: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FraudAlert {
  id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  user_id: string | null;
  entity_type: string;
  entity_id: string;
  risk_score: number;
  triggered_rules: any[];
  status: AlertStatus;
  details: Record<string, any>;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_notes: string | null;
  created_at: string;
}

export interface FraudUserProfile {
  id: string;
  user_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  total_flags: number;
  confirmed_fraud_count: number;
  false_positive_count: number;
  last_flag_date: string | null;
  account_age_days: number;
  total_transactions: number;
  total_transaction_volume: number;
  failed_payment_count: number;
  chargeback_count: number;
  velocity_score: number;
  behavioral_score: number;
  trust_score: number;
  is_blocked: boolean;
  blocked_reason: string | null;
  blocked_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BehavioralPattern {
  id: string;
  user_id: string;
  pattern_type: PatternType;
  pattern_data: Record<string, any>;
  anomaly_score: number;
  is_anomaly: boolean;
  detected_at: string;
}

export interface DeviceFingerprint {
  id: string;
  fingerprint_hash: string;
  user_id: string | null;
  device_info: Record<string, any>;
  ip_address: string | null;
  geolocation: Record<string, any>;
  is_suspicious: boolean;
  risk_factors: string[];
  first_seen: string;
  last_seen: string;
  usage_count: number;
}

export interface Blacklist {
  id: string;
  list_type: BlacklistType;
  value: string;
  reason: string | null;
  severity: AlertSeverity;
  source: string;
  expires_at: string | null;
  added_by: string | null;
  is_active: boolean;
  created_at: string;
}

/**
 * Get all fraud rules
 */
export async function getFraudRules(): Promise<FraudRule[]> {
  try {
    const { data, error } = await supabase
      .from('fraud_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching fraud rules:', error);
    return [];
  }
}

/**
 * Get user fraud profile
 */
export async function getUserFraudProfile(userId: string): Promise<FraudUserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('fraud_user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching fraud profile:', error);
    return null;
  }
}

/**
 * Create or update fraud profile
 */
export async function ensureFraudProfile(userId: string): Promise<FraudUserProfile | null> {
  try {
    let profile = await getUserFraudProfile(userId);

    if (!profile) {
      const { data, error } = await supabase
        .from('fraud_user_profiles')
        .insert([{ user_id: userId }])
        .select()
        .single();

      if (error) throw error;
      profile = data;
    }

    return profile;
  } catch (error) {
    console.error('Error ensuring fraud profile:', error);
    return null;
  }
}

/**
 * Get fraud alerts
 */
export async function getFraudAlerts(
  filters?: {
    status?: AlertStatus;
    severity?: AlertSeverity;
    userId?: string;
  }
): Promise<FraudAlert[]> {
  try {
    let query = supabase
      .from('fraud_alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching fraud alerts:', error);
    return [];
  }
}

/**
 * Create fraud alert
 */
export async function createFraudAlert(
  alertType: AlertType,
  severity: AlertSeverity,
  userId: string,
  entityType: string,
  entityId: string,
  riskScore: number,
  triggeredRules?: any[],
  details?: Record<string, any>
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_fraud_alert', {
      alert_type_param: alertType,
      severity_param: severity,
      user_id_param: userId,
      entity_type_param: entityType,
      entity_id_param: entityId,
      risk_score_param: riskScore,
      triggered_rules_param: triggeredRules || [],
      details_param: details || {},
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating fraud alert:', error);
    return null;
  }
}

/**
 * Update alert status
 */
export async function updateAlertStatus(
  alertId: string,
  status: AlertStatus,
  reviewerId: string,
  notes?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('fraud_alerts')
      .update({
        status,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        resolution_notes: notes,
      })
      .eq('id', alertId);

    if (error) throw error;

    if (status === 'FalsePositive') {
      const alert = await getAlertById(alertId);
      if (alert?.user_id) {
        await adjustUserRiskScore(alert.user_id, -alert.risk_score);
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating alert status:', error);
    return false;
  }
}

/**
 * Get alert by ID
 */
export async function getAlertById(alertId: string): Promise<FraudAlert | null> {
  try {
    const { data, error } = await supabase
      .from('fraud_alerts')
      .select('*')
      .eq('id', alertId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching alert:', error);
    return null;
  }
}

/**
 * Update user risk score
 */
export async function adjustUserRiskScore(
  userId: string,
  scoreDelta: number,
  incrementFlags: boolean = false
): Promise<boolean> {
  try {
    await ensureFraudProfile(userId);

    const { error } = await supabase.rpc('update_user_risk_profile', {
      user_id_param: userId,
      score_delta: scoreDelta,
      increment_flags: incrementFlags,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating risk score:', error);
    return false;
  }
}

/**
 * Check blacklist
 */
export async function checkBlacklist(
  listType: BlacklistType,
  value: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_blacklist', {
      list_type_param: listType,
      value_param: value,
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error checking blacklist:', error);
    return false;
  }
}

/**
 * Add to blacklist
 */
export async function addToBlacklist(
  listType: BlacklistType,
  value: string,
  reason: string,
  severity: AlertSeverity,
  expiresAt?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from('fraud_blacklists').insert([
      {
        list_type: listType,
        value,
        reason,
        severity,
        expires_at: expiresAt || null,
      },
    ]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding to blacklist:', error);
    return false;
  }
}

/**
 * Check velocity limit
 */
export async function checkVelocity(
  userId: string,
  checkType: VelocityCheckType,
  timeWindow: '1min' | '5min' | '1hour' | '1day',
  threshold: number
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_velocity', {
      user_id_param: userId,
      check_type_param: checkType,
      time_window_param: timeWindow,
      threshold_param: threshold,
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error checking velocity:', error);
    return false;
  }
}

/**
 * Record device fingerprint
 */
export async function recordDeviceFingerprint(
  fingerprintHash: string,
  userId: string,
  deviceInfo: Record<string, any>,
  ipAddress: string,
  geolocation?: Record<string, any>
): Promise<boolean> {
  try {
    const { data: existing } = await supabase
      .from('fraud_device_fingerprints')
      .select('*')
      .eq('fingerprint_hash', fingerprintHash)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('fraud_device_fingerprints')
        .update({
          last_seen: new Date().toISOString(),
          usage_count: existing.usage_count + 1,
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('fraud_device_fingerprints').insert([
        {
          fingerprint_hash: fingerprintHash,
          user_id: userId,
          device_info: deviceInfo,
          ip_address: ipAddress,
          geolocation: geolocation || {},
        },
      ]);
    }

    return true;
  } catch (error) {
    console.error('Error recording device fingerprint:', error);
    return false;
  }
}

/**
 * Get fraud statistics
 */
export async function getFraudStatistics(): Promise<{
  totalAlerts: number;
  openAlerts: number;
  confirmedFraud: number;
  falsePositives: number;
  highRiskUsers: number;
  blockedUsers: number;
} | null> {
  try {
    const [alerts, profiles] = await Promise.all([
      supabase.from('fraud_alerts').select('status, alert_type'),
      supabase.from('fraud_user_profiles').select('risk_level, is_blocked'),
    ]);

    const alertData = alerts.data || [];
    const profileData = profiles.data || [];

    return {
      totalAlerts: alertData.length,
      openAlerts: alertData.filter((a) => a.status === 'Open').length,
      confirmedFraud: alertData.filter((a) => a.status === 'Confirmed').length,
      falsePositives: alertData.filter((a) => a.status === 'FalsePositive').length,
      highRiskUsers: profileData.filter(
        (p) => p.risk_level === 'High' || p.risk_level === 'Critical'
      ).length,
      blockedUsers: profileData.filter((p) => p.is_blocked).length,
    };
  } catch (error) {
    console.error('Error fetching fraud statistics:', error);
    return null;
  }
}

/**
 * Get risk level display
 */
export function getRiskLevelDisplay(riskLevel: RiskLevel): {
  label: string;
  color: string;
} {
  const displays: Record<RiskLevel, { label: string; color: string }> = {
    Low: { label: 'Low Risk', color: '#10B981' },
    Medium: { label: 'Medium Risk', color: '#F59E0B' },
    High: { label: 'High Risk', color: '#EF4444' },
    Critical: { label: 'Critical Risk', color: '#7C3AED' },
  };
  return displays[riskLevel];
}

/**
 * Get alert severity display
 */
export function getAlertSeverityDisplay(severity: AlertSeverity): {
  label: string;
  color: string;
} {
  const displays: Record<AlertSeverity, { label: string; color: string }> = {
    Low: { label: 'Low', color: '#6B7280' },
    Medium: { label: 'Medium', color: '#F59E0B' },
    High: { label: 'High', color: '#EF4444' },
    Critical: { label: 'Critical', color: '#7C3AED' },
  };
  return displays[severity];
}

/**
 * Format risk score
 */
export function formatRiskScore(score: number): string {
  return `${score}/1000`;
}

/**
 * Calculate trust score color
 */
export function getTrustScoreColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#F59E0B';
  if (score >= 40) return '#EF4444';
  return '#7C3AED';
}

/**
 * Validate fraud rule condition
 */
export function validateRuleCondition(condition: Record<string, any>): boolean {
  if (!condition || typeof condition !== 'object') {
    return false;
  }
  return Object.keys(condition).length > 0;
}

/**
 * Check if user is blocked
 */
export async function isUserBlocked(userId: string): Promise<boolean> {
  const profile = await getUserFraudProfile(userId);
  return profile?.is_blocked || false;
}

/**
 * Block user
 */
export async function blockUser(
  userId: string,
  reason: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('fraud_user_profiles')
      .update({
        is_blocked: true,
        blocked_reason: reason,
        blocked_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error blocking user:', error);
    return false;
  }
}

/**
 * Unblock user
 */
export async function unblockUser(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('fraud_user_profiles')
      .update({
        is_blocked: false,
        blocked_reason: null,
        blocked_at: null,
      })
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error unblocking user:', error);
    return false;
  }
}
