/**
 * Export utilities for reports and data
 */

interface ExportColumn {
  key: string;
  label: string;
  format?: (value: unknown) => string;
}

/**
 * Export data to CSV and trigger download
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
): void {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Build header row
  const headers = columns.map((col) => `"${col.label}"`).join(",");

  // Build data rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const value = row[col.key];
        const formatted = col.format ? col.format(value) : String(value ?? "");
        // Escape quotes and wrap in quotes
        return `"${formatted.replace(/"/g, '""')}"`;
      })
      .join(",");
  });

  // Combine into CSV content
  const csvContent = [headers, ...rows].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format currency for export
 */
export function formatCurrency(value: unknown): string {
  const num = Number(value) || 0;
  return `UGX ${num.toLocaleString()}`;
}

/**
 * Format date for export
 */
export function formatDate(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  return date.toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format percentage for export
 */
export function formatPercent(value: unknown): string {
  const num = Number(value) || 0;
  return `${num.toFixed(1)}%`;
}

/**
 * Export analytics summary
 */
export interface AnalyticsSummary {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  avgPrepTime: number;
  topItems: { name: string; count: number; revenue: number }[];
  categoryBreakdown: { category: string; count: number; revenue: number }[];
  paymentMethods: { method: string; count: number; percent: number }[];
  dateRange: { start: string; end: string };
}

export function exportAnalyticsSummary(summary: AnalyticsSummary): void {
  // Export summary stats
  const summaryData = [
    {
      metric: "Total Orders",
      value: summary.totalOrders.toString(),
    },
    {
      metric: "Total Revenue",
      value: formatCurrency(summary.totalRevenue),
    },
    {
      metric: "Average Order Value",
      value: formatCurrency(summary.avgOrderValue),
    },
    {
      metric: "Average Prep Time",
      value: `${summary.avgPrepTime} mins`,
    },
    {
      metric: "Date Range",
      value: `${summary.dateRange.start} to ${summary.dateRange.end}`,
    },
  ];

  const filename = `9yards-analytics-${new Date().toISOString().split("T")[0]}`;

  // Create a more comprehensive report
  let csvContent = "9YARDS ANALYTICS REPORT\n";
  csvContent += `Generated: ${new Date().toLocaleString()}\n`;
  csvContent += `Period: ${summary.dateRange.start} to ${summary.dateRange.end}\n\n`;

  // Summary section
  csvContent += "SUMMARY\n";
  csvContent += "Metric,Value\n";
  summaryData.forEach((row) => {
    csvContent += `"${row.metric}","${row.value}"\n`;
  });

  // Top items section
  csvContent += "\nTOP SELLING ITEMS\n";
  csvContent += "Item,Quantity Sold,Revenue\n";
  summary.topItems.forEach((item) => {
    csvContent += `"${item.name}",${item.count},"${formatCurrency(item.revenue)}"\n`;
  });

  // Category breakdown
  csvContent += "\nREVENUE BY CATEGORY\n";
  csvContent += "Category,Orders,Revenue\n";
  summary.categoryBreakdown.forEach((cat) => {
    csvContent += `"${cat.category}",${cat.count},"${formatCurrency(cat.revenue)}"\n`;
  });

  // Payment methods
  csvContent += "\nPAYMENT METHODS\n";
  csvContent += "Method,Count,Percentage\n";
  summary.paymentMethods.forEach((pm) => {
    csvContent += `"${pm.method}",${pm.count},"${formatPercent(pm.percent)}"\n`;
  });

  // Download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export orders data
 */
export interface OrderExport {
  order_number: string;
  customer_name: string;
  customer_phone: string | null;
  status: string;
  payment_method: string;
  payment_status: string;
  total: number;
  created_at: string;
  items_count: number;
  [key: string]: string | number | null; // Index signature for Record<string, unknown> compatibility
}

export function exportOrders(orders: OrderExport[]): void {
  const columns: ExportColumn[] = [
    { key: "order_number", label: "Order #" },
    { key: "customer_name", label: "Customer" },
    { key: "customer_phone", label: "Phone" },
    { key: "status", label: "Status" },
    { key: "payment_method", label: "Payment Method" },
    { key: "payment_status", label: "Payment Status" },
    { key: "total", label: "Total", format: formatCurrency },
    { key: "created_at", label: "Date", format: formatDate },
    { key: "items_count", label: "Items" },
  ];

  exportToCSV(
    orders,
    columns,
    `9yards-orders-${new Date().toISOString().split("T")[0]}`
  );
}
