import { supabase } from './supabase';
import * as Crypto from 'expo-crypto';

interface SessionInfo {
  deviceInfo: {
    platform: string;
    deviceName?: string;
    osVersion?: string;
  };
  ipAddress?: string;
}

interface MFASetup {
  method: 'sms' | 'totp' | 'email';
  phoneNumber?: string;
}

export class AuthEnhancedService {
  static async createSession(userId: string, sessionInfo: SessionInfo) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        device_info: sessionInfo.deviceInfo,
        ip_address: sessionInfo.ipAddress,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateSessionActivity(sessionId: string) {
    const { error } = await supabase.rpc('update_session_activity', {
      session_id: sessionId,
    });

    if (error) throw error;
  }

  static async getUserSessions(userId: string) {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('last_active', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async revokeSession(sessionId: string) {
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
  }

  static async revokeAllSessions(userId: string, exceptSessionId?: string) {
    let query = supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', userId);

    if (exceptSessionId) {
      query = query.neq('id', exceptSessionId);
    }

    const { error } = await query;
    if (error) throw error;
  }

  static async setupMFA(userId: string, setup: MFASetup) {
    const backupCodes = await this.generateBackupCodes(5);

    const { data, error } = await supabase
      .from('user_mfa')
      .upsert({
        user_id: userId,
        method: setup.method,
        phone_number: setup.phoneNumber,
        is_enabled: true,
        backup_codes: backupCodes,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { mfa: data, backupCodes };
  }

  static async disableMFA(userId: string) {
    const { error } = await supabase
      .from('user_mfa')
      .update({
        is_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw error;
  }

  static async getMFASettings(userId: string) {
    const { data, error } = await supabase
      .from('user_mfa')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_mfa')
      .select('backup_codes')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return false;

    const backupCodes = data.backup_codes || [];
    const codeIndex = backupCodes.indexOf(code);

    if (codeIndex === -1) return false;

    backupCodes.splice(codeIndex, 1);

    await supabase
      .from('user_mfa')
      .update({
        backup_codes: backupCodes,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return true;
  }

  static async logLoginAttempt(
    userId: string | null,
    loginMethod: string,
    success: boolean,
    deviceInfo: any,
    ipAddress?: string,
    failureReason?: string
  ) {
    const { error } = await supabase.from('user_login_history').insert({
      user_id: userId,
      login_method: loginMethod,
      ip_address: ipAddress,
      device_info: deviceInfo,
      success,
      failure_reason: failureReason,
    });

    if (error) console.error('Failed to log login attempt:', error);
  }

  static async getLoginHistory(userId: string, limit: number = 20) {
    const { data, error } = await supabase
      .from('user_login_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async cleanExpiredSessions() {
    const { error } = await supabase.rpc('clean_expired_sessions');
    if (error) console.error('Failed to clean expired sessions:', error);
  }

  private static async generateBackupCodes(count: number): Promise<string[]> {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const randomBytes = await Crypto.getRandomBytesAsync(4);
      const code = Array.from(randomBytes)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
        .substring(0, 8);
      codes.push(code);
    }
    return codes;
  }

  static async checkSessionValidity(sessionId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('expires_at')
      .eq('id', sessionId)
      .maybeSingle();

    if (error || !data) return false;

    const expiresAt = new Date(data.expires_at);
    return expiresAt > new Date();
  }

  static async getSecuritySummary(userId: string) {
    const [mfaSettings, activeSessions, recentLogins] = await Promise.all([
      this.getMFASettings(userId),
      this.getUserSessions(userId),
      this.getLoginHistory(userId, 5),
    ]);

    return {
      mfaEnabled: mfaSettings?.is_enabled || false,
      mfaMethod: mfaSettings?.method,
      activeSessionsCount: activeSessions.length,
      recentLoginAttempts: recentLogins,
      lastSuccessfulLogin: recentLogins.find((l) => l.success)?.created_at,
    };
  }
}

export default AuthEnhancedService;
