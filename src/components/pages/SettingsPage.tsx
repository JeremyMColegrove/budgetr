import { ImportDialog } from '@/components/budget/ImportDialog';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { dataTransfer } from '@/lib/data-transfer';
import { useBudgetStore } from '@/store/budget-store';
import { Database, Download, FileUp, Info } from 'lucide-react';
import { useCallback, useState } from 'react';

export function SettingsPage() {
    const profiles = useBudgetStore((s) => s.profiles);
    const initialize = useBudgetStore((s) => s.initialize);
    const [importDialogOpen, setImportDialogOpen] = useState(false);

    const handleExportAll = useCallback(async () => {
        const data = await dataTransfer.exportAll();
        dataTransfer.downloadExport(data);
    }, []);

    const handleExportProfile = useCallback(async (profileId: string, profileName: string) => {
        const data = await dataTransfer.exportProfile(profileId);
        dataTransfer.downloadExport(data, `budget-blueprint-${profileName.toLowerCase().replace(/\s+/g, '-')}.json`);
    }, []);

    const handleImportComplete = useCallback(() => {
        initialize();
    }, [initialize]);

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-4xl print:px-0 print:py-4">
                <PageHeader
                    title="Settings"
                    description="Manage your application preferences and budget data."
                />

                <div className="space-y-6">
                    {/* General Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle>General Preferences</CardTitle>
                            <CardDescription>Customize your experience.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 opacity-75">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Dark Mode</Label>
                                    <p className="text-sm text-muted-foreground">Enable dark mode for the application</p>
                                </div>
                                <Switch disabled checked />
                            </div>
                            {/* <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Compact View</Label>
                                    <p className="text-sm text-muted-foreground">Show more data on the screen</p>
                                </div>
                                <Switch disabled />
                            </div> */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                                <Info className="size-4" />
                                <p>Preferences are currently readonly and will be enabled in a future update.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Data Management Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="size-5" />
                                Data Management
                            </CardTitle>
                            <CardDescription>Import or export your budget data.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Export Row */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Export Data</Label>
                                    <p className="text-sm text-muted-foreground">Download a backup of your budget profiles.</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Button onClick={handleExportAll} disabled={profiles.length === 0} variant="outline" size="sm">
                                        <Download className="size-4 mr-2" />
                                        Export All Profiles
                                    </Button>
                                    {profiles.length > 1 && (
                                        <div className="flex flex-wrap justify-end gap-1">
                                            {profiles.map(p => (
                                                <Button
                                                    key={p.id}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-[10px] px-2 text-muted-foreground"
                                                    onClick={() => handleExportProfile(p.id, p.name)}
                                                >
                                                    {p.name}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Import Row */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t pt-6">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Import Data</Label>
                                    <p className="text-sm text-muted-foreground">Restore from a previously exported JSON file.</p>
                                </div>
                                <Button onClick={() => setImportDialogOpen(true)} variant="outline" size="sm">
                                    <FileUp className="size-4 mr-2" />
                                    Import File
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ImportDialog
                open={importDialogOpen}
                onOpenChange={setImportDialogOpen}
                onImportComplete={handleImportComplete}
            />
        </div>
    );
}
