const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const US_CITIES = [
  { city: 'New York', state: 'NY', lat: 40.7128, lng: -74.0060 },
  { city: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
  { city: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
  { city: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
  { city: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740 },
  { city: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652 },
  { city: 'San Diego', state: 'CA', lat: 32.7157, lng: -117.1611 },
  { city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.7970 },
  { city: 'Austin', state: 'TX', lat: 30.2672, lng: -97.7431 },
  { city: 'San Francisco', state: 'CA', lat: 37.7749, lng: -122.4194 }
];

async function main() {
  console.log('Generating premium demo data...');

  // Get all subcategories
  const { data: subcategories, error: catError } = await supabase
    .from('categories')
    .select('id, slug, name')
    .not('parent_id', 'is', null);

  if (catError) {
    console.error('Error fetching categories:', catError);
    return;
  }

  console.log(`Found ${subcategories.length} subcategories`);
  console.log('Demo data generation would create:');
  console.log(`- ${subcategories.length * 7} service listings`);
  console.log(`- ${subcategories.length * 7} job listings`);
  console.log(`- ${subcategories.length * 7} provider profiles`);
}

main().catch(console.error);
