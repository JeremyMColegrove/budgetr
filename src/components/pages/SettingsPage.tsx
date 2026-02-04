// ============================================================================
// SETTINGS PAGE COMPONENT
// ============================================================================
// Placeholder settings page for future configuration options.
// ============================================================================

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon } from 'lucide-react';

export function SettingsPage() {
    return (
        <div className="container mx-auto px-4 py-6 max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
                <SettingsIcon className="size-6 text-muted-foreground" />
                <h1 className="text-2xl font-semibold">Settings</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Application Settings</CardTitle>
                    <CardDescription>
                        Settings and configuration options will be available here in a future update.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                    <p>Planned features:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Theme preferences (light/dark mode)</li>
                        <li>Currency and locale settings</li>
                        <li>Default categories management</li>
                        <li>Print layout customization</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
