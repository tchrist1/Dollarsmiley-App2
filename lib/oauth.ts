import { supabase } from './supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

export type OAuthProvider = 'google' | 'apple' | 'facebook' | 'github' | 'twitter' | 'microsoft';
export type OAuthConnectionStatus = 'active' | 'expired' | 'revoked' | 'error';

export interface OAuthProviderConfig {
  id: string;
  provider: OAuthProvider;
  client_id: string;
  authorization_url: string;
  token_url: string;
  user_info_url: string;
  scopes: string[];
  is_enabled: boolean;
}

export interface OAuthConnection {
  id: string;
  user_id: string;
  provider: OAuthProvider;
  provider_user_id: string;
  provider_email?: string;
  provider_name?: string;
  provider_avatar?: string;
  status: OAuthConnectionStatus;
  is_primary: boolean;
  last_used_at: string;
  created_at: string;
  updated_at: string;
}

export interface OAuthToken {
  id: string;
  connection_id: string;
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_at?: string;
  scopes: string[];
}

export interface OAuthStats {
  total_connections: number;
  active_connections: number;
  providers: Record<OAuthProvider, number>;
  last_login?: string;
  total_logins: number;
}

// OAuth Providers
export async function getOAuthProviders(): Promise<OAuthProviderConfig[]> {
  try {
    const { data, error } = await supabase
      .from('oauth_providers')
      .select('*')
      .eq('is_enabled', true)
      .order('provider');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting OAuth providers:', error);
    return [];
  }
}

export async function getOAuthProvider(provider: OAuthProvider): Promise<OAuthProviderConfig | null> {
  try {
    const { data, error } = await supabase
      .from('oauth_providers')
      .select('*')
      .eq('provider', provider)
      .eq('is_enabled', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting OAuth provider:', error);
    return null;
  }
}

// OAuth Connections
export async function getOAuthConnections(userId: string): Promise<OAuthConnection[]> {
  try {
    const { data, error } = await supabase
      .from('oauth_connections')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting OAuth connections:', error);
    return [];
  }
}

export async function getOAuthConnection(
  userId: string,
  provider: OAuthProvider
): Promise<OAuthConnection | null> {
  try {
    const { data, error } = await supabase
      .from('oauth_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting OAuth connection:', error);
    return null;
  }
}

export async function linkOAuthAccount(
  userId: string,
  provider: OAuthProvider,
  providerData: {
    provider_user_id: string;
    provider_email: string;
    provider_name: string;
    provider_avatar?: string;
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  }
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('link_oauth_account', {
      p_user_id: userId,
      p_provider: provider,
      p_provider_user_id: providerData.provider_user_id,
      p_provider_email: providerData.provider_email,
      p_provider_name: providerData.provider_name,
      p_provider_avatar: providerData.provider_avatar,
      p_access_token: providerData.access_token,
      p_refresh_token: providerData.refresh_token,
      p_expires_in: providerData.expires_in,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error linking OAuth account:', error);
    return null;
  }
}

export async function unlinkOAuthAccount(connectionId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('revoke_oauth_connection', {
      p_connection_id: connectionId,
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error unlinking OAuth account:', error);
    return false;
  }
}

// OAuth Authentication with Supabase
export async function signInWithOAuth(provider: OAuthProvider): Promise<boolean> {
  try {
    const redirectUrl = Linking.createURL('/auth/callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: false,
      },
    });

    if (error) throw error;

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success') {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(`Error signing in with ${provider}:`, error);
    return false;
  }
}

// Supabase built-in OAuth (simpler approach)
export async function signInWithGoogle(): Promise<boolean> {
  return signInWithOAuth('google');
}

export async function signInWithApple(): Promise<boolean> {
  return signInWithOAuth('apple');
}

export async function signInWithGitHub(): Promise<boolean> {
  return signInWithOAuth('github');
}

// OAuth Statistics
export async function getOAuthStats(userId: string): Promise<OAuthStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_oauth_stats', {
      p_user_id: userId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting OAuth stats:', error);
    return null;
  }
}

// OAuth Login Log
export async function getOAuthLoginLog(
  userId: string,
  options?: { limit?: number }
): Promise<any[]> {
  try {
    let query = supabase
      .from('oauth_login_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting OAuth login log:', error);
    return [];
  }
}

// Utility Functions
export function getProviderName(provider: OAuthProvider): string {
  const names: Record<OAuthProvider, string> = {
    google: 'Google',
    apple: 'Apple',
    facebook: 'Facebook',
    github: 'GitHub',
    twitter: 'Twitter',
    microsoft: 'Microsoft',
  };
  return names[provider];
}

export function getProviderIcon(provider: OAuthProvider): string {
  const icons: Record<OAuthProvider, string> = {
    google: '🔴',
    apple: '🍎',
    facebook: '🔵',
    github: '⚫',
    twitter: '🐦',
    microsoft: '🪟',
  };
  return icons[provider];
}

export function getProviderColor(provider: OAuthProvider): string {
  const colors: Record<OAuthProvider, string> = {
    google: '#DB4437',
    apple: '#000000',
    facebook: '#1877F2',
    github: '#181717',
    twitter: '#1DA1F2',
    microsoft: '#00A4EF',
  };
  return colors[provider];
}

export function getConnectionStatusColor(status: OAuthConnectionStatus): string {
  const colors: Record<OAuthConnectionStatus, string> = {
    active: '#10B981',
    expired: '#F59E0B',
    revoked: '#6B7280',
    error: '#EF4444',
  };
  return colors[status];
}

export function getConnectionStatusLabel(status: OAuthConnectionStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function isTokenExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) <= new Date();
}

export function needsTokenRefresh(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const fiveMinutes = 5 * 60 * 1000;
  return expiryDate.getTime() - now.getTime() < fiveMinutes;
}

// Handle OAuth callback
export async function handleOAuthCallback(url: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getSessionFromUrl({ url });

    if (error) throw error;

    if (data?.session) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    return false;
  }
}

// Get current OAuth user
export async function getCurrentOAuthUser() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Get OAuth provider info from user metadata
      const provider = user.app_metadata.provider;
      const providerId = user.app_metadata.provider_id;

      return {
        user,
        provider,
        providerId,
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting current OAuth user:', error);
    return null;
  }
}

// Check if user has OAuth connection
export async function hasOAuthConnection(
  userId: string,
  provider: OAuthProvider
): Promise<boolean> {
  const connection = await getOAuthConnection(userId, provider);
  return connection !== null && connection.status === 'active';
}

// Get primary OAuth connection
export async function getPrimaryOAuthConnection(
  userId: string
): Promise<OAuthConnection | null> {
  try {
    const { data, error } = await supabase
      .from('oauth_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting primary OAuth connection:', error);
    return null;
  }
}

// Set primary OAuth connection
export async function setPrimaryOAuthConnection(
  userId: string,
  connectionId: string
): Promise<boolean> {
  try {
    // Remove primary flag from all connections
    await supabase
      .from('oauth_connections')
      .update({ is_primary: false })
      .eq('user_id', userId);

    // Set new primary
    const { error } = await supabase
      .from('oauth_connections')
      .update({ is_primary: true })
      .eq('id', connectionId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error setting primary OAuth connection:', error);
    return false;
  }
}
