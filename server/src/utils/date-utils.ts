// ============================================================================
// DATE UTILITIES
// ============================================================================
// Month manipulation utilities for the Month-Grain Budget Engine

/**
 * Get the current month in ISO format (YYYY-MM)
 */
export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get the previous month in ISO format (YYYY-MM)
 * @param monthIso - Month in "YYYY-MM" format
 * @returns Previous month in "YYYY-MM" format
 */
export function getPreviousMonth(monthIso: string): string {
  const [year, month] = monthIso.split('-').map(Number);
  
  if (month === 1) {
    // January -> December of previous year
    return `${year - 1}-12`;
  } else {
    // Any other month -> previous month
    return `${year}-${String(month - 1).padStart(2, '0')}`;
  }
}

/**
 * Get the next month in ISO format (YYYY-MM)
 * @param monthIso - Month in "YYYY-MM" format
 * @returns Next month in "YYYY-MM" format
 */
export function getNextMonth(monthIso: string): string {
  const [year, month] = monthIso.split('-').map(Number);
  
  if (month === 12) {
    // December -> January of next year
    return `${year + 1}-01`;
  } else {
    // Any other month -> next month
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  }
}

/**
 * Compare two months
 * @param month1 - First month in "YYYY-MM" format
 * @param month2 - Second month in "YYYY-MM" format
 * @returns -1 if month1 < month2, 0 if equal, 1 if month1 > month2
 */
export function compareMonths(month1: string, month2: string): number {
  if (month1 < month2) return -1;
  if (month1 > month2) return 1;
  return 0;
}

/**
 * Validate month format (YYYY-MM)
 * @param month - Month string to validate
 * @returns true if valid, false otherwise
 */
export function isValidMonthFormat(month: string): boolean {
  const regex = /^\d{4}-(0[1-9]|1[0-2])$/;
  return regex.test(month);
}

/**
 * Format a month for display (e.g., "2026-02" -> "February 2026")
 * @param monthIso - Month in "YYYY-MM" format
 * @returns Formatted month string
 */
export function formatMonthForDisplay(monthIso: string): string {
  const [year, month] = monthIso.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
