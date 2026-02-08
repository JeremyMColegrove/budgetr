import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import type { OverviewNextStep } from '@/hooks/useOverviewData';
import { ArrowRight, ClipboardCheck, ListChecks } from 'lucide-react';

interface OverviewQuickActionsProps {
    nextSteps: OverviewNextStep[];
    onNavigate: (destination: OverviewNextStep['action']) => void;
}

export function OverviewQuickActions({ nextSteps, onNavigate }: OverviewQuickActionsProps) {
    return (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="border-border/60 bg-card/80 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">Quick Actions</p>
                        <p className="text-sm text-muted-foreground">Jump to your key pages</p>
                    </div>
                    <ArrowRight className="size-5 text-muted-foreground" />
                </div>

                <div className="mt-4 grid gap-3">
                    <Button
                        variant="secondary"
                        className="justify-between"
                        onClick={() => onNavigate('tracking')}
                    >
                        Review Tracking
                        <ArrowRight className="size-4" />
                    </Button>
                    <Button
                        variant="secondary"
                        className="justify-between"
                        onClick={() => onNavigate('budget')}
                    >
                        Update Budget Rules
                        <ArrowRight className="size-4" />
                    </Button>
                    <Button
                        variant="secondary"
                        className="justify-between"
                        onClick={() => onNavigate('accounts')}
                    >
                        Manage Accounts
                        <ArrowRight className="size-4" />
                    </Button>
                </div>
            </Card>

            <Card className="border-border/60 bg-card/80 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">Next Steps</p>
                        <p className="text-sm text-muted-foreground">TurboTax-style checklist</p>
                    </div>
                    <ListChecks className="size-5 text-muted-foreground" />
                </div>

                <div className="mt-4 space-y-3">
                    {nextSteps.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                            You are fully set up. Keep tracking for the rest of the month.
                        </div>
                    ) : (
                        nextSteps.map((step) => (
                            <button
                                key={step.id}
                                type="button"
                                onClick={() => onNavigate(step.action)}
                                className="flex w-full items-start gap-3 rounded-xl border border-border/70 bg-background/40 px-4 py-3 text-left transition hover:border-primary/50 hover:bg-primary/5"
                            >
                                <Checkbox checked={false} className="mt-1" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{step.title}</p>
                                    <p className="text-xs text-muted-foreground">{step.description}</p>
                                </div>
                                <ClipboardCheck className="size-4 text-muted-foreground" />
                            </button>
                        ))
                    )}
                </div>
            </Card>
        </section>
    );
}
