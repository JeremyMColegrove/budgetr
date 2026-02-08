import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { OverviewAccountSummary } from '@/hooks/useOverviewData';
import { Landmark } from 'lucide-react';

interface OverviewAccountsProps {
    accounts: OverviewAccountSummary[];
    onViewAll?: () => void;
}

export function OverviewAccounts({ accounts, onViewAll }: OverviewAccountsProps) {
    const topAccounts = accounts.slice(0, 4);

    return (
        <Card className="border-border/60 bg-card/80 p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Accounts</p>
                    <p className="text-sm text-muted-foreground">Balances and projections</p>
                </div>
                <Landmark className="size-5 text-muted-foreground" />
            </div>

            <div className="mt-4 space-y-3">
                {accounts.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                        No accounts yet. Add one to see your balances here.
                    </div>
                ) : (
                    topAccounts.map((account) => (
                        <div key={account.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-background/40 px-4 py-3">
                            <div>
                                <p className="text-sm font-medium">{account.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                    {account.type.replace('_', ' ')}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-semibold">{formatCurrency(account.balance)}</p>
                                {account.projectedBalance !== undefined && (
                                    <p className="text-xs text-muted-foreground">
                                        {formatCurrency(account.projectedBalance)} in {account.projectionMonths}mo
                                    </p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-4">
                <Button
                    variant="secondary"
                    className="w-full"
                    onClick={onViewAll}
                >
                    View All Accounts
                </Button>
            </div>
        </Card>
    );
}
