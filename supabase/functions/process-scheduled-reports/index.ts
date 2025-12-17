import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ScheduledReport {
  id: string;
  admin_id: string;
  report_type: string;
  report_name: string;
  recipients: string[];
  format: string;
  filters: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get reports ready to run
    const { data: reports, error: reportsError } = await supabase.rpc(
      "get_reports_ready_to_run"
    );

    if (reportsError) throw reportsError;

    if (!reports || reports.length === 0) {
      return new Response(
        JSON.stringify({ message: "No reports to process", count: 0 }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const processedReports = [];

    for (const report of reports as ScheduledReport[]) {
      try {
        // Create report run entry
        const { data: reportRun, error: runError } = await supabase
          .from("report_runs")
          .insert({
            scheduled_report_id: report.id,
            status: "running",
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (runError) throw runError;

        // Fetch report data based on type
        const reportData = await fetchReportData(
          supabase,
          report.report_type,
          report.filters
        );

        // Generate report content
        const reportContent = generateReportContent(
          reportData,
          report.format,
          report.report_name
        );

        // In production, this would:
        // 1. Upload file to storage
        // 2. Send email with attachment
        // 3. Update report run with file URL

        // For now, just mark as completed
        await supabase
          .from("report_runs")
          .update({
            status: "completed",
            row_count: reportData.length,
            file_size: new Blob([reportContent]).size,
            completed_at: new Date().toISOString(),
          })
          .eq("id", reportRun.id);

        // Mark report as run
        await supabase.rpc("mark_report_as_run", {
          p_report_id: report.id,
        });

        processedReports.push(report.id);

        console.log(
          `Processed report ${report.id}: ${report.report_name}`
        );
      } catch (error: any) {
        console.error(`Error processing report ${report.id}:`, error);

        // Mark as failed
        await supabase
          .from("report_runs")
          .update({
            status: "failed",
            error_message: error.message,
            completed_at: new Date().toISOString(),
          })
          .eq("scheduled_report_id", report.id)
          .eq("status", "running");
      }
    }

    return new Response(
      JSON.stringify({
        message: "Reports processed successfully",
        count: processedReports.length,
        processed: processedReports,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error processing scheduled reports:", error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function fetchReportData(
  supabase: any,
  reportType: string,
  filters: Record<string, any>
): Promise<any[]> {
  let query;

  switch (reportType) {
    case "users":
      query = supabase
        .from("profiles")
        .select(
          "id, full_name, email, user_type, created_at, is_verified, is_suspended"
        )
        .order("created_at", { ascending: false });
      break;

    case "bookings":
      query = supabase
        .from("bookings")
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
        .order("created_at", { ascending: false });
      break;

    case "revenue":
      query = supabase
        .from("platform_metrics")
        .select(
          "metric_date, total_revenue, platform_fees, completed_bookings, total_users, active_users"
        )
        .order("metric_date", { ascending: false })
        .limit(30);
      break;

    case "disputes":
      query = supabase
        .from("disputes")
        .select(
          `
          id,
          status,
          reason,
          resolution,
          created_at,
          booking:bookings(id, total_amount),
          customer:profiles!disputes_customer_id_fkey(full_name, email),
          provider:profiles!disputes_provider_id_fkey(full_name, email)
        `
        )
        .order("created_at", { ascending: false });
      break;

    case "payouts":
      query = supabase
        .from("escrow_holds")
        .select(
          `
          id,
          amount,
          status,
          hold_until,
          released_at,
          created_at,
          provider:profiles!escrow_holds_provider_id_fkey(full_name, email)
        `
        )
        .order("created_at", { ascending: false });
      break;

    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

function generateReportContent(
  data: any[],
  format: string,
  reportName: string
): string {
  if (format === "csv") {
    return generateCSV(data);
  } else {
    return generateHTML(data, reportName);
  }
}

function generateCSV(data: any[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const headerRow = headers.join(",");

  const rows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return "";

        const stringValue = String(value);
        if (
          stringValue.includes(",") ||
          stringValue.includes('"') ||
          stringValue.includes("\n")
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(",");
  });

  return [headerRow, ...rows].join("\n");
}

function generateHTML(data: any[], reportName: string): string {
  if (data.length === 0) {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>${reportName}</title>
</head>
<body>
  <h1>${reportName}</h1>
  <p>No data available</p>
</body>
</html>
    `;
  }

  const headers = Object.keys(data[0]);
  const tableRows = data
    .map((row) => {
      const cells = headers.map((header) => `<td>${row[header] || ""}</td>`).join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${reportName}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    h1 {
      color: #007AFF;
      border-bottom: 3px solid #007AFF;
      padding-bottom: 10px;
      margin-bottom: 30px;
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
  <h1>${reportName}</h1>
  <table>
    <thead>
      <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
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
