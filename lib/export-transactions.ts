import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Transaction, TransactionStats, TransactionFilters } from './transactions';
import {
  formatAmount,
  formatTransactionDateTime,
  getTransactionTypeLabel,
  getTransactions,
  getTransactionStats,
} from './transactions';

export type ExportFormat = 'csv' | 'pdf' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  includeStats?: boolean;
  dateRange?: { start: string; end: string };
  groupByDate?: boolean;
  includeMetadata?: boolean;
}

export async function exportTransactionsToCSV(
  walletId: string,
  filters?: TransactionFilters,
  options?: { includeStats?: boolean }
): Promise<string> {
  try {
    const transactions = await getTransactions(walletId, filters, 10000, 0);

    let csv = '';

    if (options?.includeStats) {
      const stats = await getTransactionStats(
        walletId,
        filters?.startDate,
        filters?.endDate
      );

      csv += 'Transaction Summary\n';
      csv += `Total Earnings,${formatAmount(stats.totalEarnings)}\n`;
      csv += `Total Payouts,${formatAmount(stats.totalPayouts)}\n`;
      csv += `Total Refunds,${formatAmount(stats.totalRefunds)}\n`;
      csv += `Total Fees,${formatAmount(stats.totalFees)}\n`;
      csv += `Pending Amount,${formatAmount(stats.pendingAmount)}\n`;
      csv += `Completed Transactions,${stats.completedTransactions}\n`;
      csv += '\n';
    }

    const headers = [
      'Date',
      'Type',
      'Description',
      'Amount',
      'Status',
      'Reference',
      'Booking',
      'Customer',
    ];

    csv += headers.join(',') + '\n';

    const rows = transactions.map((t) => [
      formatTransactionDateTime(t.created_at),
      getTransactionTypeLabel(t.transaction_type),
      t.description,
      formatAmount(t.amount),
      t.status,
      t.reference_id || '',
      t.booking?.title || '',
      t.booking?.customer?.full_name || '',
    ]);

    csv += rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    return csv;
  } catch (error) {
    console.error('Error exporting transactions to CSV:', error);
    throw error;
  }
}

export async function exportTransactionsToJSON(
  walletId: string,
  filters?: TransactionFilters,
  options?: { includeStats?: boolean; includeMetadata?: boolean }
): Promise<string> {
  try {
    const transactions = await getTransactions(walletId, filters, 10000, 0);

    const exportData: any = {
      exportDate: new Date().toISOString(),
      transactionCount: transactions.length,
      filters: filters || {},
    };

    if (options?.includeStats) {
      const stats = await getTransactionStats(
        walletId,
        filters?.startDate,
        filters?.endDate
      );
      exportData.statistics = stats;
    }

    exportData.transactions = transactions.map((t) => {
      const transaction: any = {
        id: t.id,
        date: t.created_at,
        type: t.transaction_type,
        description: t.description,
        amount: t.amount,
        status: t.status,
        reference: t.reference_id,
      };

      if (t.booking) {
        transaction.booking = {
          id: t.booking.id,
          title: t.booking.title,
          customer: t.booking.customer?.full_name,
        };
      }

      if (options?.includeMetadata && t.metadata) {
        transaction.metadata = t.metadata;
      }

      return transaction;
    });

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Error exporting transactions to JSON:', error);
    throw error;
  }
}

