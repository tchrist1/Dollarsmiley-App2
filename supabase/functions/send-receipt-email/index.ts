import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ReceiptData {
  receiptId?: string;
  userId: string;
  transactionType: string;
  bookingId?: string;
  transactionId?: string;
  amount: number;
  receiptData: any;
  lineItems?: any[];
  sendEmail?: boolean;
}

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

    const data: ReceiptData = await req.json();
    const { receiptId, userId, transactionType, bookingId, transactionId, amount, receiptData, lineItems, sendEmail = true } = data;

    let finalReceiptId = receiptId;

    if (!finalReceiptId) {
      const { data: newReceipt, error: receiptError } = await supabaseClient.rpc('create_receipt', {
        p_user_id: userId,
        p_transaction_type: transactionType,
        p_booking_id: bookingId || null,
        p_transaction_id: transactionId || null,
        p_amount: amount,
        p_receipt_data: receiptData || {},
        p_line_items: lineItems ? JSON.stringify(lineItems) : null,
      });

      if (receiptError || !newReceipt) {
        throw new Error("Failed to create receipt");
      }

      finalReceiptId = newReceipt;
    }

    const { data: receiptDetails, error: detailsError } = await supabaseClient.rpc('get_receipt_details', {
      p_receipt_id: finalReceiptId,
    });

    if (detailsError || !receiptDetails || receiptDetails.length === 0) {
      throw new Error("Failed to fetch receipt details");
    }

    const receipt = receiptDetails[0];

    const { data: user } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!user) {
      throw new Error("User not found");
    }

    let templateName = 'payment_receipt';
    if (transactionType === 'Booking') {
      templateName = 'booking_confirmation';
    } else if (transactionType === 'Deposit') {
      templateName = 'deposit_receipt';
    } else if (transactionType === 'Refund') {
      templateName = 'refund_receipt';
    }

    const { data: template } = await supabaseClient
      .from('email_templates')
      .select('*')
      .eq('template_name', templateName)
      .eq('is_active', true)
      .single();

    if (!template) {
      throw new Error("Email template not found");
    }

    const emailSubject = replaceVariables(template.subject, {
      receipt_number: receipt.receipt_number,
      service_name: receiptData.service_name || 'Service',
      amount: amount.toFixed(2),
      ...receiptData,
    });

    const htmlContent = generateReceiptHTML(receipt, receiptData, user);
    const textContent = generateReceiptText(receipt, receiptData, user);

    if (sendEmail) {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      
      if (resendApiKey) {
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Dollarsmiley <receipts@dollarsmiley.com>',
              to: [user.email],
              subject: emailSubject,
              html: htmlContent,
              text: textContent,
            }),
          });

          if (emailResponse.ok) {
            await supabaseClient
              .from('email_receipts')
              .update({
                email_status: 'Sent',
                email_sent_at: new Date().toISOString(),
              })
              .eq('id', finalReceiptId);
          } else {
            await supabaseClient
              .from('email_receipts')
              .update({ email_status: 'Failed' })
              .eq('id', finalReceiptId);
          }
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          await supabaseClient
            .from('email_receipts')
            .update({ email_status: 'Failed' })
            .eq('id', finalReceiptId);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        receiptId: finalReceiptId,
        receiptNumber: receipt.receipt_number,
        emailSent: sendEmail,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('Receipt error:', error);
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

function replaceVariables(template: string, variables: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return result;
}

