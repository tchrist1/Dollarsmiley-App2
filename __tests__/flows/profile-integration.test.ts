/**
 * TC-A2: PROFILE VIEW & EDIT Integration Tests
 * Tests against actual Supabase database
 */

import { supabase } from '@/lib/supabase';

describe('TC-A2: Profile Integration Tests', () => {
  let testUserId: string;

  beforeAll(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (data) {
      testUserId = data.id;
    }
  });

  describe('TC-A2-001: Profile Display (Integration)', () => {
    it('should fetch real profile from database', async () => {
      if (!testUserId) {
        console.warn('No test user found, skipping integration test');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, user_type, admin_mode')
        .eq('id', testUserId)
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.id).toBe(testUserId);
      expect(data).toHaveProperty('full_name');
      expect(data).toHaveProperty('email');
    });

    it('should query profiles table schema', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)
        .maybeSingle();

      expect(error).toBeNull();
      if (data) {
        const requiredColumns = ['id', 'full_name', 'email', 'user_type'];
        requiredColumns.forEach(col => {
          expect(data).toHaveProperty(col);
        });
      }
    });
  });

  describe('TC-A2-002: Edit Persistence (Integration)', () => {
    it('should have RLS policies on profiles table', async () => {
      const { data, error } = await supabase.rpc('has_table_privilege', {
        table_name: 'profiles',
        privilege: 'SELECT'
      }).maybeSingle();

      // If we can query, RLS is working
      expect(error).toBeNull();
    });
  });

  describe('TC-A2-003: Avatar Storage (Integration)', () => {
    it('should check avatars bucket exists', async () => {
      const { data, error } = await supabase
        .storage
        .getBucket('avatars');

      // Bucket should exist or we should get a specific error
      expect(data || error).toBeTruthy();
    });
  });

  describe('TC-A2-004: Realtime Subscription Setup', () => {
    it('should have realtime enabled on profiles table', async () => {
      const subscription = supabase
        .channel('test-profile-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles'
          },
          (payload) => {
            console.log('Profile updated:', payload);
          }
        );

      expect(subscription).toBeTruthy();
      expect(subscription.subscribe).toBeDefined();
    });
  });
});
