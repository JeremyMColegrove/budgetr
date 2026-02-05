// ============================================================================
// ACCOUNT CARD COMPONENT
// ============================================================================
// Card component displaying account details with projected balance.
// ============================================================================

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Account, AccountType } from '@/types/budget';
import { ACCOUNT_TYPE_LABELS, ASSET_ACCOUNT_TYPES } from '@/types/budget';
import type { ProjectionResult } from '@/types/engine';
import { Banknote, CreditCard, Landmark, Pencil, PiggyBank, Trash2, TrendingUp } from 'lucide-react';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface AccountCardProps {
    account: Account;
    projection: ProjectionResult | null;
    onEdit: (account: Account) => void;
    onDelete: (account: Account) => void;
}

// Icon mapping for account types
const ACCOUNT_ICONS: Record<AccountType, React.ComponentType<{ className?: string }>> = {
    checking: Landmark,
    savings: PiggyBank,
    credit_card: CreditCard,
    loan: Banknote,
    investment: TrendingUp,
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function AccountCard({ account, projection, onEdit, onDelete }: AccountCardProps) {
    const Icon = ACCOUNT_ICONS[account.type];
    const isAsset = ASSET_ACCOUNT_TYPES.includes(account.type);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <Card className="group relative">
            {/* Actions */}
            {/* Actions */}
            <div className="absolute top-3 right-3 flex gap-1 print:hidden">
                <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => onEdit(account)}
                >
                    <Pencil className="size-3.5" />
                    <span className="sr-only">Edit</span>
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(account)}
                >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Delete</span>
                </Button>
            </div>

            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        'size-8 rounded-md flex items-center justify-center',
                        isAsset
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                    )}>
                        <Icon className="size-4" />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs font-normal mt-0.5">
                            {ACCOUNT_TYPE_LABELS[account.type]}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {/* Starting Balance */}
                <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Starting Balance</span>
                    <span className={cn(
                        'font-mono text-sm font-semibold',
                        account.startingBalance >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                    )}>
                        {formatCurrency(account.startingBalance)}
                    </span>
                </div>

                {/* Projected Balance (if projection data available) */}
                {projection && (
                    <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-xs text-muted-foreground">
                            Projected ({projection.months}mo)
                        </span>
                        <span className={cn(
                            'font-mono text-sm font-semibold',
                            projection.projectedBalance >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                        )}>
                            {formatCurrency(projection.projectedBalance)}
                        </span>
                    </div>
                )}

                {/* Monthly Net Flow (if projection data available) */}
                {projection && projection.monthlyNet !== 0 && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Monthly Net</span>
                        <span className={cn(
                            'font-mono',
                            projection.monthlyNet >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        )}>
                            {projection.monthlyNet >= 0 ? '+' : ''}{formatCurrency(projection.monthlyNet)}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
