import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ShippingRateRequest {
  originZip: string;
  destinationZip: string;
  weightOz: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  fulfillmentWindowDays: number;
  carrierPreference?: string[];
}

interface ShippingRateQuote {
  carrier: string;
  service_type: string;
  rate: number;
  delivery_days: number;
  delivery_date: string;
  is_fastest: boolean;
  is_cheapest: boolean;
  is_best_value: boolean;
}

function calculateUSPSRate(weightOz: number, zone: number): number {
  const weightLb = Math.ceil(weightOz / 16);

  const rateTable: Record<number, number[]> = {
    1: [8.95, 10.50, 12.00, 14.50, 17.00],
    2: [9.50, 11.25, 13.00, 15.75, 18.50],
    3: [10.25, 12.50, 14.75, 17.50, 20.25],
    4: [11.50, 14.25, 17.00, 20.50, 23.75],
    5: [12.75, 16.00, 19.25, 23.50, 27.25],
    6: [14.25, 18.25, 22.00, 27.00, 31.50],
    7: [15.75, 20.50, 25.00, 30.75, 36.00],
    8: [17.50, 23.00, 28.25, 35.00, 41.00],
  };

  const weightIndex = Math.min(Math.max(weightLb - 1, 0), 4);
  const zoneRates = rateTable[Math.min(zone, 8)];

  return zoneRates ? zoneRates[weightIndex] : 15.00;
}

function estimateZoneFromZips(originZip: string, destinationZip: string): number {
  const origin = parseInt(originZip.substring(0, 3));
  const dest = parseInt(destinationZip.substring(0, 3));
  const diff = Math.abs(origin - dest);

  if (diff < 50) return 2;
  if (diff < 150) return 3;
  if (diff < 300) return 4;
  if (diff < 600) return 5;
  if (diff < 1000) return 6;
  if (diff < 1400) return 7;
  return 8;
}

function calculateUPSRate(weightOz: number, zone: number): number {
  const uspsRate = calculateUSPSRate(weightOz, zone);
  return uspsRate * 1.15;
}

function calculateFedExRate(weightOz: number, zone: number): number {
  const uspsRate = calculateUSPSRate(weightOz, zone);
  return uspsRate * 1.20;
}

function calculateDeliveryDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: ShippingRateRequest = await req.json();

    const {
      originZip,
      destinationZip,
      weightOz,
      dimensions,
      fulfillmentWindowDays,
      carrierPreference = ["USPS", "UPS", "FedEx", "DHL"],
    } = body;

    if (!originZip || !destinationZip || !weightOz) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const zone = estimateZoneFromZips(originZip, destinationZip);
    const rates: ShippingRateQuote[] = [];

    if (carrierPreference.includes("USPS")) {
      const uspsRate = calculateUSPSRate(weightOz, zone);
      rates.push({
        carrier: "USPS",
        service_type: "Priority Mail",
        rate: uspsRate,
        delivery_days: zone <= 3 ? 2 : zone <= 5 ? 3 : 5,
        delivery_date: calculateDeliveryDate(zone <= 3 ? 2 : zone <= 5 ? 3 : 5),
        is_fastest: false,
        is_cheapest: false,
        is_best_value: false,
      });

      rates.push({
        carrier: "USPS",
        service_type: "Priority Mail Express",
        rate: uspsRate * 1.8,
        delivery_days: zone <= 5 ? 1 : 2,
        delivery_date: calculateDeliveryDate(zone <= 5 ? 1 : 2),
        is_fastest: false,
        is_cheapest: false,
        is_best_value: false,
      });

      rates.push({
        carrier: "USPS",
        service_type: "Ground Advantage",
        rate: uspsRate * 0.75,
        delivery_days: zone <= 3 ? 3 : zone <= 5 ? 5 : 7,
        delivery_date: calculateDeliveryDate(zone <= 3 ? 3 : zone <= 5 ? 5 : 7),
        is_fastest: false,
        is_cheapest: false,
        is_best_value: false,
      });
    }

    if (carrierPreference.includes("UPS")) {
      const upsRate = calculateUPSRate(weightOz, zone);
      rates.push({
        carrier: "UPS",
        service_type: "Ground",
        rate: upsRate,
        delivery_days: zone <= 3 ? 3 : zone <= 5 ? 5 : 7,
        delivery_date: calculateDeliveryDate(zone <= 3 ? 3 : zone <= 5 ? 5 : 7),
        is_fastest: false,
        is_cheapest: false,
        is_best_value: false,
      });

      rates.push({
        carrier: "UPS",
        service_type: "2nd Day Air",
        rate: upsRate * 1.6,
        delivery_days: 2,
        delivery_date: calculateDeliveryDate(2),
        is_fastest: false,
        is_cheapest: false,
        is_best_value: false,
      });

      rates.push({
        carrier: "UPS",
        service_type: "Next Day Air",
        rate: upsRate * 2.5,
        delivery_days: 1,
        delivery_date: calculateDeliveryDate(1),
        is_fastest: false,
        is_cheapest: false,
        is_best_value: false,
      });
    }

    if (carrierPreference.includes("FedEx")) {
      const fedexRate = calculateFedExRate(weightOz, zone);
      rates.push({
        carrier: "FedEx",
        service_type: "Ground",
        rate: fedexRate,
        delivery_days: zone <= 3 ? 3 : zone <= 5 ? 5 : 7,
        delivery_date: calculateDeliveryDate(zone <= 3 ? 3 : zone <= 5 ? 5 : 7),
        is_fastest: false,
        is_cheapest: false,
        is_best_value: false,
      });

      rates.push({
        carrier: "FedEx",
        service_type: "2Day",
        rate: fedexRate * 1.7,
        delivery_days: 2,
        delivery_date: calculateDeliveryDate(2),
        is_fastest: false,
        is_cheapest: false,
        is_best_value: false,
      });

      rates.push({
        carrier: "FedEx",
        service_type: "Overnight",
        rate: fedexRate * 2.8,
        delivery_days: 1,
        delivery_date: calculateDeliveryDate(1),
        is_fastest: false,
        is_cheapest: false,
        is_best_value: false,
      });
    }

    const validRates = rates.filter(rate => rate.delivery_days <= fulfillmentWindowDays);

    if (validRates.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No shipping options available within fulfillment window",
          rates: [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const sortedBySpeed = [...validRates].sort((a, b) => a.delivery_days - b.delivery_days);
    const sortedByPrice = [...validRates].sort((a, b) => a.rate - b.rate);

    if (sortedBySpeed[0]) {
      sortedBySpeed[0].is_fastest = true;
    }
    if (sortedByPrice[0]) {
      sortedByPrice[0].is_cheapest = true;
    }

    const bestValue = validRates.reduce((best, rate) => {
      const valueScore = (10 - rate.delivery_days) / rate.rate;
      const bestScore = (10 - best.delivery_days) / best.rate;
      return valueScore > bestScore ? rate : best;
    });
    bestValue.is_best_value = true;

    return new Response(
      JSON.stringify({ rates: validRates }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error calculating shipping rates:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});