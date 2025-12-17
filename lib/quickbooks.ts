import { supabase } from './supabase';

export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed';
export type SyncDirection = 'to_quickbooks' | 'from_quickbooks' | 'bidirectional';
export type QBEntityType = 'customer' | 'invoice' | 'payment' | 'expense' | 'vendor' | 'item' | 'account';

export interface QuickBooksConnection {
  id: string;
  team_id: string;
  realm_id: string;
  company_name?: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  scopes: string[];
  is_active: boolean;
  last_sync_at?: string;
  sync_enabled: boolean;
  auto_sync_invoices: boolean;
  auto_sync_expenses: boolean;
  auto_sync_customers: boolean;
  sync_frequency_hours: number;
  connected_by?: string;
  disconnected_at?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
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

export interface EntityMapping {
  id: string;
  connection_id: string;
  entity_type: QBEntityType;
  local_id: string;
  quickbooks_id: string;
  sync_token?: string;
  last_synced_at: string;
  sync_status: SyncStatus;
  sync_error?: string;
  metadata?: any;
}

export interface SyncStats {
  entity_type: QBEntityType;
  total_syncs: number;
  successful_syncs: number;
  failed_syncs: number;
  total_entities: number;
  last_sync?: string;
}

// Connection Management
export async function getQuickBooksConnection(teamId: string): Promise<QuickBooksConnection | null> {
  try {
    const { data, error } = await supabase
      .from('quickbooks_connections')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting QuickBooks connection:', error);
    return null;
  }
}

export async function createQuickBooksConnection(
  teamId: string,
  connectionData: {
    realm_id: string;
    company_name?: string;
    access_token: string;
    refresh_token: string;
    token_expires_at: string;
    scopes: string[];
    connected_by: string;
  }
): Promise<QuickBooksConnection | null> {
  try {
    const { data, error } = await supabase
      .from('quickbooks_connections')
      .insert({
        team_id: teamId,
        ...connectionData,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating QuickBooks connection:', error);
    return null;
  }
}

export async function updateQuickBooksTokens(
  connectionId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('quickbooks_connections')
      .update({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
      })
      .eq('id', connectionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating QuickBooks tokens:', error);
    return false;
  }
}

export async function disconnectQuickBooks(teamId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('quickbooks_connections')
      .update({
        is_active: false,
        disconnected_at: new Date().toISOString(),
      })
      .eq('team_id', teamId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error disconnecting QuickBooks:', error);
    return false;
  }
}

export async function updateSyncSettings(
  teamId: string,
  settings: {
    sync_enabled?: boolean;
    auto_sync_invoices?: boolean;
    auto_sync_expenses?: boolean;
    auto_sync_customers?: boolean;
    sync_frequency_hours?: number;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('quickbooks_connections')
      .update(settings)
      .eq('team_id', teamId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating sync settings:', error);
    return false;
  }
}

// Token Management
export async function checkTokenNeedsRefresh(connectionId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('quickbooks_token_needs_refresh', {
      p_connection_id: connectionId,
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error checking token refresh:', error);
    return true; // Assume needs refresh on error
  }
}

// Entity Mapping
export async function getEntityMapping(
  connectionId: string,
  entityType: QBEntityType,
  localId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_quickbooks_mapping', {
      p_connection_id: connectionId,
      p_entity_type: entityType,
      p_local_id: localId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting entity mapping:', error);
    return null;
  }
}

export async function upsertEntityMapping(
  connectionId: string,
  entityType: QBEntityType,
  localId: string,
  quickbooksId: string,
  syncToken?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('upsert_quickbooks_mapping', {
      p_connection_id: connectionId,
      p_entity_type: entityType,
      p_local_id: localId,
      p_quickbooks_id: quickbooksId,
      p_sync_token: syncToken,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error upserting entity mapping:', error);
    return null;
  }
}

export async function getEntityMappings(
  connectionId: string,
  entityType?: QBEntityType
): Promise<EntityMapping[]> {
  try {
    let query = supabase
      .from('quickbooks_entity_map')
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
    console.error('Error getting entity mappings:', error);
    return [];
  }
}

// Sync Operations
export async function startSync(
  connectionId: string,
  entityType: QBEntityType,
  direction: SyncDirection
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('start_quickbooks_sync', {
      p_connection_id: connectionId,
      p_entity_type: entityType,
      p_direction: direction,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error starting sync:', error);
    return null;
  }
}

export async function completeSync(
  logId: string,
  status: SyncStatus,
  processed: number,
  succeeded: number,
  failed: number,
  errorMessage?: string,
  errorDetails?: any
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('complete_quickbooks_sync', {
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
    console.error('Error completing sync:', error);
    return false;
  }
}

export async function getSyncLogs(
  connectionId: string,
  options?: {
    limit?: number;
    entityType?: QBEntityType;
    status?: SyncStatus;
  }
): Promise<SyncLog[]> {
  try {
    let query = supabase
      .from('quickbooks_sync_log')
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
    console.error('Error getting sync logs:', error);
    return [];
  }
}

export async function getSyncStats(
  connectionId: string,
  days: number = 30
): Promise<SyncStats[]> {
  try {
    const { data, error } = await supabase.rpc('get_quickbooks_sync_stats', {
      p_connection_id: connectionId,
      p_days: days,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting sync stats:', error);
    return [];
  }
}

export async function canSyncToQuickBooks(teamId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('can_sync_to_quickbooks', {
      p_team_id: teamId,
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error checking sync eligibility:', error);
    return false;
  }
}

// QuickBooks API Helpers
export function buildQuickBooksAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const baseUrl = 'https://appcenter.intuit.com/connect/oauth2';
  const scopes = [
    'com.intuit.quickbooks.accounting',
    'com.intuit.quickbooks.payment',
  ].join(' ');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    state,
  });

  return `${baseUrl}?${params.toString()}`;
}

export function getQuickBooksApiUrl(realmId: string, isSandbox: boolean = false): string {
  const baseUrl = isSandbox
    ? 'https://sandbox-quickbooks.api.intuit.com'
    : 'https://quickbooks.api.intuit.com';
  return `${baseUrl}/v3/company/${realmId}`;
}

// Utility Functions
export function getEntityTypeLabel(type: QBEntityType): string {
  const labels: Record<QBEntityType, string> = {
    customer: 'Customer',
    invoice: 'Invoice',
    payment: 'Payment',
    expense: 'Expense',
    vendor: 'Vendor',
    item: 'Item',
    account: 'Account',
  };
  return labels[type];
}

export function getSyncStatusColor(status: SyncStatus): string {
  switch (status) {
    case 'completed':
      return '#10B981'; // green
    case 'syncing':
    case 'pending':
      return '#F59E0B'; // orange
    case 'failed':
      return '#EF4444'; // red
  }
}

export function getSyncStatusLabel(status: SyncStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatSyncDuration(seconds?: number): string {
  if (!seconds) return 'N/A';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) <= new Date();
}

export function isTokenExpiringSoon(expiresAt: string, hoursThreshold: number = 1): boolean {
  const threshold = new Date();
  threshold.setHours(threshold.getHours() + hoursThreshold);
  return new Date(expiresAt) <= threshold;
}

export function calculateSyncSuccessRate(succeeded: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((succeeded / total) * 100);
}

export function shouldAutoSync(connection: QuickBooksConnection): boolean {
  if (!connection.sync_enabled || !connection.is_active) {
    return false;
  }

  if (!connection.last_sync_at) {
    return true; // Never synced before
  }

  const lastSync = new Date(connection.last_sync_at);
  const nextSync = new Date(lastSync);
  nextSync.setHours(nextSync.getHours() + connection.sync_frequency_hours);

  return new Date() >= nextSync;
}

export function getNextSyncTime(connection: QuickBooksConnection): Date | null {
  if (!connection.last_sync_at) {
    return null;
  }

  const lastSync = new Date(connection.last_sync_at);
  const nextSync = new Date(lastSync);
  nextSync.setHours(nextSync.getHours() + connection.sync_frequency_hours);

  return nextSync;
}

export function formatQuickBooksDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function parseQuickBooksDate(dateString: string): Date {
  return new Date(dateString);
}

// Error Handling
export class QuickBooksError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'QuickBooksError';
  }
}

export function handleQuickBooksError(error: any): QuickBooksError {
  if (error.response?.data) {
    const qbError = error.response.data;
    return new QuickBooksError(
      qbError.message || 'QuickBooks API error',
      qbError.code,
      qbError
    );
  }

  return new QuickBooksError(
    error.message || 'Unknown QuickBooks error',
    undefined,
    error
  );
}
