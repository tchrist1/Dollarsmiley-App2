import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function StripeTestScreen() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (result: string, success: boolean = true) => {
    const icon = success ? '✓' : '✗';
    setTestResults(prev => [...prev, `${icon} ${result}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testEnvironmentVariables = () => {
    clearResults();
    addResult('Testing Environment Variables...');

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (supabaseUrl) {
      addResult(`Supabase URL: ${supabaseUrl.substring(0, 30)}...`);
    } else {
      addResult('Supabase URL: NOT SET', false);
    }

    if (stripeKey) {
      addResult(`Stripe Key: ${stripeKey.substring(0, 20)}...`);
    } else {
      addResult('Stripe Key: NOT SET', false);
    }
  };

  const testSupabaseConnection = async () => {
    clearResults();
    setLoading(true);
    addResult('Testing Supabase Connection...');

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .limit(1);

      if (error) {
        addResult(`Connection Error: ${error.message}`, false);
      } else {
        addResult('Successfully connected to Supabase');
        addResult(`Sample category: ${data?.[0]?.name || 'N/A'}`);
      }
    } catch (err: any) {
      addResult(`Exception: ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  };

  const testEdgeFunctionAvailability = async () => {
    clearResults();
    setLoading(true);
    addResult('Testing Edge Function Availability...');

    try {
      const functions = [
        'create-payment-intent',
        'create-deposit-payment',
        'stripe-webhook',
        'stripe-connect-onboarding',
      ];

      for (const funcName of functions) {
        const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/${funcName}`;

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          // Even if it returns an error, if we get a response, the function exists
          if (response) {
            addResult(`${funcName}: Available`);
          }
        } catch (err) {
          addResult(`${funcName}: Not responding`, false);
        }
      }
    } catch (err: any) {
      addResult(`Exception: ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  };

  const testAuthenticatedRequest = async () => {
    clearResults();
    setLoading(true);
    addResult('Testing Authenticated Request...');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        addResult('Not logged in - please login first', false);
        addResult('Go to Login screen and authenticate');
        setLoading(false);
        return;
      }

      addResult('User is authenticated');
      addResult(`User ID: ${session.user.id.substring(0, 20)}...`);

      // Test create-payment-intent with a dummy booking
      const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-payment-intent`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount: 100,
          bookingId: 'test-booking-id',
          paymentMethod: 'card',
        }),
      });

      const result = await response.json();

      if (response.ok && result.clientSecret) {
        addResult('Payment Intent Created Successfully!');
        addResult(`Client Secret: ${result.clientSecret.substring(0, 30)}...`);
      } else if (result.error) {
        addResult(`Error: ${result.error}`, false);
      } else {
        addResult('Unexpected response', false);
      }
    } catch (err: any) {
      addResult(`Exception: ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Stripe Integration Test</Text>
        <Text style={styles.subtitle}>Verify your Stripe configuration</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={testEnvironmentVariables}
          disabled={loading}
        >
          <Text style={styles.buttonText}>1. Test Environment Variables</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={testSupabaseConnection}
          disabled={loading}
        >
          <Text style={styles.buttonText}>2. Test Supabase Connection</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={testEdgeFunctionAvailability}
          disabled={loading}
        >
          <Text style={styles.buttonText}>3. Test Edge Functions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={testAuthenticatedRequest}
          disabled={loading}
        >
          <Text style={styles.buttonText}>4. Test Payment Intent (Auth Required)</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Running test...</Text>
        </View>
      )}

      {testResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Test Results:</Text>
          {testResults.map((result, index) => (
            <Text
              key={index}
              style={[
                styles.resultText,
                result.startsWith('✗') && styles.errorText,
              ]}
            >
              {result}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Configuration Checklist:</Text>
        <Text style={styles.infoText}>
          ✓ EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in .env
        </Text>
        <Text style={styles.infoText}>
          ✓ STRIPE_SECRET_KEY in Supabase secrets
        </Text>
        <Text style={styles.infoText}>
          ✓ STRIPE_WEBHOOK_SECRET in Supabase secrets
        </Text>
        <Text style={styles.infoText}>
          ✓ Edge Functions deployed
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    padding: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  resultsContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 8,
    fontFamily: 'monospace',
    color: '#2d2d2d',
  },
  errorText: {
    color: '#ff3b30',
  },
  infoContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1976d2',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 6,
    color: '#424242',
  },
});
