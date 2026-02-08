import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface OverviewStatsProps {
    totalIncome: number;
    plannedExpenses: number;
    actualExpenses: number;
    safeToSpend: number;
}

export function OverviewStats({
    totalIncome,
    plannedExpenses,
    actualExpenses,
    safeToSpend,
}: OverviewStatsProps) {
    const stats = [
        { label: 'Monthly Income', value: totalIncome, tone: 'text-emerald-500' },
        { label: 'Planned Expenses', value: plannedExpenses, tone: 'text-amber-500' },
        { label: 'Actual Spend', value: actualExpenses, tone: 'text-rose-500' },
        { label: 'Safe to Spend', value: safeToSpend, tone: 'text-cyan-500' },
    ];

    return (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
                <Card key={stat.label} className="border-border/60 bg-card/80 p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                    <p className={`mt-3 text-2xl font-semibold ${stat.tone}`}>
                        {formatCurrency(stat.value)}
                    </p>
                </Card>
            ))}
        </section>
    );
}
