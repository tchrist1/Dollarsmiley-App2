import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const US_CITIES = [
  { city: 'New York', state: 'NY', lat: 40.7128, lng: -74.0060 },
  { city: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
  { city: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
  { city: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
  { city: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740 },
  { city: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 },
  { city: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321 },
  { city: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
  { city: 'Boston', state: 'MA', lat: 42.3601, lng: -71.0589 },
  { city: 'Atlanta', state: 'GA', lat: 33.7490, lng: -84.3880 }
];

const CATEGORY_IMAGES: Record<string, string[]> = {
  'event-planning': [
    'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg',
    'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg',
    'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg',
    'https://images.pexels.com/photos/3171815/pexels-photo-3171815.jpeg'
  ],
  'venue': [
    'https://images.pexels.com/photos/1395964/pexels-photo-1395964.jpeg',
    'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg',
    'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg',
    'https://images.pexels.com/photos/1546913/pexels-photo-1546913.jpeg'
  ],
  'catering': [
    'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg',
    'https://images.pexels.com/photos/1640770/pexels-photo-1640770.jpeg',
    'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
    'https://images.pexels.com/photos/2291367/pexels-photo-2291367.jpeg'
  ],
  'music': [
    'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg',
    'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg',
    'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg',
    'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg'
  ],
  'decor': [
    'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg',
    'https://images.pexels.com/photos/169193/pexels-photo-169193.jpeg',
    'https://images.pexels.com/photos/265921/pexels-photo-265921.jpeg',
    'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg'
  ],
  'photography': [
    'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg',
    'https://images.pexels.com/photos/2788488/pexels-photo-2788488.jpeg',
    'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg',
    'https://images.pexels.com/photos/3182759/pexels-photo-3182759.jpeg'
  ],
  'beauty': [
    'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg',
    'https://images.pexels.com/photos/3985062/pexels-photo-3985062.jpeg',
    'https://images.pexels.com/photos/3992876/pexels-photo-3992876.jpeg',
    'https://images.pexels.com/photos/3992861/pexels-photo-3992861.jpeg'
  ],
  'kids': [
    'https://images.pexels.com/photos/1719669/pexels-photo-1719669.jpeg',
    'https://images.pexels.com/photos/1857157/pexels-photo-1857157.jpeg',
    'https://images.pexels.com/photos/1416736/pexels-photo-1416736.jpeg',
    'https://images.pexels.com/photos/1043505/pexels-photo-1043505.jpeg'
  ],
  'tech': [
    'https://images.pexels.com/photos/1329711/pexels-photo-1329711.jpeg',
    'https://images.pexels.com/photos/442150/pexels-photo-442150.jpeg',
    'https://images.pexels.com/photos/356043/pexels-photo-356043.jpeg',
    'https://images.pexels.com/photos/373965/pexels-photo-373965.jpeg'
  ],
  'handyman': [
    'https://images.pexels.com/photos/5691608/pexels-photo-5691608.jpeg',
    'https://images.pexels.com/photos/4792482/pexels-photo-4792482.jpeg',
    'https://images.pexels.com/photos/5691639/pexels-photo-5691639.jpeg',
    'https://images.pexels.com/photos/4792509/pexels-photo-4792509.jpeg'
  ],
  'default': [
    'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg',
    'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg',
    'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg',
    'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg'
  ]
};

function getImagesForSubcategory(slug: string): string[] {
  if (slug.includes('planning') || slug.includes('coordination')) return CATEGORY_IMAGES['event-planning'];
  if (slug.includes('venue') || slug.includes('space')) return CATEGORY_IMAGES['venue'];
  if (slug.includes('catering') || slug.includes('food') || slug.includes('beverage')) return CATEGORY_IMAGES['catering'];
  if (slug.includes('dj') || slug.includes('music') || slug.includes('band')) return CATEGORY_IMAGES['music'];
  if (slug.includes('decor') || slug.includes('floral') || slug.includes('balloon')) return CATEGORY_IMAGES['decor'];
  if (slug.includes('photo') || slug.includes('video')) return CATEGORY_IMAGES['photography'];
  if (slug.includes('makeup') || slug.includes('hair') || slug.includes('beauty') || slug.includes('braid')) return CATEGORY_IMAGES['beauty'];
  if (slug.includes('kid') || slug.includes('birthday') || slug.includes('bounce')) return CATEGORY_IMAGES['kids'];
  if (slug.includes('av') || slug.includes('tech') || slug.includes('lighting')) return CATEGORY_IMAGES['tech'];
  if (slug.includes('handyman') || slug.includes('furniture') || slug.includes('mounting')) return CATEGORY_IMAGES['handyman'];
  return CATEGORY_IMAGES['default'];
}

function generateRating(): number {
  return Number((4.5 + Math.random() * 0.5).toFixed(1));
}

function generatePrice(subcategorySlug: string, listingType: string): number {
  const baseRanges: Record<string, { min: number; max: number }> = {
    wedding: { min: 1500, max: 8000 },
    corporate: { min: 1000, max: 6000 },
    catering: { min: 500, max: 3000 },
    photography: { min: 400, max: 2000 },
    videography: { min: 500, max: 2500 },
    dj: { min: 300, max: 1200 },
    entertainment: { min: 250, max: 1500 },
    decor: { min: 300, max: 2500 },
    floral: { min: 200, max: 1500 },
    lighting: { min: 300, max: 1800 },
    venue: { min: 800, max: 5000 },
    rental: { min: 200, max: 1500 },
    equipment: { min: 200, max: 1500 },
    beauty: { min: 60, max: 300 },
    makeup: { min: 80, max: 300 },
    hair: { min: 60, max: 250 },
    setup: { min: 150, max: 800 },
    tech: { min: 300, max: 2000 },
    bartending: { min: 200, max: 800 },
    kids: { min: 150, max: 600 },
    default: { min: 150, max: 600 }
  };

  let range = baseRanges.default;
  for (const [key, value] of Object.entries(baseRanges)) {
    if (subcategorySlug.includes(key)) {
      range = value;
      break;
    }
  }

  if (listingType === 'Job') {
    return Math.round((range.min + Math.random() * (range.max - range.min)) * 0.8);
  }

  return Math.round(range.min + Math.random() * (range.max - range.min));
}

function generateDescription(subcategoryName: string, providerName: string, isJob: boolean): string {
  if (isJob) {
    return `Looking for professional ${subcategoryName} services. Seeking experienced provider who delivers quality work and excellent customer service. Project details will be discussed with qualified candidates. Budget is flexible for the right professional. Please respond with your portfolio and availability.`;
  }

  const templates = [
    `${providerName} specializes in premium ${subcategoryName} with over 10 years of experience. We pride ourselves on attention to detail, professional service, and exceeding client expectations. Fully licensed and insured with references available upon request.`,
    `Experience excellence with ${providerName}. Our ${subcategoryName} services combine creativity, professionalism, and reliability to deliver outstanding results for events of all sizes.`,
    `${providerName} offers comprehensive ${subcategoryName} services tailored to your unique needs and vision. Our experienced team ensures flawless execution from start to finish. Customer satisfaction guaranteed.`,
    `Trust ${providerName} for exceptional ${subcategoryName}. We bring expertise, dedication, and a client-focused approach to every project, ensuring memorable experiences every time.`,
    `${providerName} delivers professional ${subcategoryName} services that transform your vision into reality. From planning to execution, we handle every detail with precision and care.`
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

function generateProviderName(subcategoryName: string, index: number): string {
  const types = ['Elite', 'Premier', 'Professional', 'Expert', 'Master', 'Pro', 'Signature', 'Exclusive'];
  const endings = ['Services', 'Co', 'Solutions', 'Group', 'Team', 'Pros', 'Experts', 'LLC'];

  const type = types[index % types.length];
  const ending = endings[Math.floor(index / types.length) % endings.length];

  return `${type} ${subcategoryName} ${ending}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting premium demo data generation...');

    // Create 5 demo customers
    const customerIds: string[] = [];
    const customerNames = ['Sarah Johnson', 'Michael Chen', 'Emily Williams', 'James Rodriguez', 'Lisa Martinez'];

    for (let i = 0; i < 5; i++) {
      const city = US_CITIES[i % US_CITIES.length];
      const { data, error } = await supabase.auth.admin.createUser({
        email: `customer-${i}@dollarsmiley-demo.com`,
        password: 'DemoPass123!',
        email_confirm: true,
        user_metadata: {
          full_name: customerNames[i],
          user_type: 'Customer'
        }
      });

      if (!error && data.user) {
        customerIds.push(data.user.id);
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: customerNames[i],
          user_type: 'Customer',
          phone: `555-${2000 + i}`,
          location: `${city.city}, ${city.state}`,
          latitude: city.lat,
          longitude: city.lng,
          bio: 'Demo customer profile'
        });
      }
    }

    console.log(`Created ${customerIds.length} demo customers`);

    // Get all subcategories
    const { data: subcategories } = await supabase
      .from('categories')
      .select('id, slug, name')
      .not('parent_id', 'is', null);

    console.log(`Found ${subcategories?.length || 0} subcategories`);

    let providersCreated = 0;
    let servicesCreated = 0;
    let jobsCreated = 0;
    const errors: string[] = [];

    // Generate listings for each subcategory
    for (const subcategory of subcategories || []) {
      console.log(`Processing: ${subcategory.name}`);

      const images = getImagesForSubcategory(subcategory.slug);
      const listingsCount = (subcategory.slug.includes('wedding') || subcategory.slug.includes('corporate') || subcategory.slug.includes('catering')) ? 10 : 7;

      // Generate service listings with unique providers
      for (let i = 0; i < listingsCount; i++) {
        const city = US_CITIES[Math.floor(Math.random() * US_CITIES.length)];
        const providerName = generateProviderName(subcategory.name, i);

        // Create unique provider
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: `provider-${subcategory.slug}-${i}@dollarsmiley-demo.com`,
          password: 'DemoPass123!',
          email_confirm: true,
          user_metadata: {
            full_name: providerName,
            user_type: 'Provider'
          }
        });

        if (authError || !authData.user) {
          errors.push(`Provider auth: ${subcategory.name} #${i + 1}`);
          continue;
        }

        const providerId = authData.user.id;

        // Create provider profile
        await supabase.from('profiles').upsert({
          id: providerId,
          email: authData.user.email,
          full_name: providerName,
          user_type: 'Provider',
          phone: `555-${1000 + Math.floor(Math.random() * 9000)}`,
          location: `${city.city}, ${city.state}`,
          latitude: city.lat,
          longitude: city.lng,
          bio: `Professional ${subcategory.name} provider serving the ${city.city} area. Licensed, insured, and highly rated.`
        });

        providersCreated++;

        // Create service listing
        const price = generatePrice(subcategory.slug, 'Service');
        const rating = generateRating();
        const reviewCount = 20 + Math.floor(Math.random() * 480);
        const description = generateDescription(subcategory.name, providerName, false);
        const title = `Professional ${subcategory.name} by ${providerName}`;
        const location = `${city.city}, ${city.state}`;

        const photos = images.slice(0, 3 + Math.floor(Math.random() * 2)).map((url, idx) => ({
          url,
          caption: `${subcategory.name} - Photo ${idx + 1}`
        }));

        const { error: serviceError } = await supabase
          .from('service_listings')
          .insert({
            provider_id: providerId,
            category_id: subcategory.id,
            title,
            description,
            base_price: price,
            pricing_type: i % 2 === 0 ? 'Fixed' : 'Hourly',
            photos,
            location,
            latitude: city.lat,
            longitude: city.lng,
            status: 'Active',
            estimated_duration: 120 + Math.floor(Math.random() * 240),
            is_demo: true,
            is_featured: Math.random() > 0.7
          });

        if (serviceError) {
          errors.push(`Service: ${subcategory.name} #${i + 1}`);
          console.error(serviceError.message);
        } else {
          servicesCreated++;
        }
      }

      // Generate job listings
      for (let i = 0; i < listingsCount; i++) {
        const city = US_CITIES[Math.floor(Math.random() * US_CITIES.length)];
        const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];
        const budget = Math.round(generatePrice(subcategory.slug, 'Service') * 0.85);
        const description = generateDescription(subcategory.name, '', true);

        const jobTitles = [
          `Need Professional ${subcategory.name}`,
          `Looking for ${subcategory.name} Expert`,
          `${subcategory.name} Services Required`,
          `Seeking Experienced ${subcategory.name} Provider`,
          `Hire ${subcategory.name} Professional`
        ];
        const title = jobTitles[i % jobTitles.length];
        const location = `${city.city}, ${city.state}`;

        const photos = images.slice(0, 2).map((url, idx) => ({
          url,
          caption: `${subcategory.name} - Reference ${idx + 1}`
        }));

        const executionDate = new Date();
        executionDate.setDate(executionDate.getDate() + Math.floor(7 + Math.random() * 45));

        const { error: jobError } = await supabase
          .from('jobs')
          .insert({
            customer_id: customerId,
            category_id: subcategory.id,
            title,
            description,
            budget_min: Math.round(budget * 0.8),
            budget_max: budget,
            location,
            latitude: city.lat,
            longitude: city.lng,
            execution_date_start: executionDate.toISOString().split('T')[0],
            preferred_time: ['Morning', 'Afternoon', 'Evening', 'Flexible'][i % 4],
            photos,
            status: 'Open'
          });

        if (jobError) {
          errors.push(`Job: ${subcategory.name} #${i + 1}`);
          console.error(jobError.message);
        } else {
          jobsCreated++;
        }
      }
    }

    const result = {
      success: true,
      providersCreated,
      customersCreated: customerIds.length,
      servicesCreated,
      jobsCreated,
      subcategoriesProcessed: subcategories?.length || 0,
      errorCount: errors.length,
      sampleErrors: errors.slice(0, 10)
    };

    console.log('Generation complete:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
