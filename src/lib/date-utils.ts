// ============================================================================
// DATE UTILITIES
// ============================================================================
// Helpers for month parsing, formatting, and comparisons.
// ============================================================================

export interface MonthParts {
  year: number;
  month: number; // 1-12
}

export function parseMonthInput(input: string | Date): MonthParts {
  if (input instanceof Date) {
    return { year: input.getFullYear(), month: input.getMonth() + 1 };
  }

  const [yearPart, monthPart] = input.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    throw new Error(`Invalid month input: ${input}`);
  }

  return { year, month };
}

export function toMonthString(parts: MonthParts): string {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}`;
}

export function addMonths(monthISO: string, delta: number): string {
  const { year, month } = parseMonthInput(monthISO);
  const date = new Date(year, month - 1 + delta, 1);
  return toMonthString({ year: date.getFullYear(), month: date.getMonth() + 1 });
}

export function formatMonthLabel(parts: MonthParts): string {
  const date = new Date(parts.year, parts.month - 1, 1);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

export function monthIndex(parts: MonthParts): number {
  return parts.year * 12 + parts.month;
}
