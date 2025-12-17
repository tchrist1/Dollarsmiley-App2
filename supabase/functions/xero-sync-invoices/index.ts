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

    // Get Xero connection
    const { data: connection, error: connError } = await supabase
      .from('xero_connections')
      .select('*')
      .eq('team_id', team_id)
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: 'No active Xero connection found' }),
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
    const { data: logData, error: logError } = await supabase.rpc('start_xero_sync', {
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
      query = query.eq('status', 'pending');
    }

    const { data: invoices, error: invoicesError } = await query;

    if (invoicesError) {
      await supabase.rpc('complete_xero_sync', {
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
      await supabase.rpc('complete_xero_sync', {
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

    const xeroApiUrl = 'https://api.xero.com/api.xro/2.0';
    let succeeded = 0;
    let failed = 0;
    const errors: any[] = [];

    // Sync each invoice
    for (const invoice of invoices) {
      try {
        // Check if invoice already exists in Xero
        const { data: mapping } = await supabase
          .from('xero_entity_map')
          .select('xero_id, updated_date_utc')
          .eq('connection_id', connection.id)
          .eq('entity_type', 'invoice')
          .eq('local_id', invoice.id)
          .maybeSingle();

        // Build Xero invoice object
        const xeroInvoice: any = {
          Type: 'ACCREC', // Accounts Receivable
          Contact: {
            ContactID: 'default-contact-id', // Would need to map to actual Xero contact
          },
          LineItems: invoice.line_items.map((item: any) => ({
            Description: item.description,
            Quantity: item.quantity,
            UnitAmount: item.unit_price,
            LineAmount: item.total,
            AccountCode: '200', // Default sales account
          })),
          Date: invoice.created_at.split('T')[0],
          DueDate: invoice.due_date?.split('T')[0],
          Reference: invoice.invoice_number,
          Status: invoice.status === 'paid' ? 'PAID' : 'SUBMITTED',
        };

        let xeroResponse;

        if (mapping?.xero_id) {
          // Update existing invoice
          xeroInvoice.InvoiceID = mapping.xero_id;

          xeroResponse = await fetch(`${xeroApiUrl}/Invoices/${mapping.xero_id}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${connection.access_token}`,
              'xero-tenant-id': connection.tenant_id,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ Invoices: [xeroInvoice] }),
          });
        } else {
          // Create new invoice
          xeroResponse = await fetch(`${xeroApiUrl}/Invoices`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${connection.access_token}`,
              'xero-tenant-id': connection.tenant_id,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ Invoices: [xeroInvoice] }),
          });
        }

        if (!xeroResponse.ok) {
          const errorData = await xeroResponse.text();
          console.error(`Failed to sync invoice ${invoice.id}:`, errorData);
          errors.push({ invoice_id: invoice.id, error: errorData });
          failed++;
          continue;
        }

        const xeroData = await xeroResponse.json();
        const xeroInvoiceData = xeroData.Invoices?.[0];

        if (!xeroInvoiceData) {
          errors.push({ invoice_id: invoice.id, error: 'No invoice data returned' });
          failed++;
          continue;
        }

        // Update mapping
        await supabase.rpc('upsert_xero_mapping', {
          p_connection_id: connection.id,
          p_entity_type: 'invoice',
          p_local_id: invoice.id,
          p_xero_id: xeroInvoiceData.InvoiceID,
          p_updated_date_utc: xeroInvoiceData.UpdatedDateUTC,
        });

        succeeded++;
      } catch (error) {
        console.error(`Error syncing invoice ${invoice.id}:`, error);
        errors.push({ invoice_id: invoice.id, error: error.message });
        failed++;
      }
    }

    // Complete sync log
    await supabase.rpc('complete_xero_sync', {
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
    console.error('Xero sync error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
