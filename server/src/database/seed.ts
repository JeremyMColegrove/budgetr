// ============================================================================
// DEFAULT CATEGORY SEED DATA
// ============================================================================

export const DEFAULT_CATEGORIES = [
  { name: 'Rent', kind: 'bill' },
  { name: 'Mortgage', kind: 'bill' },
  { name: 'Utilities', kind: 'bill' },
  { name: 'Internet', kind: 'bill' },
  { name: 'Insurance', kind: 'bill' },
  { name: 'Subscriptions', kind: 'bill' },
  { name: 'Groceries', kind: 'spending' },
  { name: 'Dining Out', kind: 'spending' },
  { name: 'Gas', kind: 'spending' },
  { name: 'Shopping', kind: 'spending' },
  { name: 'Entertainment', kind: 'spending' },
  { name: 'Medical', kind: 'spending' },
] as const;
