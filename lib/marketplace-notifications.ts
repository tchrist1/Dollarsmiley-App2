import { supabase } from './supabase';

export type NotificationType =
  | 'custom_service_order_received'
  | 'shipment_created'
  | 'shipment_in_transit'
  | 'shipment_out_for_delivery'
  | 'shipment_delivered'
  | 'payout_scheduled'
  | 'payout_processing'
  | 'payout_completed'
  | 'payout_failed'
  | 'early_payout_requested'
  | 'early_payout_approved'
  | 'early_payout_rejected';

interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  sendEmail?: boolean;
  sendSMS?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

/**
 * Core notification creation function
 */
export async function createNotification(params: NotificationData): Promise<void> {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data || {},
      is_read: false,
      priority: params.priority || 'normal',
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    // Send email if requested
    if (params.sendEmail) {
      await sendEmailNotification(params);
    }

    // Send SMS if requested and high priority
    if (params.sendSMS && ['high', 'urgent'].includes(params.priority || 'normal')) {
      await sendSMSNotification(params);
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

/**
 * Custom Service Order Notifications
 */
export async function notifyCustomServiceOrderReceived(
  providerId: string,
  bookingId: string,
  customerName: string,
  serviceTitle: string,
  totalAmount: number
): Promise<void> {
  const formattedAmount = formatCurrency(totalAmount);

  await createNotification({
    userId: providerId,
    type: 'custom_service_order_received',
    title: 'New Custom Service Order',
    message: `${customerName} ordered "${serviceTitle}" for ${formattedAmount}`,
    data: {
      booking_id: bookingId,
      customer_name: customerName,
      service_title: serviceTitle,
      amount: totalAmount,
    },
    sendEmail: true,
    sendSMS: true,
    priority: 'high',
  });
}

/**
 * Shipment Tracking Notifications
 */
export async function notifyShipmentCreated(
  customerId: string,
  shipmentId: string,
  trackingNumber: string,
  carrier: string
): Promise<void> {
  await createNotification({
    userId: customerId,
    type: 'shipment_created',
    title: 'Shipment Created',
    message: `Your order has been shipped via ${carrier}. Tracking: ${trackingNumber}`,
    data: {
      shipment_id: shipmentId,
      tracking_number: trackingNumber,
      carrier,
    },
    sendEmail: true,
    priority: 'normal',
  });
}

export async function notifyShipmentInTransit(
  customerId: string,
  shipmentId: string,
  trackingNumber: string,
  estimatedDelivery?: string
): Promise<void> {
  const deliveryInfo = estimatedDelivery
    ? ` Estimated delivery: ${formatDate(estimatedDelivery)}`
    : '';

  await createNotification({
    userId: customerId,
    type: 'shipment_in_transit',
    title: 'Package In Transit',
    message: `Your package is on its way!${deliveryInfo}`,
    data: {
      shipment_id: shipmentId,
      tracking_number: trackingNumber,
      estimated_delivery: estimatedDelivery,
    },
    sendEmail: false,
    priority: 'low',
  });
}

export async function notifyShipmentOutForDelivery(
  customerId: string,
  shipmentId: string,
  trackingNumber: string
): Promise<void> {
  await createNotification({
    userId: customerId,
    type: 'shipment_out_for_delivery',
    title: 'Out for Delivery',
    message: 'Your package is out for delivery today!',
    data: {
      shipment_id: shipmentId,
      tracking_number: trackingNumber,
    },
    sendEmail: false,
    sendSMS: true,
    priority: 'high',
  });
}

export async function notifyShipmentDelivered(
  customerId: string,
  shipmentId: string,
  trackingNumber: string,
  deliveredAt: string
): Promise<void> {
  await createNotification({
    userId: customerId,
    type: 'shipment_delivered',
    title: 'Package Delivered',
    message: `Your package was delivered at ${formatTime(deliveredAt)}`,
    data: {
      shipment_id: shipmentId,
      tracking_number: trackingNumber,
      delivered_at: deliveredAt,
    },
    sendEmail: true,
    sendSMS: true,
    priority: 'normal',
  });
}

/**
 * Payout Notifications
 */
export async function notifyPayoutScheduled(
  providerId: string,
  scheduleId: string,
  amount: number,
  scheduledDate: string
): Promise<void> {
  const formattedAmount = formatCurrency(amount);
  const formattedDate = formatDate(scheduledDate);

  await createNotification({
    userId: providerId,
    type: 'payout_scheduled',
    title: 'Payout Scheduled',
    message: `Your payout of ${formattedAmount} is scheduled for ${formattedDate}`,
    data: {
      payout_schedule_id: scheduleId,
      amount,
      scheduled_date: scheduledDate,
    },
    sendEmail: true,
    priority: 'normal',
  });
}

export async function notifyPayoutProcessing(
  providerId: string,
  scheduleId: string,
  amount: number
): Promise<void> {
  const formattedAmount = formatCurrency(amount);

  await createNotification({
    userId: providerId,
    type: 'payout_processing',
    title: 'Payout Processing',
    message: `Your payout of ${formattedAmount} is being processed`,
    data: {
      payout_schedule_id: scheduleId,
      amount,
    },
    sendEmail: false,
    priority: 'low',
  });
}

export async function notifyPayoutCompleted(
  providerId: string,
  scheduleId: string,
  amount: number
): Promise<void> {
  const formattedAmount = formatCurrency(amount);

  await createNotification({
    userId: providerId,
    type: 'payout_completed',
    title: 'Payout Completed',
    message: `Your payout of ${formattedAmount} has been transferred to your account`,
    data: {
      payout_schedule_id: scheduleId,
      amount,
    },
    sendEmail: true,
    sendSMS: true,
    priority: 'high',
  });
}

export async function notifyPayoutFailed(
  providerId: string,
  scheduleId: string,
  amount: number,
  reason: string
): Promise<void> {
  const formattedAmount = formatCurrency(amount);

  await createNotification({
    userId: providerId,
    type: 'payout_failed',
    title: 'Payout Failed',
    message: `Your payout of ${formattedAmount} failed: ${reason}`,
    data: {
      payout_schedule_id: scheduleId,
      amount,
      reason,
    },
    sendEmail: true,
    sendSMS: true,
    priority: 'urgent',
  });
}

export async function notifyEarlyPayoutRequested(
  providerId: string,
  scheduleId: string,
  amount: number,
  fee: number
): Promise<void> {
  const formattedAmount = formatCurrency(amount);
  const formattedFee = formatCurrency(fee);
  const netAmount = formatCurrency(amount - fee);

  await createNotification({
    userId: providerId,
    type: 'early_payout_requested',
    title: 'Early Payout Request Submitted',
    message: `Your early payout request for ${formattedAmount} (${formattedFee} fee, ${netAmount} net) is under review`,
    data: {
      payout_schedule_id: scheduleId,
      amount,
      fee,
      net_amount: amount - fee,
    },
    sendEmail: true,
    priority: 'normal',
  });
}

export async function notifyEarlyPayoutApproved(
  providerId: string,
  scheduleId: string,
  amount: number,
  fee: number
): Promise<void> {
  const formattedAmount = formatCurrency(amount);
  const formattedFee = formatCurrency(fee);
  const netAmount = formatCurrency(amount - fee);

  await createNotification({
    userId: providerId,
    type: 'early_payout_approved',
    title: 'Early Payout Approved',
    message: `Your early payout of ${netAmount} (${formattedAmount} - ${formattedFee} fee) has been approved`,
    data: {
      payout_schedule_id: scheduleId,
      amount,
      fee,
      net_amount: amount - fee,
    },
    sendEmail: true,
    sendSMS: true,
    priority: 'high',
  });
}

export async function notifyEarlyPayoutRejected(
  providerId: string,
  scheduleId: string,
  amount: number,
  reason: string
): Promise<void> {
  const formattedAmount = formatCurrency(amount);

  await createNotification({
    userId: providerId,
    type: 'early_payout_rejected',
    title: 'Early Payout Request Declined',
    message: `Your early payout request for ${formattedAmount} was declined: ${reason}`,
    data: {
      payout_schedule_id: scheduleId,
      amount,
      reason,
    },
    sendEmail: true,
    priority: 'normal',
  });
}

/**
 * Helper functions
 */
async function sendEmailNotification(params: NotificationData): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', params.userId)
      .single();

    if (!profile?.email) return;

    await supabase.functions.invoke('send-email', {
      body: {
        to: profile.email,
        subject: params.title,
        html: generateEmailHTML(params),
      },
    });
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}

async function sendSMSNotification(params: NotificationData): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_number')
      .eq('id', params.userId)
      .single();

    if (!profile?.phone_number) return;

    await supabase.functions.invoke('send-sms', {
      body: {
        to: profile.phone_number,
        message: `${params.title}: ${params.message}`,
      },
    });
  } catch (error) {
    console.error('Error sending SMS notification:', error);
  }
}

function generateEmailHTML(params: NotificationData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #4CAF50;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${params.title}</h1>
        </div>
        <div class="content">
          <p>${params.message}</p>
          ${params.data?.booking_id ? `<a href="#" class="button">View Order</a>` : ''}
          ${params.data?.shipment_id ? `<a href="#" class="button">Track Shipment</a>` : ''}
          ${params.data?.payout_schedule_id ? `<a href="#" class="button">View Payout</a>` : ''}
        </div>
        <div class="footer">
          <p>DollarSmiley Marketplace</p>
          <p>You're receiving this because you have notifications enabled.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}
