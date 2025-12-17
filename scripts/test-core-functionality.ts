import { supabase } from '../lib/supabase';
import { VideoCallService } from '../lib/video-calls';
import { InventoryManagementService } from '../lib/inventory-management';
import { MonitoringService } from '../lib/monitoring';

interface TestResult {
  name: string;
  status: 'passed' | 'failed';
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    results.push({
      name,
      status: 'passed',
      duration: Date.now() - start,
    });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.push({
      name,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    console.error(`❌ ${name}: ${error}`);
  }
}

async function testAuthentication() {
  await runTest('Authentication - Get Session', async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
  });
}

async function testDatabaseConnection() {
  await runTest('Database - Connection Test', async () => {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) throw error;
  });

  await runTest('Database - Create Test Profile', async () => {
    const testUser = {
      id: crypto.randomUUID(),
      email: `test_${Date.now()}@example.com`,
      full_name: 'Test User',
      phone: '+1234567890',
    };

    const { error: insertError } = await supabase
      .from('profiles')
      .insert(testUser);

    if (insertError) throw insertError;

    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', testUser.id);

    if (deleteError) throw deleteError;
  });
}

async function testCategoriesAndListings() {
  await runTest('Categories - Fetch All', async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .limit(10);

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No categories found');
  });

  await runTest('Listings - Query Test', async () => {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .limit(5);

    if (error) throw error;
  });
}

async function testBookingSystem() {
  await runTest('Bookings - Schema Validation', async () => {
    const { error } = await supabase
      .from('bookings')
      .select('*')
      .limit(1);

    if (error) throw error;
  });

  await runTest('Booking Timeline - Function Test', async () => {
    const { data, error } = await supabase.rpc('get_booking_timeline', {
      booking_id_param: '00000000-0000-0000-0000-000000000000',
    });

    if (error && !error.message.includes('not found')) throw error;
  });
}

async function testPaymentSystem() {
  await runTest('Payment Methods - Schema Check', async () => {
    const { error } = await supabase
      .from('payment_methods')
      .select('*')
      .limit(1);

    if (error) throw error;
  });

  await runTest('Transactions - Schema Check', async () => {
    const { error } = await supabase
      .from('transactions')
      .select('*')
      .limit(1);

    if (error) throw error;
  });

  await runTest('Escrow - Schema Check', async () => {
    const { error } = await supabase
      .from('escrow_transactions')
      .select('*')
      .limit(1);

    if (error) throw error;
  });
}

async function testNotificationSystem() {
  await runTest('Notifications - Schema Check', async () => {
    const { error } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);

    if (error) throw error;
  });

  await runTest('Push Notifications - Queue Check', async () => {
    const { error } = await supabase
      .from('notification_queue')
      .select('*')
      .limit(1);

    if (error) throw error;
  });
}

async function testVideoCallSystem() {
  await runTest('Video Calls - Schema Check', async () => {
    const { error } = await supabase
      .from('video_calls')
      .select('*')
      .limit(1);

    if (error) throw error;
  });

  await runTest('Call Participants - Schema Check', async () => {
    const { error } = await supabase
      .from('call_participants')
      .select('*')
      .limit(1);

    if (error) throw error;
  });
}

async function testInventorySystem() {
  await runTest('Inventory - Schema Check', async () => {
    const { error } = await supabase
      .from('provider_inventory')
      .select('*')
      .limit(1);

    if (error) throw error;
  });

  await runTest('Inventory - Health Calculation', async () => {
    const item = {
      quantity: 5,
      reorder_point: 10,
    } as any;

    const health = InventoryManagementService.calculateInventoryHealth(item);

    if (health.status !== 'critical') {
      throw new Error(`Expected 'critical', got '${health.status}'`);
    }
  });
}

async function testReviewSystem() {
  await runTest('Reviews - Schema Check', async () => {
    const { error } = await supabase
      .from('reviews')
      .select('*')
      .limit(1);

    if (error) throw error;
  });

  await runTest('Review Responses - Schema Check', async () => {
    const { error } = await supabase
      .from('review_responses')
      .select('*')
      .limit(1);

    if (error) throw error;
  });
}

async function testSocialFeatures() {
  await runTest('Posts - Schema Check', async () => {
    const { error } = await supabase
      .from('posts')
      .select('*')
      .limit(1);

    if (error) throw error;
  });

  await runTest('Followers - Schema Check', async () => {
    const { error } = await supabase
      .from('followers')
      .select('*')
      .limit(1);

    if (error) throw error;
  });
}

async function testMonitoringSystem() {
  await runTest('Error Logs - Schema Check', async () => {
    const { error } = await supabase
      .from('error_logs')
      .select('*')
      .limit(1);

    if (error) throw error;
  });

  await runTest('Performance Metrics - Schema Check', async () => {
    const { error } = await supabase
      .from('performance_metrics')
      .select('*')
      .limit(1);

    if (error) throw error;
  });
}

async function testSubscriptionSystem() {
  await runTest('Subscriptions - Schema Check', async () => {
    const { error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .limit(1);

    if (error) throw error;
  });

  await runTest('Subscription Plans - Schema Check', async () => {
    const { error } = await supabase
      .from('subscription_plans')
      .select('*')
      .limit(1);

    if (error) throw error;
  });
}

async function testMessagingSystem() {
  await runTest('Conversations - Schema Check', async () => {
    const { error } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);

    if (error) throw error;
  });

  await runTest('Messages - Schema Check', async () => {
    const { error } = await supabase
      .from('messages')
      .select('*')
      .limit(1);

    if (error) throw error;
  });
}

async function testAdminFeatures() {
  await runTest('Moderation Queue - Schema Check', async () => {
    const { error } = await supabase
      .from('moderation_queue')
      .select('*')
      .limit(1);

    if (error) throw error;
  });

  await runTest('System Alerts - Schema Check', async () => {
    const { error } = await supabase
      .from('system_alerts')
      .select('*')
      .limit(1);

    if (error) throw error;
  });
}

async function runAllTests() {
  console.log('🧪 Starting Core Functionality Tests...\n');

  await testAuthentication();
  await testDatabaseConnection();
  await testCategoriesAndListings();
  await testBookingSystem();
  await testPaymentSystem();
  await testNotificationSystem();
  await testVideoCallSystem();
  await testInventorySystem();
  await testReviewSystem();
  await testSocialFeatures();
  await testMonitoringSystem();
  await testSubscriptionSystem();
  await testMessagingSystem();
  await testAdminFeatures();

  console.log('\n📊 Test Summary:');
  console.log('================');

  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => r.status === 'failed')
      .forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
  }

  console.log('\n⏱️  Performance:');
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  console.log(`Average Test Duration: ${avgDuration.toFixed(0)}ms`);

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`Total Duration: ${totalDuration.toFixed(0)}ms`);

  return { passed, failed, total, results };
}

if (require.main === module) {
  runAllTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

export { runAllTests, results };
