import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

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

    const { team_id, invoice_ids } = await req.json();

    if (!team_id) {
      return new Response(
        JSON.stringify({ error: 'team_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get QuickBooks connection
    const { data: connection, error: connError } = await supabase
      .from('quickbooks_connections')
      .select('*')
      .eq('team_id', team_id)
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: 'No active QuickBooks connection found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token needs refresh
    const tokenExpiry = new Date(connection.token_expires_at);
    const now = new Date();
    if (tokenExpiry <= now) {
      return new Response(
        JSON.stringify({ error: 'Access token expired, please refresh' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start sync log
    const { data: logData, error: logError } = await supabase.rpc('start_quickbooks_sync', {
      p_connection_id: connection.id,
      p_entity_type: 'invoice',
      p_direction: 'to_quickbooks',
    });

    if (logError) {
      console.error('Failed to start sync log:', logError);
      return new Response(
        JSON.stringify({ error: 'Failed to start sync' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const logId = logData;

    // Get invoices to sync
    let query = supabase
      .from('team_invoices')
      .select('*')
      .eq('team_id', team_id);

    if (invoice_ids && invoice_ids.length > 0) {
      query = query.in('id', invoice_ids);
    } else {
      // Sync pending invoices
      query = query.eq('status', 'pending');
    }

    const { data: invoices, error: invoicesError } = await query;

    if (invoicesError) {
      await supabase.rpc('complete_quickbooks_sync', {
        p_log_id: logId,
        p_status: 'failed',
        p_processed: 0,
        p_succeeded: 0,
        p_failed: 0,
        p_error_message: 'Failed to fetch invoices',
      });

      return new Response(
        JSON.stringify({ error: 'Failed to fetch invoices' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!invoices || invoices.length === 0) {
      await supabase.rpc('complete_quickbooks_sync', {
        p_log_id: logId,
        p_status: 'completed',
        p_processed: 0,
        p_succeeded: 0,
        p_failed: 0,
      });

      return new Response(
        JSON.stringify({ message: 'No invoices to sync', synced: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const qbApiUrl = `https://quickbooks.api.intuit.com/v3/company/${connection.realm_id}`;
    let succeeded = 0;
    let failed = 0;
    const errors: any[] = [];

    // Sync each invoice
    for (const invoice of invoices) {
      try {
        // Check if invoice already exists in QuickBooks
        const { data: mapping } = await supabase
          .from('quickbooks_entity_map')
          .select('quickbooks_id, sync_token')
          .eq('connection_id', connection.id)
          .eq('entity_type', 'invoice')
          .eq('local_id', invoice.id)
          .maybeSingle();

        // Build QuickBooks invoice object
        const qbInvoice: any = {
          Line: invoice.line_items.map((item: any, index: number) => ({
            Id: String(index + 1),
            LineNum: index + 1,
            Description: item.description,
            Amount: item.total,
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              Qty: item.quantity,
              UnitPrice: item.unit_price,
            },
          })),
          CustomerRef: {
            value: '1', // Would need to map to actual QB customer
          },
          DueDate: invoice.due_date?.split('T')[0],
          TxnDate: invoice.created_at.split('T')[0],
        };

        let qbResponse;

        if (mapping?.quickbooks_id) {
          // Update existing invoice
          qbInvoice.Id = mapping.quickbooks_id;
          qbInvoice.SyncToken = mapping.sync_token || '0';

          qbResponse = await fetch(`${qbApiUrl}/invoice?minorversion=65`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${connection.access_token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(qbInvoice),
          });
        } else {
          // Create new invoice
          qbResponse = await fetch(`${qbApiUrl}/invoice?minorversion=65`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${connection.access_token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(qbInvoice),
          });
        }

        if (!qbResponse.ok) {
          const errorData = await qbResponse.text();
          console.error(`Failed to sync invoice ${invoice.id}:`, errorData);
          errors.push({ invoice_id: invoice.id, error: errorData });
          failed++;
          continue;
        }

        const qbData = await qbResponse.json();
        const qbInvoiceData = qbData.Invoice;

        // Update mapping
        await supabase.rpc('upsert_quickbooks_mapping', {
          p_connection_id: connection.id,
          p_entity_type: 'invoice',
          p_local_id: invoice.id,
          p_quickbooks_id: qbInvoiceData.Id,
          p_sync_token: qbInvoiceData.SyncToken,
        });

        succeeded++;
      } catch (error) {
        console.error(`Error syncing invoice ${invoice.id}:`, error);
        errors.push({ invoice_id: invoice.id, error: error.message });
        failed++;
      }
    }

    // Complete sync log
    await supabase.rpc('complete_quickbooks_sync', {
      p_log_id: logId,
      p_status: failed > 0 ? 'failed' : 'completed',
      p_processed: invoices.length,
      p_succeeded: succeeded,
      p_failed: failed,
      p_error_message: errors.length > 0 ? `${failed} invoices failed to sync` : null,
      p_error_details: errors.length > 0 ? errors : null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        processed: invoices.length,
        succeeded,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('QuickBooks sync error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
