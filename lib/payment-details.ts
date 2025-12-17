import { supabase } from './supabase';
import type { Transaction } from './transactions';

export interface PaymentDetails extends Transaction {
  booking?: {
    id: string;
    title: string;
    scheduled_date: string;
    location: string;
    customer: {
      id: string;
      full_name: string;
      email: string;
      avatar_url: string | null;
    };
    provider: {
      id: string;
      full_name: string;
      email: string;
      avatar_url: string | null;
    };
  };
  payment_method?: {
    type: string;
    last4?: string;
    brand?: string;
    email?: string;
  };
  wallet?: {
    id: string;
    balance: number;
    currency: string;
  };
  related_transactions?: Transaction[];
}

export async function getTransactionById(
  transactionId: string
): Promise<PaymentDetails | null> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        booking:bookings(
          id,
          title,
          scheduled_date,
          location,
          customer:profiles!customer_id(
            id,
            full_name,
            email,
            avatar_url
          ),
          provider:profiles!provider_id(
            id,
            full_name,
            email,
            avatar_url
          )
        ),
        wallet:wallets(
          id,
          balance,
          currency
        )
      `)
      .eq('id', transactionId)
      .single();

    if (error) throw error;
    if (!data) return null;

    const transaction = data as PaymentDetails;

    if (transaction.metadata?.payment_method) {
      transaction.payment_method = transaction.metadata.payment_method;
    }

    if (transaction.booking_id) {
      const relatedTransactions = await getRelatedTransactions(
        transaction.wallet_id,
        transaction.booking_id,
        transactionId
      );
      transaction.related_transactions = relatedTransactions;
    }

    return transaction;
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    return null;
  }
}

export async function getRelatedTransactions(
  walletId: string,
  bookingId: string,
  excludeId: string
): Promise<Transaction[]> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('wallet_id', walletId)
      .eq('booking_id', bookingId)
      .neq('id', excludeId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []) as Transaction[];
  } catch (error) {
    console.error('Error fetching related transactions:', error);
    return [];
  }
}

export function getPaymentMethodIcon(type: string): string {
  const icons: Record<string, string> = {
    card: '💳',
    bank_account: '🏦',
    cash: '💵',
    paypal: '🅿️',
    venmo: '💙',
    cashapp: '💰',
    apple_pay: '🍎',
    google_pay: '🔵',
  };
  return icons[type.toLowerCase()] || '💳';
}

export function getPaymentMethodLabel(type: string, details?: any): string {
  if (type === 'card' && details?.brand && details?.last4) {
    return `${details.brand} •••• ${details.last4}`;
  }

  if (type === 'bank_account' && details?.last4) {
    return `Bank Account •••• ${details.last4}`;
  }

  if (type === 'paypal' && details?.email) {
    return `PayPal (${details.email})`;
  }

  const labels: Record<string, string> = {
    card: 'Credit/Debit Card',
    bank_account: 'Bank Account',
    cash: 'Cash Payment',
    paypal: 'PayPal',
    venmo: 'Venmo',
    cashapp: 'Cash App',
    apple_pay: 'Apple Pay',
    google_pay: 'Google Pay',
    wallet: 'Wallet Balance',
  };

  return labels[type.toLowerCase()] || type;
}

export interface ReceiptData {
  transaction: PaymentDetails;
  receiptNumber: string;
  issueDate: string;
  dueDate?: string;
  lineItems: Array<{
    description: string;
    amount: number;
    quantity?: number;
  }>;
  subtotal: number;
  fees: number;
  total: number;
  paymentMethod: string;
  notes?: string;
}

export function generateReceiptData(transaction: PaymentDetails): ReceiptData {
  const lineItems: ReceiptData['lineItems'] = [
    {
      description: transaction.description,
      amount: transaction.amount,
      quantity: 1,
    },
  ];

  let fees = 0;
  if (transaction.metadata?.platformFee) {
    fees = transaction.metadata.platformFee;
  }

  const subtotal = transaction.amount;
  const total = subtotal + fees;

  const receiptNumber = `REC-${transaction.id.substring(0, 8).toUpperCase()}`;
  const issueDate = transaction.created_at;

  const paymentMethod = transaction.payment_method
    ? getPaymentMethodLabel(
        transaction.payment_method.type,
        transaction.payment_method
      )
    : 'Wallet Balance';

  return {
    transaction,
    receiptNumber,
    issueDate,
    lineItems,
    subtotal,
    fees,
    total,
    paymentMethod,
    notes: transaction.metadata?.notes,
  };
}

export async function downloadReceipt(transactionId: string): Promise<string> {
  const transaction = await getTransactionById(transactionId);
  if (!transaction) {
    throw new Error('Transaction not found');
  }

  const receipt = generateReceiptData(transaction);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${receipt.receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #1F2937;
      padding: 40px 20px;
      background: #F9FAFB;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #E5E7EB;
    }
    .logo {
      font-size: 28px;
      font-weight: 700;
      color: #3B82F6;
    }
    .receipt-info {
      text-align: right;
    }
    .receipt-number {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
    }
    .receipt-date {
      font-size: 14px;
      color: #6B7280;
      margin-top: 4px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .party-info {
      background: #F9FAFB;
      padding: 16px;
      border-radius: 8px;
    }
    .party-name {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
    }
    .party-detail {
      font-size: 14px;
      color: #6B7280;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    thead {
      background: #F9FAFB;
    }
    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      color: #6B7280;
      letter-spacing: 0.5px;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #E5E7EB;
      font-size: 14px;
    }
    .amount {
      text-align: right;
      font-weight: 600;
    }
    .totals {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid #E5E7EB;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      font-size: 14px;
    }
    .total-row.final {
      font-size: 18px;
      font-weight: 700;
      background: #F9FAFB;
      border-radius: 8px;
      margin-top: 12px;
      padding: 16px 12px;
    }
    .status {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status.completed { background: #D1FAE5; color: #065F46; }
    .status.pending { background: #FEF3C7; color: #92400E; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      font-size: 12px;
      color: #6B7280;
    }
    @media print {
      body { padding: 0; background: white; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">DollarSmiley</div>
      <div class="receipt-info">
        <div class="receipt-number">Receipt ${receipt.receiptNumber}</div>
        <div class="receipt-date">${new Date(receipt.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Transaction Details</div>
      <div class="party-info">
        <div class="party-name">${transaction.booking?.customer?.full_name || 'N/A'}</div>
        <div class="party-detail">${transaction.booking?.customer?.email || ''}</div>
        <div class="party-detail" style="margin-top: 12px;">
          <span class="status ${transaction.status.toLowerCase()}">${transaction.status}</span>
        </div>
      </div>
    </div>

    ${transaction.booking ? `
    <div class="section">
      <div class="section-title">Service Details</div>
      <div class="party-info">
        <div class="party-name">${transaction.booking.title}</div>
        <div class="party-detail">${new Date(transaction.booking.scheduled_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
        <div class="party-detail">${transaction.booking.location}</div>
      </div>
    </div>
    ` : ''}

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${receipt.lineItems.map(item => `
        <tr>
          <td>${item.description}</td>
          <td class="amount">$${item.amount.toFixed(2)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span>Subtotal</span>
        <span>$${receipt.subtotal.toFixed(2)}</span>
      </div>
      ${receipt.fees > 0 ? `
      <div class="total-row">
        <span>Platform Fee</span>
        <span>$${receipt.fees.toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="total-row final">
        <span>Total</span>
        <span>$${receipt.total.toFixed(2)}</span>
      </div>
    </div>

    <div class="section" style="margin-top: 30px;">
      <div class="section-title">Payment Method</div>
      <div class="party-detail">${receipt.paymentMethod}</div>
      ${transaction.reference_id ? `
      <div class="party-detail" style="margin-top: 8px;">Reference: ${transaction.reference_id}</div>
      ` : ''}
    </div>

    ${receipt.notes ? `
    <div class="section">
      <div class="section-title">Notes</div>
      <div class="party-detail">${receipt.notes}</div>
    </div>
    ` : ''}

    <div class="footer">
      <p>Thank you for your business!</p>
      <p style="margin-top: 8px;">This is an automatically generated receipt.</p>
    </div>
  </div>
</body>
</html>
  `;

  return html;
}

export function formatTransactionTimeline(transaction: PaymentDetails): Array<{
  title: string;
  timestamp: string;
  description: string;
  icon: string;
}> {
  const timeline: Array<{
    title: string;
    timestamp: string;
    description: string;
    icon: string;
  }> = [];

  timeline.push({
    title: 'Transaction Created',
    timestamp: transaction.created_at,
    description: `${transaction.transaction_type} transaction initiated`,
    icon: '✨',
  });

  if (transaction.completed_at) {
    timeline.push({
      title: 'Transaction Completed',
      timestamp: transaction.completed_at,
      description: 'Payment processed successfully',
      icon: '✅',
    });
  }

  if (transaction.status === 'Failed' && transaction.metadata?.failureReason) {
    timeline.push({
      title: 'Transaction Failed',
      timestamp: transaction.created_at,
      description: transaction.metadata.failureReason,
      icon: '❌',
    });
  }

  if (transaction.status === 'Cancelled' && transaction.metadata?.cancelledAt) {
    timeline.push({
      title: 'Transaction Cancelled',
      timestamp: transaction.metadata.cancelledAt,
      description: transaction.metadata.cancelReason || 'Transaction was cancelled',
      icon: '🚫',
    });
  }

  return timeline.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
