import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateProductionOrderRequest {
  customer_id: string;
  provider_id: string;
  listing_id?: string;
  product_type_id: string;
  title: string;
  description: string;
  quantity: number;
  specifications: any;
  special_instructions?: string;
  base_price: number;
  delivery_method?: string;
  delivery_address?: any;
  deadline_date?: string;
  is_rush_order?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const requestData: CreateProductionOrderRequest = await req.json();

    if (requestData.customer_id !== user.id) {
      throw new Error('Customer ID must match authenticated user');
    }

    const { data: productType, error: productTypeError } = await supabase
      .from('product_types')
      .select('*')
      .eq('id', requestData.product_type_id)
      .single();

    if (productTypeError || !productType) {
      throw new Error('Invalid product type');
    }

    const estimatedCompletionDate = new Date();
    estimatedCompletionDate.setDate(
      estimatedCompletionDate.getDate() + (productType.typical_turnaround_days || 7)
    );

    const orderData = {
      customer_id: requestData.customer_id,
      provider_id: requestData.provider_id,
      listing_id: requestData.listing_id,
      product_type_id: requestData.product_type_id,
      title: requestData.title,
      description: requestData.description,
      quantity: requestData.quantity || 1,
      specifications: requestData.specifications,
      special_instructions: requestData.special_instructions,
      status: productType.requires_consultation ? 'consultation_pending' : 'design_in_progress',
      max_revisions_allowed: productType.max_revisions || 2,
      base_price: requestData.base_price,
      total_price: requestData.base_price + (requestData.is_rush_order ? requestData.base_price * 0.2 : 0),
      delivery_method: requestData.delivery_method,
      delivery_address: requestData.delivery_address,
      deadline_date: requestData.deadline_date,
      estimated_completion_date: estimatedCompletionDate.toISOString(),
      is_rush_order: requestData.is_rush_order || false,
      requires_approval: productType.requires_proof_approval,
      rush_fee: requestData.is_rush_order ? requestData.base_price * 0.2 : 0,
    };

    const { data: order, error: orderError } = await supabase
      .from('production_orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error('Error creating production order:', orderError);
      throw new Error(`Failed to create production order: ${orderError.message}`);
    }

    await supabase.from('production_timeline_events').insert({
      production_order_id: order.id,
      event_type: 'order_created',
      event_title: 'Production Order Created',
      event_description: `New ${productType.name} order created`,
      triggered_by: user.id,
      new_status: order.status,
      occurred_at: new Date().toISOString(),
    });

    const notificationTitle = 'New Custom Product Order';
    const notificationBody = `New order for ${requestData.title}`;

    await supabase.from('notifications').insert({
      user_id: requestData.provider_id,
      type: 'production_order_created',
      title: notificationTitle,
      body: notificationBody,
      data: {
        production_order_id: order.id,
        order_number: order.order_number,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        production_order: order,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in create-production-order:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
