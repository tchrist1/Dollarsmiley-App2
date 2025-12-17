import { supabase } from '../lib/supabase';

interface RLSTest {
  table: string;
  testName: string;
  testFn: () => Promise<{ passed: boolean; error?: string }>;
}

const tests: RLSTest[] = [];

function addTest(table: string, testName: string, testFn: () => Promise<{ passed: boolean; error?: string }>) {
  tests.push({ table, testName, testFn });
}

async function testProfiles() {
  addTest('profiles', 'Anonymous cannot read profiles', async () => {
    const { error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    return {
      passed: error?.message.includes('JWT') || error?.message.includes('auth') || false,
      error: error?.message,
    };
  });
}

async function testListings() {
  addTest('listings', 'Anyone can read public listings', async () => {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    return {
      passed: !error,
      error: error?.message,
    };
  });
}

async function testBookings() {
  addTest('bookings', 'Bookings require authentication', async () => {
    const { error } = await supabase
      .from('bookings')
      .select('*')
      .limit(1);

    return {
      passed: error?.message.includes('JWT') || error?.message.includes('auth') || false,
      error: error?.message,
    };
  });
}

async function testPaymentMethods() {
  addTest('payment_methods', 'Payment methods require authentication', async () => {
    const { error } = await supabase
      .from('payment_methods')
      .select('*')
      .limit(1);

    return {
      passed: error?.message.includes('JWT') || error?.message.includes('auth') || false,
      error: error?.message,
    };
  });
}

async function testTransactions() {
  addTest('transactions', 'Transactions require authentication', async () => {
    const { error } = await supabase
      .from('transactions')
      .select('*')
      .limit(1);

    return {
      passed: error?.message.includes('JWT') || error?.message.includes('auth') || false,
      error: error?.message,
    };
  });
}

async function testNotifications() {
  addTest('notifications', 'Notifications require authentication', async () => {
    const { error } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);

    return {
      passed: error?.message.includes('JWT') || error?.message.includes('auth') || false,
      error: error?.message,
    };
  });
}

async function testReviews() {
  addTest('reviews', 'Reviews are publicly readable', async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .limit(1);

    return {
      passed: !error,
      error: error?.message,
    };
  });
}

async function testMessages() {
  addTest('messages', 'Messages require authentication', async () => {
    const { error } = await supabase
      .from('messages')
      .select('*')
      .limit(1);

    return {
      passed: error?.message.includes('JWT') || error?.message.includes('auth') || false,
      error: error?.message,
    };
  });
}

async function testVideoCalls() {
  addTest('video_calls', 'Video calls require authentication', async () => {
    const { error } = await supabase
      .from('video_calls')
      .select('*')
      .limit(1);

    return {
      passed: error?.message.includes('JWT') || error?.message.includes('auth') || false,
      error: error?.message,
    };
  });
}

async function testInventory() {
  addTest('provider_inventory', 'Inventory requires authentication', async () => {
    const { error } = await supabase
      .from('provider_inventory')
      .select('*')
      .limit(1);

    return {
      passed: error?.message.includes('JWT') || error?.message.includes('auth') || false,
      error: error?.message,
    };
  });
}

async function runRLSTests() {
  console.log('🔒 Testing Row Level Security Policies...\n');

  await testProfiles();
  await testListings();
  await testBookings();
  await testPaymentMethods();
  await testTransactions();
  await testNotifications();
  await testReviews();
  await testMessages();
  await testVideoCalls();
  await testInventory();

  const results: Array<{ table: string; testName: string; passed: boolean; error?: string }> = [];

  for (const test of tests) {
    try {
      const result = await test.testFn();
      results.push({
        table: test.table,
        testName: test.testName,
        passed: result.passed,
        error: result.error,
      });

      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${test.table}: ${test.testName}`);

      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    } catch (error) {
      results.push({
        table: test.table,
        testName: test.testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      });

      console.log(`❌ ${test.table}: ${test.testName}`);
      console.log(`   Error: ${error}`);
    }
  }

  console.log('\n📊 RLS Policy Test Summary:');
  console.log('============================');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n⚠️  Security Issues:');
    console.log('Tables with RLS policy issues should be reviewed immediately.');
  }

  return { results, passed, failed };
}

if (require.main === module) {
  runRLSTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('RLS tests failed:', error);
      process.exit(1);
    });
}

export { runRLSTests };
