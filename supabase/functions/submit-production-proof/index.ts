import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await req.json();
    const { production_order_id, proof_images, design_files, provider_notes } = body;

    // Get the latest version number
    const { data: existingProofs } = await supabase
      .from('proofs')
      .select('version_number')
      .eq('production_order_id', production_order_id)
      .order('version_number', { ascending: false })
      .limit(1);

    const versionNumber = existingProofs && existingProofs.length > 0 
      ? existingProofs[0].version_number + 1 
      : 1;

    // Create the proof
    const { data: proof, error: proofError } = await supabase
      .from('proofs')
      .insert({
        production_order_id,
        version_number: versionNumber,
        proof_images,
        design_files: design_files || [],
        provider_notes,
        status: 'pending',
      })
      .select()
      .single();

    if (proofError) throw proofError;

    // Update production order status
    await supabase
      .from('production_orders')
      .update({ status: 'proofing', updated_at: new Date().toISOString() })
      .eq('id', production_order_id);

    // Create timeline event
    await supabase.rpc('create_production_timeline_event', {
      order_id: production_order_id,
      event_type_param: 'proof_submitted',
      description_param: `Proof version ${versionNumber} submitted`,
      metadata_param: { version: versionNumber, proof_id: proof.id },
    });

    // Get production order details for notification
    const { data: order } = await supabase
      .from('production_orders')
      .select('customer_id')
      .eq('id', production_order_id)
      .single();

    // Send notification to customer
    if (order) {
      await supabase.from('notifications').insert({
        user_id: order.customer_id,
        title: 'New Proof Available',
        body: `Version ${versionNumber} of your custom product proof is ready for review`,
        type: 'proof_submitted',
        data: { production_order_id, proof_id: proof.id },
      });
    }

    return new Response(
      JSON.stringify({ proof, success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});