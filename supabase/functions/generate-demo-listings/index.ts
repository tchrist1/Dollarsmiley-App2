import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateDemoRequest {
  subcategoryId?: string; // Optional: generate for specific subcategory
  generateAll?: boolean; // Generate for all subcategories
  userLocation?: {
    latitude: number;
    longitude: number;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single();

    if (!profile || profile.user_type !== "Admin") {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const requestData: GenerateDemoRequest = await req.json();
    const userLocation = requestData.userLocation || {
      latitude: 39.2904,
      longitude: -76.6122,
    }; // Baltimore default

    // Create demo provider and customer accounts
    const demoProviderId = await getOrCreateDemoProvider(supabase);
    const demoCustomerId = await getOrCreateDemoCustomer(supabase);

    let result;

    if (requestData.generateAll) {
      // Generate for all subcategories
      result = await generateAllDemoListings(
        supabase,
        userLocation,
        demoProviderId,
        demoCustomerId
      );
    } else if (requestData.subcategoryId) {
      // Generate for specific subcategory
      const { data: subcategory } = await supabase
        .from("categories")
        .select("id, slug, name")
        .eq("id", requestData.subcategoryId)
        .single();

      if (!subcategory) {
        return new Response(
          JSON.stringify({ error: "Subcategory not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      result = await generateDemoListingsForSubcategory(
        supabase,
        subcategory.id,
        subcategory.slug,
        subcategory.name,
        userLocation,
        demoProviderId,
        demoCustomerId
      );
    } else {
      return new Response(
        JSON.stringify({
          error: "Must specify either subcategoryId or generateAll",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating demo listings:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function getOrCreateDemoProvider(supabase: any): Promise<string> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", "demo-provider@dollarsmiley.internal")
    .single();

  if (existing) return existing.id;

  // Create demo provider profile
  const demoId = crypto.randomUUID();
  await supabase.from("profiles").insert({
    id: demoId,
    email: "demo-provider@dollarsmiley.internal",
    full_name: "Demo Provider",
    user_type: "Provider",
    bio: "Demo account for generating sample listings",
    location: "Baltimore, MD",
    latitude: 39.2904,
    longitude: -76.6122,
    service_radius: 25,
    rating_average: 4.8,
    rating_count: 50,
  });

  return demoId;
}

async function getOrCreateDemoCustomer(supabase: any): Promise<string> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", "demo-customer@dollarsmiley.internal")
    .single();

  if (existing) return existing.id;

  // Create demo customer profile
  const demoId = crypto.randomUUID();
  await supabase.from("profiles").insert({
    id: demoId,
    email: "demo-customer@dollarsmiley.internal",
    full_name: "Demo Customer",
    user_type: "Customer",
    location: "Baltimore, MD",
    latitude: 39.2904,
    longitude: -76.6122,
  });

  return demoId;
}

async function generateDemoListingsForSubcategory(
  supabase: any,
  subcategoryId: string,
  subcategorySlug: string,
  subcategoryName: string,
  userLocation: { latitude: number; longitude: number },
  demoProviderId: string,
  demoCustomerId: string
): Promise<{ services: number; jobs: number }> {
  let servicesCreated = 0;
  let jobsCreated = 0;

  const providerNames = [
    `${subcategoryName} Pro Services`,
    `Elite ${subcategoryName} MD`,
    `Premier ${subcategoryName} Solutions`,
  ];

  const imageUrls = [
    "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg",
    "https://images.pexels.com/photos/3182759/pexels-photo-3182759.jpeg",
    "https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg",
  ];

  // Generate 3 service listings
  for (let i = 0; i < 3; i++) {
    const location = generateNearbyLocation(
      userLocation.latitude,
      userLocation.longitude
    );
    const providerName = providerNames[i];
    const imageUrl = imageUrls[i];
    const price = 100 + Math.random() * 400;

    const { data: listing, error } = await supabase
      .from("service_listings")
      .insert({
        provider_id: demoProviderId,
        category_id: subcategoryId,
        title: `${subcategoryName} - ${providerName}`,
        description: `Professional ${subcategoryName.toLowerCase()} services with years of experience. Licensed and insured. Quality work guaranteed.`,
        base_price: Math.round(price),
        pricing_type: "Fixed",
        photos: [{ url: imageUrl, caption: providerName }],
        location: location.locationName,
        latitude: location.latitude,
        longitude: location.longitude,
        status: "Active",
        is_demo: true,
        estimated_duration: 120,
      })
      .select("id")
      .single();

    if (!error && listing) {
      await supabase.from("demo_listings_metadata").insert({
        listing_id: listing.id,
        listing_type: "Service",
        category_id: subcategoryId,
        subcategory_id: subcategoryId,
        provider_name: providerName,
        image_url: imageUrl,
        is_active: true,
      });
      servicesCreated++;
    }
  }

  // Generate 3 job listings
  for (let i = 0; i < 3; i++) {
    const location = generateNearbyLocation(
      userLocation.latitude,
      userLocation.longitude
    );
    const budget = 80 + Math.random() * 320;

    const executionDate = new Date();
    executionDate.setDate(executionDate.getDate() + 7);

    const { data: listing, error } = await supabase
      .from("jobs")
      .insert({
        customer_id: demoCustomerId,
        category_id: subcategoryId,
        title: `Need ${subcategoryName} professional`,
        description: `Looking for reliable ${subcategoryName.toLowerCase()} service. Please contact if available and interested.`,
        budget_min: Math.round(budget * 0.8),
        budget_max: Math.round(budget),
        location: location.locationName,
        latitude: location.latitude,
        longitude: location.longitude,
        execution_date_start: executionDate.toISOString().split("T")[0],
        preferred_time: ["Morning", "Afternoon", "Evening"][i % 3],
        status: "Open",
        is_demo: true,
      })
      .select("id")
      .single();

    if (!error && listing) {
      await supabase.from("demo_listings_metadata").insert({
        listing_id: listing.id,
        listing_type: "Job",
        category_id: subcategoryId,
        subcategory_id: subcategoryId,
        provider_name: "Demo Customer",
        image_url: imageUrls[i % 3],
        is_active: true,
      });
      jobsCreated++;
    }
  }

  return { services: servicesCreated, jobs: jobsCreated };
}

async function generateAllDemoListings(
  supabase: any,
  userLocation: { latitude: number; longitude: number },
  demoProviderId: string,
  demoCustomerId: string
): Promise<{
  totalServices: number;
  totalJobs: number;
  subcategoriesProcessed: number;
}> {
  const { data: subcategories } = await supabase
    .from("categories")
    .select("id, slug, name")
    .not("parent_id", "is", null);

  let totalServices = 0;
  let totalJobs = 0;

  for (const subcategory of subcategories || []) {
    const result = await generateDemoListingsForSubcategory(
      supabase,
      subcategory.id,
      subcategory.slug,
      subcategory.name,
      userLocation,
      demoProviderId,
      demoCustomerId
    );

    totalServices += result.services;
    totalJobs += result.jobs;
  }

  return {
    totalServices,
    totalJobs,
    subcategoriesProcessed: subcategories?.length || 0,
  };
}

function generateNearbyLocation(
  centerLat: number,
  centerLng: number,
  radiusMiles: number = 5
): { latitude: number; longitude: number; locationName: string } {
  const radiusDegrees = radiusMiles / 69.0;
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radiusDegrees;

  const latitude = centerLat + distance * Math.cos(angle);
  const longitude = centerLng + distance * Math.sin(angle);

  const neighborhoods = [
    "Downtown",
    "Harbor East",
    "Canton",
    "Fells Point",
    "Federal Hill",
    "Mt. Vernon",
    "Hampden",
    "Roland Park",
    "Towson",
    "Columbia",
  ];
  const locationName =
    neighborhoods[Math.floor(Math.random() * neighborhoods.length)];

  return { latitude, longitude, locationName };
}
