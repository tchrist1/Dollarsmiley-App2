import { supabase } from '../lib/supabase';

// US Cities with realistic distribution
const US_CITIES = [
  { city: 'New York', state: 'NY', lat: 40.7128, lng: -74.0060 },
  { city: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
  { city: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
  { city: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
  { city: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740 },
  { city: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652 },
  { city: 'San Antonio', state: 'TX', lat: 29.4241, lng: -98.4936 },
  { city: 'San Diego', state: 'CA', lat: 32.7157, lng: -117.1611 },
  { city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.7970 },
  { city: 'Austin', state: 'TX', lat: 30.2672, lng: -97.7431 },
  { city: 'San Francisco', state: 'CA', lat: 37.7749, lng: -122.4194 },
  { city: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321 },
  { city: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
  { city: 'Boston', state: 'MA', lat: 42.3601, lng: -71.0589 },
  { city: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 },
  { city: 'Atlanta', state: 'GA', lat: 33.7490, lng: -84.3880 },
  { city: 'Nashville', state: 'TN', lat: 36.1627, lng: -86.7816 },
  { city: 'Portland', state: 'OR', lat: 45.5152, lng: -122.6784 },
  { city: 'Las Vegas', state: 'NV', lat: 36.1699, lng: -115.1398 },
  { city: 'Charlotte', state: 'NC', lat: 35.2271, lng: -80.8431 }
];

// High-quality service images by category
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

// Get images for subcategory
function getImagesForSubcategory(subcategorySlug: string): string[] {
  if (subcategorySlug.includes('planning') || subcategorySlug.includes('coordination')) {
    return CATEGORY_IMAGES['event-planning'];
  } else if (subcategorySlug.includes('venue') || subcategorySlug.includes('space')) {
    return CATEGORY_IMAGES['venue'];
  } else if (subcategorySlug.includes('catering') || subcategorySlug.includes('food') || subcategorySlug.includes('beverage')) {
    return CATEGORY_IMAGES['catering'];
  } else if (subcategorySlug.includes('dj') || subcategorySlug.includes('music') || subcategorySlug.includes('band')) {
    return CATEGORY_IMAGES['music'];
  } else if (subcategorySlug.includes('decor') || subcategorySlug.includes('floral') || subcategorySlug.includes('balloon')) {
    return CATEGORY_IMAGES['decor'];
  } else if (subcategorySlug.includes('photo') || subcategorySlug.includes('video')) {
    return CATEGORY_IMAGES['photography'];
  } else if (subcategorySlug.includes('makeup') || subcategorySlug.includes('hair') || subcategorySlug.includes('beauty') || subcategorySlug.includes('braid')) {
    return CATEGORY_IMAGES['beauty'];
  } else if (subcategorySlug.includes('kid') || subcategorySlug.includes('birthday') || subcategorySlug.includes('bounce')) {
    return CATEGORY_IMAGES['kids'];
  } else if (subcategorySlug.includes('av') || subcategorySlug.includes('tech') || subcategorySlug.includes('lighting')) {
    return CATEGORY_IMAGES['tech'];
  } else if (subcategorySlug.includes('handyman') || subcategorySlug.includes('furniture') || subcategorySlug.includes('mounting')) {
    return CATEGORY_IMAGES['handyman'];
  }
  return CATEGORY_IMAGES['default'];
}

// Generate rating between 4.5 and 5.0
function generateRating(): number {
  return Number((4.5 + Math.random() * 0.5).toFixed(1));
}

// Generate review count between 20 and 500
function generateReviewCount(): number {
  return Math.floor(20 + Math.random() * 480);
}

// Generate price based on category
function generatePrice(subcategorySlug: string): number {
  const priceRanges: Record<string, { min: number; max: number }> = {
    'wedding': { min: 2000, max: 8000 },
    'corporate': { min: 1500, max: 6000 },
    'full-service': { min: 1200, max: 5000 },
    'catering': { min: 800, max: 3500 },
    'photography': { min: 500, max: 2500 },
    'videography': { min: 600, max: 3000 },
    'dj': { min: 400, max: 1500 },
    'band': { min: 800, max: 3000 },
    'venue': { min: 1000, max: 5000 },
    'bartending': { min: 300, max: 1200 },
    'makeup': { min: 100, max: 500 },
    'hair': { min: 80, max: 400 },
    'decor': { min: 500, max: 3000 },
    'floral': { min: 300, max: 2000 },
    'entertainment': { min: 400, max: 2000 },
    'tech': { min: 500, max: 2500 },
    'handyman': { min: 80, max: 300 },
    'default': { min: 150, max: 800 }
  };

  let range = priceRanges.default;
  for (const [key, value] of Object.entries(priceRanges)) {
    if (subcategorySlug.includes(key)) {
      range = value;
      break;
    }
  }

  return Math.round(range.min + Math.random() * (range.max - range.min));
}

// Generate professional provider names
function generateProviderName(subcategoryName: string, index: number): string {
  const prefixes = ['Elite', 'Premier', 'Signature', 'Luxury', 'Pro', 'Expert', 'Master', 'Exclusive', 'Royal', 'Prestige'];
  const suffixes = ['Services', 'Professionals', 'Experts', 'Co', 'Group', 'Team', 'Solutions', 'Collective', 'Studio', 'LLC'];

  const prefix = prefixes[index % prefixes.length];
  const suffix = suffixes[Math.floor(index / prefixes.length) % suffixes.length];

  return `${prefix} ${subcategoryName} ${suffix}`;
}

// Generate premium descriptions
function generateDescription(subcategoryName: string, providerName: string): string {
  const templates = [
    `${providerName} specializes in delivering exceptional ${subcategoryName} with over 15 years of experience. We pride ourselves on meticulous attention to detail, innovative solutions, and creating unforgettable experiences. Fully licensed, insured, and highly recommended by hundreds of satisfied clients.`,
    `Experience excellence with ${providerName}. Our award-winning ${subcategoryName} team combines creativity, professionalism, and reliability to exceed your expectations. We handle every aspect from initial consultation to flawless execution, ensuring your complete satisfaction.`,
    `${providerName} offers premium ${subcategoryName} tailored to your unique vision and needs. Our experienced professionals use cutting-edge techniques and top-tier equipment to deliver outstanding results. We guarantee quality, punctuality, and personalized service.`,
    `Trust ${providerName} for world-class ${subcategoryName}. We bring expertise, passion, and a client-focused approach to every project. From concept to completion, we ensure seamless coordination and stress-free experiences that exceed industry standards.`,
    `${providerName} transforms your vision into reality with exceptional ${subcategoryName}. Our talented team manages every detail with precision, creativity, and care. We're committed to making your event or project memorable, elegant, and perfectly executed.`
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

// Generate job description
function generateJobDescription(subcategoryName: string): string {
  const templates = [
    `Seeking experienced ${subcategoryName} professional for an upcoming project. Looking for someone with proven track record, excellent reviews, and attention to detail. Project timeline is flexible. Please respond with your portfolio, rates, and availability.`,
    `Need reliable ${subcategoryName} provider. Ideal candidate should have professional experience, necessary equipment, and positive client feedback. Budget is negotiable for quality work. Serious inquiries only with references.`,
    `Looking for talented ${subcategoryName} expert. Must be professional, punctual, and dedicated to excellence. Project details will be discussed with qualified candidates. Please include samples of previous work when responding.`,
    `Hiring ${subcategoryName} specialist for important event. Seeking creative professional who can deliver exceptional results. Must have insurance and verifiable experience. Competitive compensation for the right person.`,
    `Professional ${subcategoryName} services needed. Looking for experienced provider with strong portfolio and client testimonials. Must be available for consultation and committed to meeting deadlines. Quality is priority.`
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

// Create demo provider profile
async function createDemoProvider(subcategoryName: string, index: number, city: any) {
  const providerName = generateProviderName(subcategoryName, index);
  const email = `provider-${subcategoryName.toLowerCase().replace(/\s+/g, '-')}-${index}@dollarsmiley-demo.com`;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        email,
        full_name: providerName,
        user_type: 'Provider',
        phone: `555-${String(Math.floor(1000 + Math.random() * 9000))}`,
        location: `${city.city}, ${city.state}`,
        latitude: city.lat,
        longitude: city.lng,
        bio: `Professional ${subcategoryName} provider serving the ${city.city} area. Licensed, insured, and highly rated.`
      })
      .select('id')
      .maybeSingle();

    if (error) {
      console.error(`Error creating provider: ${error.message}`);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Error in createDemoProvider:', error);
    return null;
  }
}

// Create demo customer profile
async function createDemoCustomer(index: number, city: any) {
  const email = `customer-${index}@dollarsmiley-demo.com`;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        email,
        full_name: `Demo Customer ${index}`,
        user_type: 'Customer',
        phone: `555-${String(Math.floor(1000 + Math.random() * 9000))}`,
        location: `${city.city}, ${city.state}`,
        latitude: city.lat,
        longitude: city.lng
      })
      .select('id')
      .maybeSingle();

    if (error) {
      console.error(`Error creating customer: ${error.message}`);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Error in createDemoCustomer:', error);
    return null;
  }
}

// Generate service listing
async function generateServiceListing(
  subcategoryId: string,
  subcategorySlug: string,
  subcategoryName: string,
  index: number,
  providerId: string,
  city: any,
  images: string[]
) {
  const providerName = generateProviderName(subcategoryName, index);
  const price = generatePrice(subcategorySlug);
  const rating = generateRating();
  const reviewCount = generateReviewCount();
  const description = generateDescription(subcategoryName, providerName);

  const title = `Professional ${subcategoryName} by ${providerName}`;
  const photos = images.slice(0, 3 + Math.floor(Math.random() * 3)).map((url, idx) => ({
    url,
    caption: `${subcategoryName} - Photo ${idx + 1}`
  }));

  try {
    const { data, error } = await supabase
      .from('service_listings')
      .insert({
        provider_id: providerId,
        category_id: subcategoryId,
        title,
        description,
        base_price: price,
        pricing_type: index % 2 === 0 ? 'Fixed' : 'Hourly',
        photos,
        location: `${city.city}, ${city.state}`,
        latitude: city.lat,
        longitude: city.lng,
        status: 'Active',
        estimated_duration: 120 + Math.floor(Math.random() * 240),
        delivery_method: index % 3 === 0 ? 'In-Person' : index % 3 === 1 ? 'Remote' : 'Both',
        is_verified: Math.random() > 0.3
      })
      .select('id')
      .maybeSingle();

    if (error) {
      console.error(`Error creating service: ${error.message}`);
      return null;
    }

    // Add rating and reviews count (via a separate update if needed)
    if (data?.id) {
      await supabase
        .from('service_listings')
        .update({
          average_rating: rating,
          total_reviews: reviewCount
        })
        .eq('id', data.id);
    }

    return data?.id || null;
  } catch (error) {
    console.error('Error in generateServiceListing:', error);
    return null;
  }
}

// Generate job listing
async function generateJobListing(
  subcategoryId: string,
  subcategorySlug: string,
  subcategoryName: string,
  index: number,
  customerId: string,
  city: any,
  images: string[]
) {
  const budget = Math.round(generatePrice(subcategorySlug) * 0.85);
  const description = generateJobDescription(subcategoryName);

  const jobTitles = [
    `Need Professional ${subcategoryName}`,
    `Looking for ${subcategoryName} Expert`,
    `${subcategoryName} Services Required`,
    `Seeking Experienced ${subcategoryName} Provider`,
    `Hire ${subcategoryName} Professional`
  ];

  const title = jobTitles[index % jobTitles.length];
  const photos = images.slice(0, 2).map((url, idx) => ({
    url,
    caption: `${subcategoryName} - Reference ${idx + 1}`
  }));

  const executionDate = new Date();
  executionDate.setDate(executionDate.getDate() + Math.floor(7 + Math.random() * 45));

  try {
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        customer_id: customerId,
        category_id: subcategoryId,
        title,
        description,
        budget_min: Math.round(budget * 0.8),
        budget_max: budget,
        location: `${city.city}, ${city.state}`,
        latitude: city.lat,
        longitude: city.lng,
        execution_date_start: executionDate.toISOString().split('T')[0],
        preferred_time: ['Morning', 'Afternoon', 'Evening', 'Flexible'][index % 4],
        photos,
        status: 'Open'
      })
      .select('id')
      .maybeSingle();

    if (error) {
      console.error(`Error creating job: ${error.message}`);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Error in generateJobListing:', error);
    return null;
  }
}

// Main generation function
export async function generatePremiumDemoData() {
  console.log('Starting premium demo data generation...');

  const stats = {
    providersCreated: 0,
    customersCreated: 0,
    servicesCreated: 0,
    jobsCreated: 0,
    subcategoriesProcessed: 0,
    errors: [] as string[]
  };

  try {
    // Get all subcategories
    const { data: subcategories, error: catError } = await supabase
      .from('categories')
      .select('id, slug, name, parent_id')
      .not('parent_id', 'is', null)
      .order('name');

    if (catError) throw catError;

    console.log(`Found ${subcategories?.length || 0} subcategories`);

    // Create demo customers
    const customerIds: string[] = [];
    for (let i = 0; i < 20; i++) {
      const city = US_CITIES[i % US_CITIES.length];
      const customerId = await createDemoCustomer(i, city);
      if (customerId) {
        customerIds.push(customerId);
        stats.customersCreated++;
      }
    }

    console.log(`Created ${stats.customersCreated} demo customers`);

    // Process each subcategory
    for (const subcategory of subcategories || []) {
      console.log(`Processing: ${subcategory.name}`);

      const images = getImagesForSubcategory(subcategory.slug);
      const listingsCount = subcategory.slug.includes('wedding') ||
                           subcategory.slug.includes('corporate') ||
                           subcategory.slug.includes('catering') ? 10 : 7;

      // Generate service listings
      for (let i = 0; i < listingsCount; i++) {
        const city = US_CITIES[Math.floor(Math.random() * US_CITIES.length)];

        // Create provider
        const providerId = await createDemoProvider(subcategory.name, i, city);
        if (!providerId) {
          stats.errors.push(`Failed to create provider for ${subcategory.name} #${i + 1}`);
          continue;
        }
        stats.providersCreated++;

        // Create service listing
        const serviceId = await generateServiceListing(
          subcategory.id,
          subcategory.slug,
          subcategory.name,
          i,
          providerId,
          city,
          images
        );

        if (serviceId) {
          stats.servicesCreated++;
        } else {
          stats.errors.push(`Failed to create service for ${subcategory.name} #${i + 1}`);
        }
      }

      // Generate job listings
      for (let i = 0; i < listingsCount; i++) {
        const city = US_CITIES[Math.floor(Math.random() * US_CITIES.length)];
        const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];

        const jobId = await generateJobListing(
          subcategory.id,
          subcategory.slug,
          subcategory.name,
          i,
          customerId,
          city,
          images
        );

        if (jobId) {
          stats.jobsCreated++;
        } else {
          stats.errors.push(`Failed to create job for ${subcategory.name} #${i + 1}`);
        }
      }

      stats.subcategoriesProcessed++;
    }

    console.log('Demo data generation complete!');
    console.log(JSON.stringify(stats, null, 2));

    return {
      success: true,
      stats
    };

  } catch (error: any) {
    console.error('Fatal error:', error.message);
    stats.errors.push(`Fatal error: ${error.message}`);
    return {
      success: false,
      stats
    };
  }
}

// Run if executed directly
if (require.main === module) {
  generatePremiumDemoData()
    .then(result => {
      console.log('\nFinal Result:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}
