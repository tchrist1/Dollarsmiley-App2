/**
 * Clear frontend cache and test listings visibility
 */

import { supabase } from '../lib/supabase';
import { invalidateAllListingCaches } from '../lib/listing-cache';
import { invalidateAllCaches } from '../lib/session-cache';

async function testListingsQuery() {
  console.log('\n=== Testing Listings Query ===\n');

  // Test 1: Direct service listings query
  console.log('Test 1: Fetching service listings...');
  const { data: services, error: servicesError } = await supabase
    .from('service_listings')
    .select('*, profiles!service_listings_provider_id_fkey(*), categories(*)')
    .eq('status', 'Active')
    .order('created_at', { ascending: false })
    .limit(5);

  if (servicesError) {
    console.error('❌ Service listings error:', servicesError);
  } else {
    console.log(`✅ Found ${services?.length || 0} service listings`);
    if (services && services.length > 0) {
      console.log('First listing:', {
        id: services[0].id,
        title: services[0].title,
        status: services[0].status,
        provider: services[0].profiles?.full_name,
        category: services[0].categories?.name,
      });
    }
  }

  // Test 2: Direct jobs query
  console.log('\nTest 2: Fetching jobs...');
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('*, profiles!jobs_customer_id_fkey(*), categories(*)')
    .eq('status', 'Open')
    .order('created_at', { ascending: false })
    .limit(5);

  if (jobsError) {
    console.error('❌ Jobs error:', jobsError);
  } else {
    console.log(`✅ Found ${jobs?.length || 0} jobs`);
    if (jobs && jobs.length > 0) {
      console.log('First job:', {
        id: jobs[0].id,
        title: jobs[0].title,
        status: jobs[0].status,
        customer: jobs[0].profiles?.full_name,
        category: jobs[0].categories?.name,
      });
    }
  }

  // Test 3: Check RLS
  console.log('\nTest 3: Testing RLS policies...');
  const { data: countData, error: countError } = await supabase
    .from('service_listings')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'Active');

  if (countError) {
    console.error('❌ RLS test error:', countError);
  } else {
    console.log(`✅ RLS allows access to listings`);
  }

  console.log('\n=== Cache Cleared ===');
  console.log('All frontend caches have been invalidated.');
  console.log('Please refresh the app to fetch fresh data.\n');
}

// Clear all caches
console.log('\n=== Clearing All Caches ===\n');
invalidateAllListingCaches();
invalidateAllCaches();

// Run tests
testListingsQuery();
