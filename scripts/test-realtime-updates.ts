/**
 * Real-Time Profile Updates Test Script
 *
 * This script tests that profile updates trigger real-time subscriptions
 * and update the UI without requiring app restart.
 *
 * Run this alongside the app to verify real-time functionality.
 */

import { supabase } from '../lib/supabase';

async function testRealtimeUpdates() {
  console.log('🧪 Testing Real-Time Profile Updates\n');

  // Get current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    console.error('❌ No active session. Please log in first.');
    return;
  }

  const userId = session.user.id;
  console.log(`✅ Found active session for user: ${userId}\n`);

  // Subscribe to profile changes
  console.log('📡 Setting up real-time subscription...');

  const subscription = supabase
    .channel(`test-profile:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        console.log('\n🔔 Real-time update received!');
        console.log('📦 Updated fields:', payload.new);
        console.log('✅ Real-time subscription working correctly!\n');
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscription active\n');
      }
    });

  // Wait for subscription to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 1: Update profile name
  console.log('🧪 Test 1: Updating profile name...');
  const testName = `Test User ${Date.now()}`;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ full_name: testName })
    .eq('id', userId);

  if (updateError) {
    console.error('❌ Update failed:', updateError);
  } else {
    console.log(`✅ Profile updated with name: ${testName}`);
    console.log('⏳ Waiting for real-time notification...\n');
  }

  // Wait to observe real-time notification
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test 2: Update bio
  console.log('🧪 Test 2: Updating profile bio...');
  const testBio = `Test bio updated at ${new Date().toISOString()}`;

  const { error: bioError } = await supabase
    .from('profiles')
    .update({ bio: testBio })
    .eq('id', userId);

  if (bioError) {
    console.error('❌ Update failed:', bioError);
  } else {
    console.log(`✅ Bio updated: ${testBio}`);
    console.log('⏳ Waiting for real-time notification...\n');
  }

  // Wait to observe real-time notification
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Cleanup
  console.log('🧹 Cleaning up subscription...');
  await subscription.unsubscribe();
  console.log('✅ Test complete!\n');

  console.log('📋 Summary:');
  console.log('- If you saw "Real-time update received!" messages, real-time is working ✅');
  console.log('- If not, check:');
  console.log('  1. Supabase Realtime is enabled for profiles table');
  console.log('  2. Database has proper RLS policies');
  console.log('  3. Network connection is stable');
  console.log('  4. AuthContext is properly subscribed');
}

// Run the test
testRealtimeUpdates().catch(console.error);

export { testRealtimeUpdates };
