import { supabase } from './supabase';
import type { SyncStatus, SyncDirection, QBEntityType } from './quickbooks';

export interface XeroConnection {
  id: string;
  team_id: string;
  tenant_id: string;
  tenant_name?: string;
  tenant_type?: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  id_token?: string;
  scopes: string[];
  is_active: boolean;
  last_sync_at?: string;
  sync_enabled: boolean;
  auto_sync_invoices: boolean;
  auto_sync_expenses: boolean;
  auto_sync_contacts: boolean;
  auto_sync_payments: boolean;
  sync_frequency_hours: number;
  connected_by?: string;
  disconnected_at?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface XeroSyncLog {
  id: string;
  connection_id: string;
  entity_type: QBEntityType;
  direction: SyncDirection;
  status: SyncStatus;
  entities_processed: number;
  entities_succeeded: number;
  entities_failed: number;
  error_message?: string;
  error_details?: any;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  metadata?: any;
}

export interface XeroEntityMapping {
  id: string;
  connection_id: string;
  entity_type: QBEntityType;
  local_id: string;
  xero_id: string;
  updated_date_utc?: string;
  last_synced_at: string;
  sync_status: SyncStatus;
  sync_error?: string;
  metadata?: any;
}

export interface XeroSyncStats {
  entity_type: QBEntityType;
  total_syncs: number;
  successful_syncs: number;
  failed_syncs: number;
  total_entities: number;
  last_sync?: string;
}

// Connection Management
export async function getXeroConnection(teamId: string): Promise<XeroConnection | null> {
  try {
    const { data, error } = await supabase
      .from('xero_connections')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting Xero connection:', error);
    return null;
  }
}

export async function createXeroConnection(
  teamId: string,
  connectionData: {
    tenant_id: string;
    tenant_name?: string;
    tenant_type?: string;
    access_token: string;
    refresh_token: string;
    token_expires_at: string;
    id_token?: string;
    scopes: string[];
    connected_by: string;
  }
): Promise<XeroConnection | null> {
  try {
    const { data, error } = await supabase
      .from('xero_connections')
      .insert({
        team_id: teamId,
        ...connectionData,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating Xero connection:', error);
    return null;
  }
}

export async function updateXeroTokens(
  connectionId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('xero_connections')
      .update({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
      })
      .eq('id', connectionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating Xero tokens:', error);
    return false;
  }
}

export async function disconnectXero(teamId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('xero_connections')
      .update({
        is_active: false,
        disconnected_at: new Date().toISOString(),
      })
      .eq('team_id', teamId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error disconnecting Xero:', error);
    return false;
  }
}

export async function updateXeroSyncSettings(
  teamId: string,
  settings: {
    sync_enabled?: boolean;
    auto_sync_invoices?: boolean;
    auto_sync_expenses?: boolean;
    auto_sync_contacts?: boolean;
    auto_sync_payments?: boolean;
    sync_frequency_hours?: number;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('xero_connections')
      .update(settings)
      .eq('team_id', teamId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating Xero sync settings:', error);
    return false;
  }
}

// Token Management
export async function checkXeroTokenNeedsRefresh(connectionId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('xero_token_needs_refresh', {
      p_connection_id: connectionId,
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error checking Xero token refresh:', error);
    return true;
  }
}

// Entity Mapping
export async function getXeroEntityMapping(
  connectionId: string,
  entityType: QBEntityType,
  localId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_xero_mapping', {
      p_connection_id: connectionId,
      p_entity_type: entityType,
      p_local_id: localId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting Xero entity mapping:', error);
    return null;
  }
}

export async function upsertXeroEntityMapping(
  connectionId: string,
  entityType: QBEntityType,
  localId: string,
  xeroId: string,
  updatedDateUtc?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('upsert_xero_mapping', {
      p_connection_id: connectionId,
      p_entity_type: entityType,
      p_local_id: localId,
      p_xero_id: xeroId,
      p_updated_date_utc: updatedDateUtc,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error upserting Xero entity mapping:', error);
    return null;
  }
}

export async function getXeroEntityMappings(
  connectionId: string,
  entityType?: QBEntityType
): Promise<XeroEntityMapping[]> {
  try {
    let query = supabase
      .from('xero_entity_map')
      .select('*')
      .eq('connection_id', connectionId)
      .order('last_synced_at', { ascending: false });

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting Xero entity mappings:', error);
    return [];
  }
}

// Sync Operations
export async function startXeroSync(
  connectionId: string,
  entityType: QBEntityType,
  direction: SyncDirection
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('start_xero_sync', {
      p_connection_id: connectionId,
      p_entity_type: entityType,
      p_direction: direction,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error starting Xero sync:', error);
    return null;
  }
}

export async function completeXeroSync(
  logId: string,
  status: SyncStatus,
  processed: number,
  succeeded: number,
  failed: number,
  errorMessage?: string,
  errorDetails?: any
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('complete_xero_sync', {
      p_log_id: logId,
      p_status: status,
      p_processed: processed,
      p_succeeded: succeeded,
      p_failed: failed,
      p_error_message: errorMessage,
      p_error_details: errorDetails,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error completing Xero sync:', error);
    return false;
  }
}

export async function getXeroSyncLogs(
  connectionId: string,
  options?: {
    limit?: number;
    entityType?: QBEntityType;
    status?: SyncStatus;
  }
): Promise<XeroSyncLog[]> {
  try {
    let query = supabase
      .from('xero_sync_log')
      .select('*')
      .eq('connection_id', connectionId)
      .order('started_at', { ascending: false });

    if (options?.entityType) {
      query = query.eq('entity_type', options.entityType);
    }

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting Xero sync logs:', error);
    return [];
  }
}

export async function getXeroSyncStats(
  connectionId: string,
  days: number = 30
): Promise<XeroSyncStats[]> {
  try {
    const { data, error } = await supabase.rpc('get_xero_sync_stats', {
      p_connection_id: connectionId,
      p_days: days,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting Xero sync stats:', error);
    return [];
  }
}

export async function canSyncToXero(teamId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('can_sync_to_xero', {
      p_team_id: teamId,
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error checking Xero sync eligibility:', error);
    return false;
  }
}

// Xero API Helpers
export function buildXeroAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string,
  codeChallenge: string
): string {
  const baseUrl = 'https://login.xero.com/identity/connect/authorize';
  const scopes = [
    'offline_access',
    'openid',
    'profile',
    'email',
    'accounting.transactions',
    'accounting.contacts',
    'accounting.settings',
  ].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${baseUrl}?${params.toString()}`;
}

export function getXeroApiUrl(): string {
  return 'https://api.xero.com/api.xro/2.0';
}

// PKCE Helper Functions
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

function base64UrlEncode(array: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...array));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Utility Functions
export function getTenantTypeLabel(type?: string): string {
  if (!type) return 'Unknown';
  const types: Record<string, string> = {
    ORGANISATION: 'Organisation',
    PRACTICE: 'Practice',
    COMPANY: 'Company',
  };
  return types[type] || type;
}

export function isXeroTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) <= new Date();
}

export function isXeroTokenExpiringSoon(expiresAt: string, minutesThreshold: number = 5): boolean {
  const threshold = new Date();
  threshold.setMinutes(threshold.getMinutes() + minutesThreshold);
  return new Date(expiresAt) <= threshold;
}

export function shouldAutoSyncXero(connection: XeroConnection): boolean {
  if (!connection.sync_enabled || !connection.is_active) {
    return false;
  }

  if (!connection.last_sync_at) {
    return true;
  }

  const lastSync = new Date(connection.last_sync_at);
  const nextSync = new Date(lastSync);
  nextSync.setHours(nextSync.getHours() + connection.sync_frequency_hours);

  return new Date() >= nextSync;
}

export function getXeroNextSyncTime(connection: XeroConnection): Date | null {
  if (!connection.last_sync_at) {
    return null;
  }

  const lastSync = new Date(connection.last_sync_at);
  const nextSync = new Date(lastSync);
  nextSync.setHours(nextSync.getHours() + connection.sync_frequency_hours);

  return nextSync;
}

export function formatXeroDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function parseXeroDate(dateString: string): Date {
  return new Date(dateString);
}

// Error Handling
export class XeroError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'XeroError';
  }
}

export function handleXeroError(error: any): XeroError {
  if (error.response?.data) {
    const xeroError = error.response.data;
    const message = xeroError.Detail || xeroError.Message || 'Xero API error';
    return new XeroError(message, xeroError.ErrorNumber, xeroError);
  }

  return new XeroError(
    error.message || 'Unknown Xero error',
    undefined,
    error
  );
}

export function calculateXeroSyncSuccessRate(succeeded: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((succeeded / total) * 100);
}
