// ============================================================================
// DATA MANAGEMENT PAGE
// ============================================================================
// Page for importing and exporting budget data.
// ============================================================================

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { dataTransfer } from '@/lib/data-transfer';
import { useBudgetStore } from '@/store/budget-store';
import { Database, Download, FileJson, Upload } from 'lucide-react';
import { useCallback, useState } from 'react';
import { ImportDialog } from './ImportDialog';

export function DataManagement() {
    const profiles = useBudgetStore((s) => s.profiles);
    const activeProfileId = useBudgetStore((s) => s.activeProfileId);
    const initialize = useBudgetStore((s) => s.initialize);
    const [importDialogOpen, setImportDialogOpen] = useState(false);

    const totalRules = profiles.reduce((sum, p) => sum + p.rules.length, 0);

    const handleExportAll = useCallback(async () => {
        const data = await dataTransfer.exportAll();
        dataTransfer.downloadExport(data);
    }, []);

    const handleExportProfile = useCallback(async (profileId: string, profileName: string) => {
        const data = await dataTransfer.exportProfile(profileId);
        dataTransfer.downloadExport(data, `budget-blueprint-${profileName.toLowerCase().replace(/\s+/g, '-')}.json`);
    }, []);

    const handleImportComplete = useCallback(() => {
        // Re-initialize the store to pick up imported data
        initialize();
    }, [initialize]);

    return (
        <div className="container mx-auto px-4 py-6 max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
                <Database className="size-6 text-muted-foreground" />
                <h1 className="text-2xl font-semibold">Data Management</h1>
            </div>

            <div className="grid gap-6">
                {/* Data Overview */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Data Overview</CardTitle>
                        <CardDescription>
                            Current data stored in your browser
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-sm">
                                    {profiles.length}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    {profiles.length === 1 ? 'Profile' : 'Profiles'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-sm">
                                    {totalRules}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    Total Rules
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Export Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Download className="size-5" />
                            Export Data
                        </CardTitle>
                        <CardDescription>
                            Download your budget data as a JSON file for backup or transfer
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button onClick={handleExportAll} disabled={profiles.length === 0}>
                            <FileJson className="size-4 mr-2" />
                            Export All Profiles
                        </Button>

                        {profiles.length > 1 && (
                            <>
                                <Separator />
                                <div>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Or export individual profiles:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {profiles.map((profile) => (
                                            <Button
                                                key={profile.id}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleExportProfile(profile.id, profile.name)}
                                            >
                                                {profile.name}
                                                {profile.id === activeProfileId && (
                                                    <Badge variant="secondary" className="ml-2 text-xs">
                                                        Active
                                                    </Badge>
                                                )}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Import Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Upload className="size-5" />
                            Import Data
                        </CardTitle>
                        <CardDescription>
                            Import budget data from a previously exported JSON file
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => setImportDialogOpen(true)}>
                            <Upload className="size-4 mr-2" />
                            Import from File
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <ImportDialog
                open={importDialogOpen}
                onOpenChange={setImportDialogOpen}
                onImportComplete={handleImportComplete}
            />
        </div>
    );
}
