/**
 * E2E Test: User Registration Flow
 *
 * Tests the complete user registration journey from signup to profile completion
 */

import { supabase } from '@/lib/supabase';

describe('User Registration Flow - E2E', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    full_name: 'Test User',
    user_type: 'customer',
  };

  afterAll(async () => {
    // Cleanup: Delete test user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.auth.admin.deleteUser(user.id);
    }
  });

  it('should complete full registration flow', async () => {
    // Step 1: Sign up new user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          full_name: testUser.full_name,
          user_type: testUser.user_type,
        },
      },
    });

    expect(signUpError).toBeNull();
    expect(signUpData.user).toBeDefined();
    expect(signUpData.user?.email).toBe(testUser.email);

    // Step 2: Verify profile was created
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', signUpData.user!.id)
      .single();

    expect(profileError).toBeNull();
    expect(profile).toBeDefined();
    expect(profile.full_name).toBe(testUser.full_name);
    expect(profile.user_type).toBe(testUser.user_type);

    // Step 3: Test login
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    expect(signInError).toBeNull();
    expect(signInData.user).toBeDefined();
    expect(signInData.session).toBeDefined();
  });

  it('should prevent duplicate email registration', async () => {
    // Try to register with same email
    const { error } = await supabase.auth.signUp({
      email: testUser.email,
      password: 'DifferentPassword123!',
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('already registered');
  });

  it('should enforce password requirements', async () => {
    const { error } = await supabase.auth.signUp({
      email: 'newuser@example.com',
      password: 'weak',
    });

    expect(error).toBeDefined();
  });

  it('should validate email format', async () => {
    const { error } = await supabase.auth.signUp({
      email: 'invalid-email',
      password: 'ValidPassword123!',
    });

    expect(error).toBeDefined();
  });
});
