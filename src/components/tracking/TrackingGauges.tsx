import { Building2, Coffee } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

type GaugeData = {
    spent: number;
    total: number;
    label: string;
    icon: React.ReactNode;
    color: string;
};

type TrackingGaugesProps = {
    fixed: { spent: number; total: number };
    discretionary: { spent: number; total: number };
};

function Gauge({ data }: { data: GaugeData }) {
    const percentage = data.total > 0 ? (data.spent / data.total) * 100 : 0;
    const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
    const isOver = percentage > 100;

    const chartData = [
        { name: 'Spent', value: clampedPercentage },
        { name: 'Remaining', value: 100 - clampedPercentage },
    ];

    // Determine color based on status if not over
    // But design typically has fixed colors for categories.
    // "Fixed" is usually blue/slate, "Discretionary" green/emerald.
    // Over budget should be red.

    const activeColor = isOver ? '#e11d48' : data.color; // rose-600 if over

    return (
        <div className="flex flex-col items-center w-full min-w-0">
            <div className="relative h-[100px] w-full max-w-[160px] mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="80%" // Move center down to create semi-circle effect better
                            startAngle={180}
                            endAngle={0}
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={5}
                        >
                            <Cell key="spent" fill={activeColor} />
                            <Cell key="remaining" fill="#e5e7eb" /> {/* gray-200 */}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                {/* Icon in the middle */}
                <div className="absolute left-1/2 top-[60%] -translate-x-1/2 -translate-y-1/2 text-muted-foreground">
                    {data.icon}
                </div>
            </div>

            <div className="text-center mt-[-10px]">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{data.label}</h3>
                <p className="text-sm font-medium">
                    <span className="font-bold text-foreground">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data.spent)}
                    </span>
                    {' / '}
                    <span className="text-muted-foreground">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data.total)}
                    </span>
                </p>
            </div>
        </div>
    );
}

export function TrackingGauges({ fixed, discretionary }: TrackingGaugesProps) {
    return (
        <div className="grid grid-cols-2 gap-4 py-4">
            <Gauge
                data={{
                    spent: fixed.spent,
                    total: fixed.total,
                    label: 'Fixed',
                    icon: <Building2 size={24} />,
                    color: '#3b82f6', // blue-500
                }}
            />
            <Gauge
                data={{
                    spent: discretionary.spent,
                    total: discretionary.total,
                    label: 'Discretionary',
                    icon: <Coffee size={24} />,
                    color: '#10b981', // emerald-500
                }}
            />
        </div>
    );
}