export function generateHTMLReport(
  transactions: Transaction[],
  stats?: TransactionStats,
  filters?: TransactionFilters
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transaction Report - ${dateStr}</title>
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
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 3px solid #3B82F6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    h1 {
      color: #111827;
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #6B7280;
      font-size: 14px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .stat-card {
      background: #F3F4F6;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #3B82F6;
    }
    .stat-label {
      font-size: 12px;
      text-transform: uppercase;
      color: #6B7280;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin-top: 8px;
    }
    .stat-card.green { border-left-color: #10B981; }
    .stat-card.blue { border-left-color: #3B82F6; }
    .stat-card.orange { border-left-color: #F59E0B; }
    .stat-card.red { border-left-color: #EF4444; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
      font-size: 14px;
    }
    thead {
      background: #F9FAFB;
      border-bottom: 2px solid #E5E7EB;
    }
    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #E5E7EB;
    }
    tbody tr:hover {
      background: #F9FAFB;
    }
    .amount {
      font-weight: 600;
      text-align: right;
    }
    .amount.positive { color: #10B981; }
    .amount.negative { color: #EF4444; }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status.completed { background: #D1FAE5; color: #065F46; }
    .status.pending { background: #FEF3C7; color: #92400E; }
    .status.failed { background: #FEE2E2; color: #991B1B; }
    .status.cancelled { background: #E5E7EB; color: #374151; }
    .type {
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .type.earning { color: #10B981; }
    .type.payout { color: #3B82F6; }
    .type.refund { color: #F59E0B; }
    .type.fee { color: #EF4444; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      color: #6B7280;
      font-size: 12px;
    }
    @media print {
      body { padding: 0; background: white; }
      .container { box-shadow: none; padding: 20px; }
      tbody tr:hover { background: transparent; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Transaction Report</h1>
      <div class="subtitle">Generated on ${dateStr}</div>
    </div>
`;

  if (stats) {
    html += `
    <div class="stats">
      <div class="stat-card green">
        <div class="stat-label">Total Earnings</div>
        <div class="stat-value">${formatAmount(stats.totalEarnings)}</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-label">Total Payouts</div>
        <div class="stat-value">${formatAmount(stats.totalPayouts)}</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-label">Total Refunds</div>
        <div class="stat-value">${formatAmount(stats.totalRefunds)}</div>
      </div>
      <div class="stat-card red">
        <div class="stat-label">Total Fees</div>
        <div class="stat-value">${formatAmount(stats.totalFees)}</div>
      </div>
    </div>
`;
  }

  html += `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Description</th>
          <th>Status</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
`;

  transactions.forEach((t) => {
    const isPositive = ['Earning', 'Refund'].includes(t.transaction_type);
    const amountClass = isPositive ? 'positive' : 'negative';
    const typeClass = t.transaction_type.toLowerCase();
    const statusClass = t.status.toLowerCase();

    html += `
        <tr>
          <td>${formatTransactionDateTime(t.created_at)}</td>
          <td><span class="type ${typeClass}">${getTransactionTypeLabel(t.transaction_type)}</span></td>
          <td>${t.description}</td>
          <td><span class="status ${statusClass}">${t.status}</span></td>
          <td class="amount ${amountClass}">${isPositive ? '+' : ''}${formatAmount(t.amount)}</td>
        </tr>
`;
  });

  html += `
      </tbody>
    </table>

    <div class="footer">
      <p><strong>${transactions.length}</strong> transactions • Report generated automatically</p>
    </div>
  </div>
</body>
</html>
`;

  return html;
}

export async function exportTransactionsToPDF(
  walletId: string,
  filters?: TransactionFilters,
  options?: { includeStats?: boolean }
): Promise<string> {
  try {
    const transactions = await getTransactions(walletId, filters, 10000, 0);

    let stats: TransactionStats | undefined;
    if (options?.includeStats) {
      stats = await getTransactionStats(
        walletId,
        filters?.startDate,
        filters?.endDate
      );
    }

    const html = generateHTMLReport(transactions, stats, filters);

    return html;
  } catch (error) {
    console.error('Error exporting transactions to PDF:', error);
    throw error;
  }
}

export async function saveAndShareExport(
  content: string,
  format: ExportFormat,
  fileName?: string
): Promise<void> {
  try {
    const timestamp = new Date().getTime();
    const defaultFileName = `transactions_${timestamp}.${format}`;
    const finalFileName = fileName || defaultFileName;
    const fileUri = `${FileSystem.documentDirectory}${finalFileName}`;

    await FileSystem.writeAsStringAsync(fileUri, content);

    if (await Sharing.isAvailableAsync()) {
      const mimeTypes: Record<ExportFormat, string> = {
        csv: 'text/csv',
        json: 'application/json',
        pdf: 'text/html',
      };

      await Sharing.shareAsync(fileUri, {
        mimeType: mimeTypes[format],
        dialogTitle: `Export Transactions (${format.toUpperCase()})`,
        UTI: format === 'csv' ? 'public.comma-separated-values-text' : undefined,
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error saving and sharing export:', error);
    throw error;
  }
}

export async function exportTransactions(
  walletId: string,
  format: ExportFormat,
  filters?: TransactionFilters,
  options?: ExportOptions
): Promise<void> {
  try {
    let content: string;
    let fileName: string;

    const timestamp = new Date().getTime();

    switch (format) {
      case 'csv':
        content = await exportTransactionsToCSV(walletId, filters, {
          includeStats: options?.includeStats,
        });
        fileName = `transactions_${timestamp}.csv`;
        break;

      case 'json':
        content = await exportTransactionsToJSON(walletId, filters, {
          includeStats: options?.includeStats,
          includeMetadata: options?.includeMetadata,
        });
        fileName = `transactions_${timestamp}.json`;
        break;

      case 'pdf':
        content = await exportTransactionsToPDF(walletId, filters, {
          includeStats: options?.includeStats,
        });
        fileName = `transactions_${timestamp}.html`;
        break;

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    await saveAndShareExport(content, format, fileName);
  } catch (error) {
    console.error('Error exporting transactions:', error);
    throw error;
  }
}

export function getExportFileName(
  format: ExportFormat,
  dateRange?: { start: string; end: string }
): string {
  const timestamp = new Date().getTime();

  if (dateRange) {
    const start = new Date(dateRange.start).toISOString().split('T')[0];
    const end = new Date(dateRange.end).toISOString().split('T')[0];
    return `transactions_${start}_to_${end}.${format}`;
  }

  return `transactions_${timestamp}.${format}`;
}

export function formatExportSize(bytes: number): string {
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function estimateExportSize(
  transactionCount: number,
  format: ExportFormat
): number {
  const avgBytesPerTransaction: Record<ExportFormat, number> = {
    csv: 150,
    json: 300,
    pdf: 500,
  };

  return transactionCount * avgBytesPerTransaction[format];
}
