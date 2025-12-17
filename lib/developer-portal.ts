import { supabase } from './supabase';
import * as Crypto from 'expo-crypto';

export type ApiKeyEnvironment = 'production' | 'development';
export type ApiKeyStatus = 'active' | 'revoked' | 'expired';

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key: string;
  key_prefix: string;
  environment: ApiKeyEnvironment;
  status: ApiKeyStatus;
  scopes: string[];
  rate_limit_tier: string;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface ApiUsage {
  total_requests: number;
  requests_today: number;
  rate_limit: number;
  rate_limit_remaining: number;
  top_endpoints: Array<{
    endpoint: string;
    count: number;
  }>;
}

export interface WebhookEndpoint {
  id: string;
  user_id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  last_delivery_at?: string;
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: string;
  payload: any;
  response_status?: number;
  response_body?: string;
  delivered_at?: string;
  created_at: string;
}

export interface DeveloperStats {
  total_api_calls: number;
  total_webhooks: number;
  active_api_keys: number;
  success_rate: number;
}

// API Keys
export async function getApiKeys(status?: ApiKeyStatus): Promise<ApiKey[]> {
  try {
    let query = supabase
      .from('developer_api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting API keys:', error);
    return [];
  }
}

export async function getApiKey(keyId: string): Promise<ApiKey | null> {
  try {
    const { data, error } = await supabase
      .from('developer_api_keys')
      .select('*')
      .eq('id', keyId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting API key:', error);
    return null;
  }
}

export async function createApiKey(data: {
  name: string;
  environment: ApiKeyEnvironment;
  scopes?: string[];
  expires_in_days?: number;
}): Promise<ApiKey | null> {
  try {
    // Generate API key
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    const apiKey = `ds_${data.environment === 'production' ? 'live' : 'test'}_${Array.from(new Uint8Array(randomBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')}`;

    const keyPrefix = apiKey.substring(0, 12);

    const expiresAt = data.expires_in_days
      ? new Date(Date.now() + data.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data: key, error } = await supabase
      .from('developer_api_keys')
      .insert({
        name: data.name,
        key: apiKey,
        key_prefix: keyPrefix,
        environment: data.environment,
        scopes: data.scopes || ['read', 'write'],
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) throw error;
    return key;
  } catch (error) {
    console.error('Error creating API key:', error);
    return null;
  }
}

export async function revokeApiKey(keyId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('developer_api_keys')
      .update({ status: 'revoked' })
      .eq('id', keyId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error revoking API key:', error);
    return false;
  }
}

export async function deleteApiKey(keyId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('developer_api_keys')
      .delete()
      .eq('id', keyId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting API key:', error);
    return false;
  }
}

export async function validateApiKey(apiKey: string): Promise<ApiKey | null> {
  try {
    const { data, error } = await supabase
      .from('developer_api_keys')
      .select('*')
      .eq('key', apiKey)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;

    // Check if expired
    if (data && data.expires_at && new Date(data.expires_at) < new Date()) {
      await supabase
        .from('developer_api_keys')
        .update({ status: 'expired' })
        .eq('id', data.id);
      return null;
    }

    // Update last used
    if (data) {
      await supabase
        .from('developer_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);
    }

    return data;
  } catch (error) {
    console.error('Error validating API key:', error);
    return null;
  }
}

// API Usage
export async function getApiUsage(userId?: string): Promise<ApiUsage | null> {
  try {
    const { data, error } = await supabase.rpc('get_developer_api_usage', {
      p_user_id: userId || null,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting API usage:', error);
    return null;
  }
}

export async function getApiUsageByKey(keyId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('developer_api_logs')
      .select('*')
      .eq('api_key_id', keyId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting API usage by key:', error);
    return [];
  }
}

// Webhooks
export async function getWebhooks(): Promise<WebhookEndpoint[]> {
  try {
    const { data, error } = await supabase
      .from('developer_webhooks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting webhooks:', error);
    return [];
  }
}

export async function getWebhook(webhookId: string): Promise<WebhookEndpoint | null> {
  try {
    const { data, error } = await supabase
      .from('developer_webhooks')
      .select('*')
      .eq('id', webhookId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting webhook:', error);
    return null;
  }
}

export async function createWebhook(data: {
  url: string;
  events: string[];
}): Promise<WebhookEndpoint | null> {
  try {
    // Generate webhook secret
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    const secret = Array.from(new Uint8Array(randomBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const { data: webhook, error } = await supabase
      .from('developer_webhooks')
      .insert({
        url: data.url,
        events: data.events,
        secret: `whsec_${secret}`,
      })
      .select()
      .single();

    if (error) throw error;
    return webhook;
  } catch (error) {
    console.error('Error creating webhook:', error);
    return null;
  }
}

export async function updateWebhook(
  webhookId: string,
  updates: Partial<WebhookEndpoint>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('developer_webhooks')
      .update(updates)
      .eq('id', webhookId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating webhook:', error);
    return false;
  }
}

export async function deleteWebhook(webhookId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('developer_webhooks')
      .delete()
      .eq('id', webhookId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return false;
  }
}

export async function testWebhook(webhookId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('test_webhook', {
      p_webhook_id: webhookId,
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error testing webhook:', error);
    return false;
  }
}

// Webhook Deliveries
export async function getWebhookDeliveries(
  webhookId: string,
  limit: number = 50
): Promise<WebhookDelivery[]> {
  try {
    const { data, error } = await supabase
      .from('developer_webhook_deliveries')
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting webhook deliveries:', error);
    return [];
  }
}

export async function retryWebhookDelivery(deliveryId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('retry_webhook_delivery', {
      p_delivery_id: deliveryId,
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error retrying webhook delivery:', error);
    return false;
  }
}

// Developer Statistics
export async function getDeveloperStats(userId?: string): Promise<DeveloperStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_developer_stats', {
      p_user_id: userId || null,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting developer stats:', error);
    return null;
  }
}

// API Documentation
export async function getApiDocumentation(): Promise<any> {
  try {
    // Return OpenAPI spec
    return {
      openapi: '3.0.3',
      info: {
        title: 'Dollarsmiley API',
        version: '1.0.0',
      },
      // Full spec would be loaded from openapi.yaml
    };
  } catch (error) {
    console.error('Error getting API documentation:', error);
    return null;
  }
}

// Code Examples
export async function getCodeExamples(language?: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('developer_code_examples')
      .select('*')
      .order('category');

    if (error) throw error;

    if (language) {
      return (data || []).filter(example => example.language === language);
    }

    return data || [];
  } catch (error) {
    console.error('Error getting code examples:', error);
    return [];
  }
}

// SDK Information
export interface SDK {
  name: string;
  language: string;
  version: string;
  install_command: string;
  documentation_url: string;
  github_url: string;
}

export function getSDKs(): SDK[] {
  return [
    {
      name: '@dollarsmiley/sdk',
      language: 'JavaScript/TypeScript',
      version: '1.0.0',
      install_command: 'npm install @dollarsmiley/sdk',
      documentation_url: 'https://docs.dollarsmiley.com/sdk/js',
      github_url: 'https://github.com/dollarsmiley/js-sdk',
    },
    {
      name: 'dollarsmiley-python',
      language: 'Python',
      version: '1.0.0',
      install_command: 'pip install dollarsmiley',
      documentation_url: 'https://docs.dollarsmiley.com/sdk/python',
      github_url: 'https://github.com/dollarsmiley/python-sdk',
    },
    {
      name: 'dollarsmiley-php',
      language: 'PHP',
      version: '1.0.0',
      install_command: 'composer require dollarsmiley/sdk',
      documentation_url: 'https://docs.dollarsmiley.com/sdk/php',
      github_url: 'https://github.com/dollarsmiley/php-sdk',
    },
    {
      name: 'dollarsmiley-ruby',
      language: 'Ruby',
      version: '1.0.0',
      install_command: 'gem install dollarsmiley',
      documentation_url: 'https://docs.dollarsmiley.com/sdk/ruby',
      github_url: 'https://github.com/dollarsmiley/ruby-sdk',
    },
  ];
}

// Utility Functions
export function formatApiKey(key: string): string {
  if (key.length < 16) return key;
  return `${key.substring(0, 12)}...${key.substring(key.length - 4)}`;
}

export function getApiKeyEnvironmentColor(environment: ApiKeyEnvironment): string {
  return environment === 'production' ? '#10B981' : '#F59E0B';
}

export function getApiKeyStatusColor(status: ApiKeyStatus): string {
  const colors: Record<ApiKeyStatus, string> = {
    active: '#10B981',
    revoked: '#6B7280',
    expired: '#EF4444',
  };
  return colors[status];
}

export function isApiKeyExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export function getApiKeyTimeRemaining(expiresAt?: string): string {
  if (!expiresAt) return 'Never expires';

  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days} days remaining`;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours} hours remaining`;

  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes} minutes remaining`;
}

export function validateWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getAvailableWebhookEvents(): string[] {
  return [
    'booking.created',
    'booking.confirmed',
    'booking.cancelled',
    'booking.completed',
    'payment.succeeded',
    'payment.failed',
    'payment.refunded',
    'review.created',
    'listing.created',
    'listing.updated',
    'user.verified',
    'message.received',
  ];
}
