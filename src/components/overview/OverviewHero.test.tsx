import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OverviewHero } from './OverviewHero';
import { exportNodeAsPng } from '@/lib/exportCardImage';

vi.mock('@/lib/exportCardImage', () => ({
    exportNodeAsPng: vi.fn().mockResolvedValue(undefined),
}));

describe('OverviewHero', () => {
    it('exports the hero snapshot on export click', async () => {
        const user = userEvent.setup();

        render(
            <OverviewHero
                profileName="Alex"
                monthLabel="Feb 2026"
                netWorth={4200}
                safeToSpend={2000}
                plannedExpenses={3200}
                actualExpenses={1800}
            />
        );

        const exportButton = screen.getByRole('button', { name: 'Export snapshot' });
        await user.click(exportButton);

        expect(exportNodeAsPng).toHaveBeenCalledWith(
            expect.any(HTMLElement),
            { filename: 'overview-Feb-2026.png' }
        );
    });
});