function generateReceiptHTML(receipt: any, data: any, user: any): string {
  const lineItemsHTML = receipt.line_items && receipt.line_items.length > 0
    ? receipt.line_items.map((item: any) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.unit_price.toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">$${item.amount.toFixed(2)}</td>
        </tr>
      `).join('')
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt ${receipt.receipt_number}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f9fafb; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 32px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; font-weight: bold;">💰 Dollarsmiley</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">Professional Transaction Receipt</p>
    </div>
    
    <div style="padding: 32px;">
      <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6b7280;">Receipt Number:</span>
          <strong>${receipt.receipt_number}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6b7280;">Date:</span>
          <strong>${new Date(receipt.created_at).toLocaleDateString()}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #6b7280;">Transaction Type:</span>
          <strong>${receipt.transaction_type}</strong>
        </div>
      </div>

      <h2 style="font-size: 18px; margin-bottom: 16px; color: #1f2937;">Customer Information</h2>
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #374151;"><strong>Name:</strong> ${user.full_name}</p>
        <p style="margin: 8px 0 0 0; color: #374151;"><strong>Email:</strong> ${user.email}</p>
      </div>

      ${data.service_name ? `
      <h2 style="font-size: 18px; margin-bottom: 16px; color: #1f2937;">Service Details</h2>
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #374151;"><strong>Service:</strong> ${data.service_name}</p>
        ${data.booking_date ? `<p style="margin: 8px 0 0 0; color: #374151;"><strong>Date:</strong> ${data.booking_date}</p>` : ''}
        ${data.provider_name ? `<p style="margin: 8px 0 0 0; color: #374151;"><strong>Provider:</strong> ${data.provider_name}</p>` : ''}
      </div>
      ` : ''}

      ${lineItemsHTML ? `
      <h2 style="font-size: 18px; margin-bottom: 16px; color: #1f2937;">Itemized Charges</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #6b7280;">Description</th>
            <th style="padding: 12px; text-align: center; font-weight: 600; color: #6b7280;">Qty</th>
            <th style="padding: 12px; text-align: right; font-weight: 600; color: #6b7280;">Price</th>
            <th style="padding: 12px; text-align: right; font-weight: 600; color: #6b7280;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHTML}
        </tbody>
      </table>
      ` : ''}

      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; opacity: 0.9;">Total Amount</p>
        <p style="margin: 8px 0 0 0; font-size: 36px; font-weight: bold;">$${receipt.amount.toFixed(2)}</p>
        <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.8;">${receipt.currency}</p>
      </div>

      ${data.deposit_amount ? `
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
        <p style="margin: 0; color: #92400e;"><strong>💡 Payment Information</strong></p>
        <p style="margin: 8px 0 0 0; color: #92400e;">Deposit Paid: $${data.deposit_amount.toFixed(2)}</p>
        ${data.balance_amount > 0 ? `<p style="margin: 4px 0 0 0; color: #92400e;">Balance Due: $${data.balance_amount.toFixed(2)}</p>` : ''}
        ${data.balance_due_date ? `<p style="margin: 4px 0 0 0; color: #92400e;">Due Date: ${data.balance_due_date}</p>` : ''}
      </div>
      ` : ''}

      <div style="border-top: 2px solid #e5e7eb; padding-top: 24px; text-align: center; color: #6b7280; font-size: 14px;">
        <p style="margin: 0;">Thank you for your business!</p>
        <p style="margin: 8px 0 0 0;">Questions? Contact us at support@dollarsmiley.com</p>
        <p style="margin: 16px 0 0 0; font-size: 12px;">© 2024 Dollarsmiley. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

function generateReceiptText(receipt: any, data: any, user: any): string {
  let text = `
DOLLARSMILEY - RECEIPT
${'='.repeat(50)}

Receipt Number: ${receipt.receipt_number}
Date: ${new Date(receipt.created_at).toLocaleDateString()}
Transaction Type: ${receipt.transaction_type}

CUSTOMER INFORMATION
${'-'.repeat(50)}
Name: ${user.full_name}
Email: ${user.email}
`;

  if (data.service_name) {
    text += `\nSERVICE DETAILS\n${'-'.repeat(50)}\nService: ${data.service_name}\n`;
    if (data.booking_date) text += `Date: ${data.booking_date}\n`;
    if (data.provider_name) text += `Provider: ${data.provider_name}\n`;
  }

  if (receipt.line_items && receipt.line_items.length > 0) {
    text += `\nITEMIZED CHARGES\n${'-'.repeat(50)}\n`;
    receipt.line_items.forEach((item: any) => {
      text += `${item.description} (${item.quantity}) @ $${item.unit_price.toFixed(2)} = $${item.amount.toFixed(2)}\n`;
    });
  }

  text += `\nTOTAL AMOUNT: $${receipt.amount.toFixed(2)} ${receipt.currency}\n`;

  if (data.deposit_amount) {
    text += `\nPAYMENT INFORMATION\n${'-'.repeat(50)}\nDeposit Paid: $${data.deposit_amount.toFixed(2)}\n`;
    if (data.balance_amount > 0) text += `Balance Due: $${data.balance_amount.toFixed(2)}\n`;
    if (data.balance_due_date) text += `Due Date: ${data.balance_due_date}\n`;
  }

  text += `\n${'='.repeat(50)}\nThank you for your business!\nQuestions? Contact us at support@dollarsmiley.com\n© 2024 Dollarsmiley. All rights reserved.\n`;

  return text;
}