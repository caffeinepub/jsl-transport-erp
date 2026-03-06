/**
 * Format number as Indian currency (₹)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number with Indian number system
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-IN").format(num);
}

/**
 * Format date string to readable format
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Get month-year label from date string
 */
export function getMonthYear(dateStr: string): string {
  if (!dateStr) return "Unknown";
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-IN", {
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return "Unknown";
  }
}

/**
 * Get current month as YYYY-MM string
 */
export function getCurrentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Check if a date string belongs to the current month
 */
export function isCurrentMonth(dateStr: string): boolean {
  if (!dateStr) return false;
  const monthStr = getCurrentMonthStr();
  return dateStr.startsWith(monthStr);
}
