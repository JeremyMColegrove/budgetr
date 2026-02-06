// ============================================================================
// TEMPORAL STATE HOOK
// ============================================================================
// Determines whether a view month is past, present, or future.
// ============================================================================

import { monthIndex, parseMonthInput } from '@/lib/date-utils';

interface TemporalState {
  isPast: boolean;
  isFuture: boolean;
  isCurrent: boolean;
}

export function useTemporalState(viewDate: string | Date): TemporalState {
  const viewParts = parseMonthInput(viewDate);
  const nowParts = parseMonthInput(new Date());

  const viewIndex = monthIndex(viewParts);
  const nowIndex = monthIndex(nowParts);

  return {
    isPast: viewIndex < nowIndex,
    isFuture: viewIndex > nowIndex,
    isCurrent: viewIndex === nowIndex,
  };
}
