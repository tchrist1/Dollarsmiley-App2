/**
 * Email templates for marketplace notifications
 */

interface EmailTemplateData {
  recipientName?: string;
  [key: string]: any;
}

const BASE_STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
  .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 40px 20px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; }
  .content { padding: 40px 30px; }
  .content h2 { color: #333333; font-size: 22px; margin: 0 0 20px 0; }
  .content p { color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0; }
  .info-box { background-color: #f9f9f9; border-left: 4px solid #4CAF50; padding: 15px 20px; margin: 20px 0; }
  .info-box strong { color: #333333; display: block; margin-bottom: 5px; }
  .button { display: inline-block; padding: 14px 32px; background-color: #4CAF50; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
  .button:hover { background-color: #45a049; }
  .footer { background-color: #f5f5f5; padding: 30px; text-align: center; color: #999999; font-size: 14px; }
  .footer a { color: #4CAF50; text-decoration: none; }
  .highlight { color: #4CAF50; font-weight: 600; }
  .urgent { background-color: #fff3cd; border-left-color: #ffc107; }
  .tracking { font-family: 'Courier New', monospace; font-size: 14px; background-color: #f0f0f0; padding: 8px 12px; border-radius: 4px; display: inline-block; }
`;

/**
 * Custom Service Order Received
 */
export function customServiceOrderReceivedTemplate(data: EmailTemplateData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${BASE_STYLES}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 New Custom Service Order!</h1>
        </div>
        <div class="content">
          <h2>You have a new order</h2>
          <p>Great news! <span class="highlight">${data.customerName}</span> just ordered your custom service.</p>

          <div class="info-box">
            <strong>Order Details</strong>
            <p style="margin: 5px 0;">Service: ${data.serviceTitle}</p>
            <p style="margin: 5px 0;">Amount: <span class="highlight">${data.amount}</span></p>
            <p style="margin: 5px 0;">Order ID: #${data.bookingId?.slice(0, 8)}</p>
          </div>

          <p>Please review the order details and respond to the customer as soon as possible.</p>

          <a href="${data.orderUrl || '#'}" class="button">View Order Details</a>

          <p style="font-size: 14px; color: #999999; margin-top: 30px;">
            💡 <strong>Tip:</strong> Respond quickly to maintain your high rating and build customer trust!
          </p>
        </div>
        <div class="footer">
          <p>DollarSmiley Marketplace</p>
          <p><a href="#">Manage Notifications</a> | <a href="#">Help Center</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Shipment Created
 */
export function shipmentCreatedTemplate(data: EmailTemplateData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${BASE_STYLES}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📦 Your Order Has Shipped!</h1>
        </div>
        <div class="content">
          <h2>Package on the way</h2>
          <p>Good news! Your order has been shipped and is on its way to you.</p>

          <div class="info-box">
            <strong>Shipping Details</strong>
            <p style="margin: 5px 0;">Carrier: ${data.carrier}</p>
            <p style="margin: 5px 0;">Tracking Number: <span class="tracking">${data.trackingNumber}</span></p>
            ${data.estimatedDelivery ? `<p style="margin: 5px 0;">Estimated Delivery: ${data.estimatedDelivery}</p>` : ''}
          </div>

          <a href="${data.trackingUrl || '#'}" class="button">Track Your Package</a>

          <p style="font-size: 14px; color: #666666; margin-top: 30px;">
            You'll receive updates as your package makes its way to you.
          </p>
        </div>
        <div class="footer">
          <p>DollarSmiley Marketplace</p>
          <p><a href="#">Track All Orders</a> | <a href="#">Contact Support</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Shipment Out for Delivery
 */
export function shipmentOutForDeliveryTemplate(data: EmailTemplateData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${BASE_STYLES}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚚 Out for Delivery Today!</h1>
        </div>
        <div class="content">
          <h2>Your package arrives today</h2>
          <p>Exciting news! Your package is out for delivery and will arrive <span class="highlight">today</span>.</p>

          <div class="info-box urgent">
            <strong>⏰ Delivery Today</strong>
            <p style="margin: 5px 0;">Tracking: <span class="tracking">${data.trackingNumber}</span></p>
            <p style="margin: 5px 0;">Make sure someone is available to receive the package.</p>
          </div>

          <a href="${data.trackingUrl || '#'}" class="button">Track Package</a>

          <p style="font-size: 14px; color: #666666; margin-top: 30px;">
            📱 We'll send you another notification when your package is delivered.
          </p>
        </div>
        <div class="footer">
          <p>DollarSmiley Marketplace</p>
          <p><a href="#">Delivery Instructions</a> | <a href="#">Contact Driver</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Shipment Delivered
 */
export function shipmentDeliveredTemplate(data: EmailTemplateData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${BASE_STYLES}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Package Delivered!</h1>
        </div>
        <div class="content">
          <h2>Your order has arrived</h2>
          <p>Great news! Your package was successfully delivered.</p>

          <div class="info-box">
            <strong>Delivery Confirmation</strong>
            <p style="margin: 5px 0;">Delivered at: ${data.deliveredAt}</p>
            <p style="margin: 5px 0;">Tracking: <span class="tracking">${data.trackingNumber}</span></p>
          </div>

          <p>We hope you love your order! If everything looks good, please consider leaving a review.</p>

          <a href="${data.reviewUrl || '#'}" class="button">Leave a Review</a>

          <p style="font-size: 14px; color: #999999; margin-top: 30px;">
            Have an issue? <a href="#" style="color: #4CAF50;">Contact us</a> within 48 hours.
          </p>
        </div>
        <div class="footer">
          <p>DollarSmiley Marketplace</p>
          <p><a href="#">Order History</a> | <a href="#">Help Center</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Payout Scheduled
 */
export function payoutScheduledTemplate(data: EmailTemplateData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${BASE_STYLES}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 Payout Scheduled</h1>
        </div>
        <div class="content">
          <h2>Your earnings are on the way</h2>
          <p>Good news! Your payout has been scheduled and will be processed soon.</p>

          <div class="info-box">
            <strong>Payout Details</strong>
            <p style="margin: 5px 0;">Amount: <span class="highlight">${data.amount}</span></p>
            <p style="margin: 5px 0;">Scheduled Date: ${data.scheduledDate}</p>
            <p style="margin: 5px 0;">Payout ID: #${data.scheduleId?.slice(0, 8)}</p>
          </div>

          <p>The funds will be transferred to your connected account on the scheduled date.</p>

          <a href="${data.payoutUrl || '#'}" class="button">View Payout Details</a>

          <p style="font-size: 14px; color: #999999; margin-top: 30px;">
            💡 Want it faster? Request an early payout (small fee applies).
          </p>
        </div>
        <div class="footer">
          <p>DollarSmiley Marketplace</p>
          <p><a href="#">Payout Settings</a> | <a href="#">Early Payout</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Payout Completed
 */
export function payoutCompletedTemplate(data: EmailTemplateData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${BASE_STYLES}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Payout Completed!</h1>
        </div>
        <div class="content">
          <h2>Money's in your account</h2>
          <p>Excellent! Your payout has been successfully transferred to your account.</p>

          <div class="info-box">
            <strong>Transfer Confirmation</strong>
            <p style="margin: 5px 0;">Amount: <span class="highlight">${data.amount}</span></p>
            <p style="margin: 5px 0;">Transferred: ${data.completedAt || 'Just now'}</p>
            <p style="margin: 5px 0;">Payout ID: #${data.scheduleId?.slice(0, 8)}</p>
          </div>

          <p>The funds should appear in your account within 1-3 business days depending on your bank.</p>

          <a href="${data.payoutUrl || '#'}" class="button">View Transaction</a>

          <p style="font-size: 14px; color: #999999; margin-top: 30px;">
            Keep up the great work! 🎉
          </p>
        </div>
        <div class="footer">
          <p>DollarSmiley Marketplace</p>
          <p><a href="#">Payout History</a> | <a href="#">Earnings Dashboard</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Payout Failed
 */
export function payoutFailedTemplate(data: EmailTemplateData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${BASE_STYLES}</style>
    </head>
    <body>
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
          <h1>⚠️ Payout Failed</h1>
        </div>
        <div class="content">
          <h2>Action required</h2>
          <p>We encountered an issue processing your payout. Please review the details below.</p>

          <div class="info-box urgent">
            <strong>Failed Payout</strong>
            <p style="margin: 5px 0;">Amount: ${data.amount}</p>
            <p style="margin: 5px 0;">Reason: <span style="color: #dc3545;">${data.reason}</span></p>
            <p style="margin: 5px 0;">Payout ID: #${data.scheduleId?.slice(0, 8)}</p>
          </div>

          <p><strong>What to do next:</strong></p>
          <ul style="color: #666666; line-height: 1.8;">
            <li>Verify your payment method details are correct</li>
            <li>Ensure your account has sufficient information</li>
            <li>Contact support if you need assistance</li>
          </ul>

          <a href="${data.payoutUrl || '#'}" class="button">Update Payment Method</a>

          <p style="font-size: 14px; color: #999999; margin-top: 30px;">
            Your funds are safe and will be held until the issue is resolved.
          </p>
        </div>
        <div class="footer">
          <p>DollarSmiley Marketplace</p>
          <p><a href="#">Payment Settings</a> | <a href="#">Contact Support</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Early Payout Approved
 */
export function earlyPayoutApprovedTemplate(data: EmailTemplateData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${BASE_STYLES}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚡ Early Payout Approved!</h1>
        </div>
        <div class="content">
          <h2>Your early payout is processing</h2>
          <p>Great news! Your early payout request has been approved and is being processed.</p>

          <div class="info-box">
            <strong>Payout Breakdown</strong>
            <p style="margin: 5px 0;">Original Amount: ${data.amount}</p>
            <p style="margin: 5px 0;">Early Payout Fee: ${data.fee}</p>
            <p style="margin: 5px 0;"><strong>Net Amount: <span class="highlight">${data.netAmount}</span></strong></p>
          </div>

          <p>Your funds will be transferred to your account within 1-2 business days.</p>

          <a href="${data.payoutUrl || '#'}" class="button">View Details</a>

          <p style="font-size: 14px; color: #999999; margin-top: 30px;">
            💡 Early payouts are great for urgent needs, but waiting for scheduled payouts saves on fees.
          </p>
        </div>
        <div class="footer">
          <p>DollarSmiley Marketplace</p>
          <p><a href="#">Payout History</a> | <a href="#">Fee Structure</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Get email template by type
 */
export function getEmailTemplate(type: string, data: EmailTemplateData): string {
  switch (type) {
    case 'custom_service_order_received':
      return customServiceOrderReceivedTemplate(data);
    case 'shipment_created':
      return shipmentCreatedTemplate(data);
    case 'shipment_out_for_delivery':
      return shipmentOutForDeliveryTemplate(data);
    case 'shipment_delivered':
      return shipmentDeliveredTemplate(data);
    case 'payout_scheduled':
      return payoutScheduledTemplate(data);
    case 'payout_completed':
      return payoutCompletedTemplate(data);
    case 'payout_failed':
      return payoutFailedTemplate(data);
    case 'early_payout_approved':
      return earlyPayoutApprovedTemplate(data);
    default:
      return '';
  }
}
