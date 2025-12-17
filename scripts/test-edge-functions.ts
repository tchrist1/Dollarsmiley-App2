import { supabase } from '../lib/supabase';

interface EdgeFunctionTest {
  name: string;
  endpoint: string;
  method: string;
  body?: any;
  requiresAuth: boolean;
  expectedStatus?: number;
}

const edgeFunctionTests: EdgeFunctionTest[] = [
  {
    name: 'Generate Call Token',
    endpoint: 'generate-call-token',
    method: 'POST',
    body: { callId: 'test-call', roomId: 'test-room' },
    requiresAuth: true,
    expectedStatus: 401,
  },
  {
    name: 'WebRTC Signaling',
    endpoint: 'webrtc-signaling',
    method: 'POST',
    body: { type: 'join', roomId: 'test-room' },
    requiresAuth: true,
    expectedStatus: 401,
  },
  {
    name: 'Send Notification',
    endpoint: 'send-notification',
    method: 'POST',
    body: { userId: 'test-user', title: 'Test', message: 'Test message' },
    requiresAuth: true,
    expectedStatus: 401,
  },
  {
    name: 'Create Payment Intent',
    endpoint: 'create-payment-intent',
    method: 'POST',
    body: { amount: 1000, currency: 'usd' },
    requiresAuth: true,
    expectedStatus: 401,
  },
  {
    name: 'Confirm Payment',
    endpoint: 'confirm-payment',
    method: 'POST',
    body: { paymentIntentId: 'test-pi' },
    requiresAuth: true,
    expectedStatus: 401,
  },
];

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  responseTime?: number;
  error?: string;
}

async function testEdgeFunction(test: EdgeFunctionTest): Promise<TestResult> {
  const start = Date.now();

  try {
    const { data, error } = await supabase.functions.invoke(test.endpoint, {
      body: test.body,
      method: test.method,
    });

    const responseTime = Date.now() - start;

    if (error) {
      if (test.expectedStatus === 401 && error.message.includes('unauthorized')) {
        return {
          name: test.name,
          status: 'passed',
          responseTime,
        };
      }

      return {
        name: test.name,
        status: 'failed',
        responseTime,
        error: error.message,
      };
    }

    return {
      name: test.name,
      status: 'passed',
      responseTime,
    };
  } catch (error) {
    return {
      name: test.name,
      status: 'failed',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runEdgeFunctionTests() {
  console.log('🔧 Testing Edge Functions...\n');

  const results: TestResult[] = [];

  for (const test of edgeFunctionTests) {
    const result = await testEdgeFunction(test);
    results.push(result);

    const icon = result.status === 'passed' ? '✅' : result.status === 'skipped' ? '⏭️' : '❌';
    console.log(`${icon} ${result.name} (${result.responseTime}ms)`);

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }

  console.log('\n📊 Edge Function Test Summary:');
  console.log('================================');

  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  console.log(`Total: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);

  const avgResponseTime =
    results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;
  console.log(`\nAvg Response Time: ${avgResponseTime.toFixed(0)}ms`);

  return { results, passed, failed, skipped };
}

if (require.main === module) {
  runEdgeFunctionTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Edge function tests failed:', error);
      process.exit(1);
    });
}

export { runEdgeFunctionTests };
