import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SubmitProofRequest {
  production_order_id: string;
  title: string;
  description?: string;
  proof_images: string[];
  design_file_ids?: string[];
  provider_notes?: string;
  estimated_production_time?: string;
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

    const requestData: SubmitProofRequest = await req.json();

    const { data: order, error: orderError } = await supabase
      .from('production_orders')
      .select('*')
      .eq('id', requestData.production_order_id)
      .single();

    if (orderError || !order) {
      throw new Error('Production order not found');
    }

    if (order.provider_id !== user.id) {
      throw new Error('Only the provider can submit proofs');
    }

    const { data: existingProofs } = await supabase
      .from('proofs')
      .select('version_number')
      .eq('production_order_id', requestData.production_order_id)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = existingProofs && existingProofs.length > 0
      ? existingProofs[0].version_number + 1
      : 1;

    const proofData = {
      production_order_id: requestData.production_order_id,
      version_number: nextVersion,
      title: requestData.title,
      description: requestData.description,
      proof_images: requestData.proof_images,
      design_file_ids: requestData.design_file_ids || [],
      provider_notes: requestData.provider_notes,
      estimated_production_time: requestData.estimated_production_time,
      status: 'pending_review',
      requires_customer_action: true,
      submitted_at: new Date().toISOString(),
    };

    const { data: proof, error: proofError } = await supabase
      .from('proofs')
      .insert(proofData)
      .select()
      .single();

    if (proofError) {
      console.error('Error creating proof:', proofError);
      throw new Error(`Failed to create proof: ${proofError.message}`);
    }

    const { error: statusError } = await supabase.rpc('update_production_order_status', {
      order_id: requestData.production_order_id,
      new_status: 'proof_submitted',
      triggered_by_user: user.id,
      event_description: `Proof version ${nextVersion} submitted for review`,
    });

    if (statusError) {
      console.error('Error updating order status:', statusError);
    }

    const { error: orderUpdateError } = await supabase
      .from('production_orders')
      .update({
        first_proof_submitted_at: nextVersion === 1 ? new Date().toISOString() : undefined,
      })
      .eq('id', requestData.production_order_id);

    if (orderUpdateError) {
      console.error('Error updating order:', orderUpdateError);
    }

    await supabase.from('notifications').insert({
      user_id: order.customer_id,
      type: 'proof_submitted',
      title: 'Proof Ready for Review',
      body: `Proof version ${nextVersion} for ${order.title} is ready for your review`,
      data: {
        production_order_id: order.id,
        proof_id: proof.id,
        order_number: order.order_number,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        proof,
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
    console.error('Error in submit-proof:', error);

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
