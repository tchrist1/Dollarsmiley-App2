import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';

/**
 * Admin Dashboard Export Utilities
 * Supports CSV and PDF exports for various data types
 */

export type ExportFormat = 'csv' | 'pdf';
export type ExportType = 'users' | 'bookings' | 'revenue' | 'analytics' | 'disputes' | 'payouts';

interface ExportOptions {
  format: ExportFormat;
  type: ExportType;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const headerRow = headers.join(',');

  const rows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header];
        if (value === null || value === undefined) {
          return '';
        }
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(',');
  });

  return [headerRow, ...rows].join('\n');
}

/**
 * Generate HTML for PDF conversion
 */
function generateHTMLReport(data: any[], title: string, metadata?: Record<string, string>): string {
  const tableHeaders = data.length > 0 ? Object.keys(data[0]) : [];

  const metadataHTML = metadata
    ? Object.entries(metadata)
        .map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
        .join('')
    : '';

  const tableRows = data
    .map((row) => {
      const cells = tableHeaders.map((header) => `<td>${row[header] || ''}</td>`).join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    h1 {
      color: #007AFF;
      border-bottom: 3px solid #007AFF;
      padding-bottom: 10px;
      margin-bottom: 30px;
    }
    .metadata {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .metadata p {
      margin: 5px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    th {
      background: #007AFF;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #eee;
    }
    tr:hover {
      background: #f9f9f9;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #666;
      font-size: 12px;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${metadataHTML ? `<div class="metadata">${metadataHTML}</div>` : ''}
  <table>
    <thead>
      <tr>${tableHeaders.map((h) => `<th>${h}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  <div class="footer">
    <p>Generated on ${new Date().toLocaleString()}</p>
    <p>Dollarsmiley Admin Dashboard</p>
  </div>
</body>
</html>
  `;
}

/**
 * Save and share file on device
 */
async function saveAndShareFile(content: string, filename: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: 'utf8' as any,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: `Share ${filename}`,
        UTI: mimeType,
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  }
}

/**
 * Fetch users data for export
 */
async function fetchUsersData(filters?: Record<string, any>): Promise<any[]> {
  let query = supabase
    .from('profiles')
    .select('id, full_name, email, user_type, created_at, is_verified, is_suspended, subscription_plan')
    .order('created_at', { ascending: false });

  if (filters?.userType) {
    query = query.eq('user_type', filters.userType);
  }

  if (filters?.verified !== undefined) {
    query = query.eq('is_verified', filters.verified);
  }

  if (filters?.suspended !== undefined) {
    query = query.eq('is_suspended', filters.suspended);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).map((user) => ({
    ID: user.id,
    'Full Name': user.full_name,
    Email: user.email,
    'User Type': user.user_type,
    'Subscription Plan': user.subscription_plan || 'Free',
    Verified: user.is_verified ? 'Yes' : 'No',
    Suspended: user.is_suspended ? 'Yes' : 'No',
    'Created At': new Date(user.created_at).toLocaleDateString(),
  }));
}

/**
 * Fetch bookings data for export
 */
async function fetchBookingsData(dateRange?: { start: Date; end: Date }): Promise<any[]> {
  let query = supabase
    .from('bookings')
    .select(
      `
      id,
      status,
      total_amount,
      platform_fee,
      created_at,
      customer:profiles!bookings_customer_id_fkey(full_name, email),
      provider:profiles!bookings_provider_id_fkey(full_name, email),
      listing:service_listings(title)
    `
    )
    .order('created_at', { ascending: false });

  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).map((booking: any) => ({
    'Booking ID': booking.id,
    Status: booking.status,
    'Listing Title': booking.listing?.title || 'N/A',
    Customer: booking.customer?.full_name || 'N/A',
    'Customer Email': booking.customer?.email || 'N/A',
    Provider: booking.provider?.full_name || 'N/A',
    'Provider Email': booking.provider?.email || 'N/A',
    'Total Amount': `$${parseFloat(booking.total_amount || 0).toFixed(2)}`,
    'Platform Fee': `$${parseFloat(booking.platform_fee || 0).toFixed(2)}`,
    'Created At': new Date(booking.created_at).toLocaleDateString(),
  }));
}

/**
 * Fetch revenue data for export
 */
async function fetchRevenueData(dateRange?: { start: Date; end: Date }): Promise<any[]> {
  let query = supabase
    .from('platform_metrics')
    .select('metric_date, total_revenue, platform_fees, completed_bookings, total_users, active_users')
    .order('metric_date', { ascending: false });

  if (dateRange) {
    query = query
      .gte('metric_date', dateRange.start.toISOString().split('T')[0])
      .lte('metric_date', dateRange.end.toISOString().split('T')[0]);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).map((metric) => ({
    Date: metric.metric_date,
    'Total Revenue': `$${parseFloat(metric.total_revenue || 0).toFixed(2)}`,
    'Platform Fees': `$${parseFloat(metric.platform_fees || 0).toFixed(2)}`,
    'Completed Bookings': metric.completed_bookings || 0,
    'Total Users': metric.total_users || 0,
    'Active Users': metric.active_users || 0,
  }));
}

/**
 * Fetch disputes data for export
 */
async function fetchDisputesData(): Promise<any[]> {
  const { data, error } = await supabase
    .from('disputes')
    .select(
      `
      id,
      status,
      reason,
      resolution,
      created_at,
      resolved_at,
      booking:bookings(id, total_amount),
      customer:profiles!disputes_customer_id_fkey(full_name, email),
      provider:profiles!disputes_provider_id_fkey(full_name, email)
    `
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((dispute: any) => ({
    'Dispute ID': dispute.id,
    Status: dispute.status,
    Reason: dispute.reason,
    'Booking ID': dispute.booking?.id || 'N/A',
    'Booking Amount': `$${parseFloat(dispute.booking?.total_amount || 0).toFixed(2)}`,
    Customer: dispute.customer?.full_name || 'N/A',
    Provider: dispute.provider?.full_name || 'N/A',
    Resolution: dispute.resolution || 'Pending',
    'Created At': new Date(dispute.created_at).toLocaleDateString(),
    'Resolved At': dispute.resolved_at ? new Date(dispute.resolved_at).toLocaleDateString() : 'N/A',
  }));
}

/**
 * Fetch payouts data for export
 */
async function fetchPayoutsData(): Promise<any[]> {
  const { data, error } = await supabase
    .from('escrow_holds')
    .select(
      `
      id,
      amount,
      status,
      hold_until,
      released_at,
      created_at,
      booking:bookings(id),
      provider:profiles!escrow_holds_provider_id_fkey(full_name, email)
    `
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((escrow: any) => ({
    'Escrow ID': escrow.id,
    Status: escrow.status,
    Amount: `$${parseFloat(escrow.amount || 0).toFixed(2)}`,
    'Booking ID': escrow.booking?.id || 'N/A',
    Provider: escrow.provider?.full_name || 'N/A',
    'Provider Email': escrow.provider?.email || 'N/A',
    'Hold Until': escrow.hold_until ? new Date(escrow.hold_until).toLocaleDateString() : 'N/A',
    'Released At': escrow.released_at ? new Date(escrow.released_at).toLocaleDateString() : 'N/A',
    'Created At': new Date(escrow.created_at).toLocaleDateString(),
  }));
}

/**
 * Main export function
 */
export async function exportData(options: ExportOptions): Promise<void> {
  try {
    let data: any[] = [];
    let title = '';
    let metadata: Record<string, string> = {
      'Export Date': new Date().toLocaleString(),
      Format: options.format.toUpperCase(),
    };

    switch (options.type) {
      case 'users':
        data = await fetchUsersData(options.filters);
        title = 'Users Report';
        metadata['Total Users'] = String(data.length);
        break;

      case 'bookings':
        data = await fetchBookingsData(options.dateRange);
        title = 'Bookings Report';
        metadata['Total Bookings'] = String(data.length);
        if (options.dateRange) {
          metadata['Date Range'] = `${options.dateRange.start.toLocaleDateString()} - ${options.dateRange.end.toLocaleDateString()}`;
        }
        break;

      case 'revenue':
        data = await fetchRevenueData(options.dateRange);
        title = 'Revenue Report';
        metadata['Total Records'] = String(data.length);
        if (options.dateRange) {
          metadata['Date Range'] = `${options.dateRange.start.toLocaleDateString()} - ${options.dateRange.end.toLocaleDateString()}`;
        }
        break;

      case 'disputes':
        data = await fetchDisputesData();
        title = 'Disputes Report';
        metadata['Total Disputes'] = String(data.length);
        break;

      case 'payouts':
        data = await fetchPayoutsData();
        title = 'Payouts Report';
        metadata['Total Payouts'] = String(data.length);
        break;

      case 'analytics':
        data = await fetchRevenueData(options.dateRange);
        title = 'Analytics Report';
        metadata['Total Records'] = String(data.length);
        break;

      default:
        throw new Error('Invalid export type');
    }

    if (data.length === 0) {
      throw new Error('No data available to export');
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${options.type}_report_${timestamp}.${options.format}`;

    if (options.format === 'csv') {
      const csvContent = convertToCSV(data);
      await saveAndShareFile(csvContent, filename, 'text/csv');
    } else if (options.format === 'pdf') {
      const htmlContent = generateHTMLReport(data, title, metadata);
      await saveAndShareFile(htmlContent, filename.replace('.pdf', '.html'), 'text/html');
    }
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
}

/**
 * Quick export functions for common use cases
 */
export const exportUsers = (format: ExportFormat = 'csv') =>
  exportData({ format, type: 'users' });

export const exportBookings = (format: ExportFormat = 'csv', dateRange?: { start: Date; end: Date }) =>
  exportData({ format, type: 'bookings', dateRange });

export const exportRevenue = (format: ExportFormat = 'csv', dateRange?: { start: Date; end: Date }) =>
  exportData({ format, type: 'revenue', dateRange });

export const exportDisputes = (format: ExportFormat = 'csv') =>
  exportData({ format, type: 'disputes' });

export const exportPayouts = (format: ExportFormat = 'csv') =>
  exportData({ format, type: 'payouts' });

export const exportAnalytics = (format: ExportFormat = 'csv', dateRange?: { start: Date; end: Date }) =>
  exportData({ format, type: 'analytics', dateRange });
