import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import {
    Bar,
    BarChart,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface OverviewChartsProps {
    assets: number;
    liabilities: number;
    plannedExpenses: number;
    actualExpenses: number;
}

export function OverviewCharts({
    assets,
    liabilities,
    plannedExpenses,
    actualExpenses,
}: OverviewChartsProps) {
    const balanceData = [
        { name: 'Assets', value: Math.max(assets, 0) },
        { name: 'Liabilities', value: Math.max(liabilities, 0) },
    ];

    const spendingData = [
        { name: 'Planned', value: plannedExpenses },
        { name: 'Actual', value: actualExpenses },
    ];

    return (
        <section className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/60 bg-card/80 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">Net Worth Mix</p>
                        <p className="text-sm text-muted-foreground">Assets vs liabilities</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-lg font-semibold">{formatCurrency(assets - liabilities)}</p>
                    </div>
                </div>
                <div className="mt-4 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={balanceData}
                                dataKey="value"
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={80}
                                paddingAngle={3}
                                stroke="none"
                            >
                                <Cell key="assets" fill="var(--color-chart-2)" />
                                <Cell key="liabilities" fill="var(--color-chart-4)" />
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{
                                    background: 'var(--color-card)',
                                    borderRadius: 12,
                                    border: '1px solid var(--color-border)',
                                    color: 'var(--color-foreground)',
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                        <span>Assets</span>
                        <span>{formatCurrency(assets)}</span>
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>Liabilities</span>
                        <span>{formatCurrency(liabilities)}</span>
                    </div>
                </div>
            </Card>

            <Card className="border-border/60 bg-card/80 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">Spending Pace</p>
                        <p className="text-sm text-muted-foreground">Planned vs actual</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Gap</p>
                        <p className="text-lg font-semibold">
                            {formatCurrency(plannedExpenses - actualExpenses)}
                        </p>
                    </div>
                </div>
                <div className="mt-4 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={spendingData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                            <XAxis dataKey="name" tickLine={false} axisLine={false} />
                            <YAxis hide />
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{
                                    background: 'var(--color-card)',
                                    borderRadius: 12,
                                    border: '1px solid var(--color-border)',
                                    color: 'var(--color-foreground)',
                                }}
                            />
                            <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                                <Cell key="planned" fill="var(--color-chart-3)" />
                                <Cell key="actual" fill="var(--color-chart-5)" />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </section>
    );
}
