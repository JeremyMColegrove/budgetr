import { useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { exportNodeAsPng } from '@/lib/exportCardImage';
import { formatCurrency } from '@/lib/utils';

interface OverviewHeroProps {
    profileName: string;
    monthLabel: string;
    netWorth: number;
    safeToSpend: number;
    plannedExpenses: number;
    actualExpenses: number;
}

export function OverviewHero({
    profileName,
    monthLabel,
    netWorth,
    safeToSpend,
    plannedExpenses,
    actualExpenses,
}: OverviewHeroProps) {
    const sectionRef = useRef<HTMLElement | null>(null);
    const exportLockRef = useRef(false);
    const [isExporting, setIsExporting] = useState(false);
    const spendingProgress = plannedExpenses > 0
        ? Math.min((actualExpenses / plannedExpenses) * 100, 100)
        : 0;

    const handleExport = async () => {
        if (!sectionRef.current || exportLockRef.current || isExporting) {
            return;
        }

        const safeMonthLabel = monthLabel.trim().replace(/\s+/g, '-');
        const filename = `overview-${safeMonthLabel}.png`;

        exportLockRef.current = true;
        setIsExporting(true);
        try {
            await exportNodeAsPng(sectionRef.current, { filename });
        } catch (error) {
            console.error('Failed to export overview snapshot.', error);
        } finally {
            setIsExporting(false);
            exportLockRef.current = false;
        }
    };

    return (
        <section ref={sectionRef} className="relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl">
            <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-fuchsia-500/30 blur-3xl" />
            <div className="absolute -bottom-32 left-0 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-6 top-4 z-20 border border-white/10 bg-white/5 text-white shadow-sm transition hover:bg-white/10 hover:text-white md:right-8"
                aria-label="Export snapshot"
                data-export-ignore="true"
                disabled={isExporting}
                aria-busy={isExporting}
                onClick={handleExport}
            >
                <Download />
            </Button>
            <div className="relative z-10 px-6 py-8 md:px-8 md:py-10">
                <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
                    <span>Overview</span>
                    <Badge variant="secondary" className="bg-white/10 text-white border-white/10">
                        {monthLabel}
                    </Badge>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:items-end">
                    <div>
                        <p className="text-sm text-slate-300">Welcome back, {profileName}</p>
                        <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
                            {formatCurrency(netWorth)}
                        </h1>
                        <p className="mt-2 text-sm text-slate-300">Total net worth</p>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between text-xs text-slate-300">
                            <span>Safe to spend</span>
                            <span className="text-base font-semibold text-white">
                                {formatCurrency(safeToSpend)}
                            </span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-slate-300">
                                <span>Planned vs actual spend</span>
                                <span className="text-white">
                                    {formatCurrency(actualExpenses)} / {formatCurrency(plannedExpenses)}
                                </span>
                            </div>
                            <Progress value={spendingProgress} className="h-2 bg-white/10 [&>div]:bg-cyan-400" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
