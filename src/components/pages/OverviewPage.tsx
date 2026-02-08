import { PageHeader } from '@/components/layout';
import { OverviewAccounts } from '@/components/overview/OverviewAccounts';
import { OverviewCharts } from '@/components/overview/OverviewCharts';
import { OverviewHero } from '@/components/overview/OverviewHero';
import { OverviewQuickActions } from '@/components/overview/OverviewQuickActions';
import { OverviewStats } from '@/components/overview/OverviewStats';
import { OverviewTodos } from '@/components/overview/OverviewTodos';
import { Skeleton } from '@/components/ui/skeleton';
import { useOverviewData } from '@/hooks/useOverviewData';
import { type PageId } from '@/components/layout/AppSidebar';

interface OverviewPageProps {
    onNavigate?: (page: PageId) => void;
}

export function OverviewPage({ onNavigate }: OverviewPageProps) {
    const { data, isLoading, error } = useOverviewData();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-56 w-full rounded-3xl" />
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <Skeleton key={index} className="h-24 w-full" />
                        ))}
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Skeleton className="h-80 w-full" />
                        <Skeleton className="h-80 w-full" />
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Skeleton className="h-72 w-full" />
                        <Skeleton className="h-72 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto max-w-4xl px-4 py-12">
                    <div className="rounded-xl border border-border/70 bg-card p-6 text-sm text-muted-foreground">
                        {error ?? 'Unable to load overview data. Please try again.'}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
                <PageHeader
                    title="Overview"
                    description={`Your budgeting cockpit for ${data.monthLabel}.`}
                />

                {error && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-200">
                        {error}
                    </div>
                )}

                <OverviewHero
                    profileName={data.profileName}
                    monthLabel={data.monthLabel}
                    netWorth={data.netWorth}
                    safeToSpend={data.safeToSpend}
                    plannedExpenses={data.plannedExpenses}
                    actualExpenses={data.actualExpenses}
                />

                <OverviewStats
                    totalIncome={data.totalIncome}
                    plannedExpenses={data.plannedExpenses}
                    actualExpenses={data.actualExpenses}
                    safeToSpend={data.safeToSpend}
                />

                <OverviewCharts
                    assets={data.totalAssets}
                    liabilities={data.totalLiabilities}
                    plannedExpenses={data.plannedExpenses}
                    actualExpenses={data.actualExpenses}
                />

                <div className="grid gap-4 lg:grid-cols-2">
                    <OverviewTodos
                        unpaidBills={data.unpaidBills}
                        onReviewTracking={() => onNavigate?.('tracking')}
                    />
                    <OverviewAccounts
                        accounts={data.accounts}
                        onViewAll={() => onNavigate?.('accounts')}
                    />
                </div>

                <OverviewQuickActions
                    nextSteps={data.nextSteps}
                    onNavigate={(destination) => onNavigate?.(destination)}
                />
            </div>
        </div>
    );
}
