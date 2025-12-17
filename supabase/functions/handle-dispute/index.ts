import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Unauthorized");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { action, bookingId, disputeId, disputeType, description, evidenceUrls, resolution, refundAmount } = await req.json();

    if (action === "file") {
      if (!bookingId || !disputeType || !description) {
        throw new Error("Missing required fields");
      }

      const { data: booking } = await supabaseClient
        .from("bookings")
        .select("customer_id, provider_id")
        .eq("id", bookingId)
        .single();

      if (!booking) {
        throw new Error("Booking not found");
      }

      if (booking.customer_id !== user.id && booking.provider_id !== user.id) {
        throw new Error("Unauthorized to file dispute for this booking");
      }

      const filedAgainst = booking.customer_id === user.id ? booking.provider_id : booking.customer_id;

      const { data: existingDispute } = await supabaseClient
        .from("disputes")
        .select("id")
        .eq("booking_id", bookingId)
        .in("status", ["Open", "UnderReview"])
        .single();

      if (existingDispute) {
        throw new Error("An active dispute already exists for this booking");
      }

      const { data: escrowHold } = await supabaseClient
        .from("escrow_holds")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("status", "Held")
        .single();

      const amountAtRisk = escrowHold?.amount || 0;
      let priority = "Medium";

      if (amountAtRisk > 500) {
        priority = "High";
      } else if (amountAtRisk > 1000) {
        priority = "Urgent";
      } else if (disputeType === "NoShow") {
        priority = "High";
      }

      const responseDeadline = new Date();
      responseDeadline.setHours(responseDeadline.getHours() + (priority === "Urgent" ? 24 : 48));

      const { data: dispute } = await supabaseClient
        .from("disputes")
        .insert({
          booking_id: bookingId,
          escrow_hold_id: escrowHold?.id,
          filed_by: user.id,
          filed_against: filedAgainst,
          dispute_type: disputeType,
          description,
          evidence_urls: evidenceUrls || [],
          status: "Open",
          priority,
          response_deadline: responseDeadline.toISOString(),
        })
        .select()
        .single();

      if (escrowHold) {
        await supabaseClient
          .from("escrow_holds")
          .update({
            status: "Disputed",
          })
          .eq("id", escrowHold.id);
      }

      await supabaseClient
        .from("bookings")
        .update({
          status: "Disputed",
        })
        .eq("id", bookingId);

      const notificationApiUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`;

      await fetch(notificationApiUrl, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: filedAgainst,
          title: "Dispute Filed",
          message: `A dispute has been filed for booking. Type: ${disputeType}`,
          type: "dispute_filed",
          relatedId: dispute.id,
        }),
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Dispute filed successfully",
          disputeId: dispute.id,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (action === "resolve") {
      if (!disputeId || !resolution) {
        throw new Error("Missing required fields");
      }

      const { data: dispute } = await supabaseClient
        .from("disputes")
        .select("*, bookings(customer_id, provider_id)")
        .eq("id", disputeId)
        .single();

      if (!dispute) {
        throw new Error("Dispute not found");
      }

      const refundValue = refundAmount || 0;
      let resolutionType = "NoRefund";

      if (refundValue > 0) {
        const escrowAmount = dispute.escrow_hold?.amount || 0;
        resolutionType = refundValue >= escrowAmount ? "FullRefund" : "PartialRefund";
      }

      await supabaseClient
        .from("disputes")
        .update({
          status: "Resolved",
          resolution,
          resolution_type: resolutionType,
          refund_amount: refundValue,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", disputeId);

      if (refundAmount && refundAmount > 0) {
        const refundApiUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/handle-refund`;
        await fetch(refundApiUrl, {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingId: dispute.booking_id,
            amount: refundAmount,
            reason: `Dispute resolved: ${resolution}`,
            disputeId,
          }),
        });
      } else {
        if (dispute.escrow_hold_id) {
          await supabaseClient
            .from("escrow_holds")
            .update({
              status: "Released",
            })
            .eq("id", dispute.escrow_hold_id);
        }

        await supabaseClient
          .from("bookings")
          .update({
            status: "Completed",
          })
          .eq("id", dispute.booking_id);
      }

      const notificationApiUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`;

      await Promise.all([
        fetch(notificationApiUrl, {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: dispute.filed_by,
            title: "Dispute Resolved",
            message: `Your dispute has been resolved. ${resolutionType}`,
            type: "dispute_resolved",
            relatedId: disputeId,
          }),
        }),
        fetch(notificationApiUrl, {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: dispute.filed_against,
            title: "Dispute Resolved",
            message: `The dispute against you has been resolved. ${resolutionType}`,
            type: "dispute_resolved",
            relatedId: disputeId,
          }),
        }),
      ]);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Dispute resolved successfully",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (action === "list") {
      const { data: disputes } = await supabaseClient
        .from("disputes")
        .select(`
          *,
          bookings(*),
          filed_by_profile:profiles!disputes_filed_by_fkey(id, full_name, avatar_url),
          filed_against_profile:profiles!disputes_filed_against_fkey(id, full_name, avatar_url)
        `)
        .or(`filed_by.eq.${user.id},filed_against.eq.${user.id}`)
        .order("created_at", { ascending: false });

      return new Response(
        JSON.stringify({ disputes: disputes || [] }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});