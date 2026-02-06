// ============================================================================
// LOGIN PAGE
// ============================================================================

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { AlertCircle, Check, Copy, KeyRound } from 'lucide-react';
import { useState } from 'react';

export function LoginPage() {
    const { login, register, isLoading } = useAuth();
    const [accessKey, setAccessKey] = useState('');
    const [error, setError] = useState('');
    const [newKey, setNewKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            await login(accessKey);
            // Redirect will happen automatically via App.tsx
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRegister = async () => {
        setError('');
        setIsSubmitting(true);

        try {
            const key = await register();
            setNewKey(key);
            // Don't auto-login - user must click "Continue to Dashboard"
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleContinue = async () => {
        if (!newKey) return;
        setIsSubmitting(true);

        try {
            await login(newKey);
            // Redirect will happen automatically via App.tsx
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopy = () => {
        if (newKey) {
            navigator.clipboard.writeText(newKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
                <div className="text-slate-600 dark:text-slate-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-3 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <KeyRound className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Budget Blueprint</CardTitle>
                    <CardDescription>
                        Enter your access key to continue
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {newKey ? (
                        <div className="space-y-4">
                            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                                <p className="mb-2 text-sm font-medium text-green-900 dark:text-green-100">
                                    Your New Access Key
                                </p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 rounded bg-white px-3 py-2 text-sm font-mono text-green-900 dark:bg-slate-900 dark:text-green-100">
                                        {newKey}
                                    </code>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCopy}
                                        className="shrink-0"
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
                                <p className="text-sm text-amber-900 dark:text-amber-100">
                                    <strong>Save this key!</strong> It's your only way to access your account.
                                    If you lose it, you'll lose access to all your data.
                                </p>
                            </div>
                            <Button
                                onClick={handleContinue}
                                disabled={isSubmitting}
                                className="w-full"
                            >
                                {isSubmitting ? 'Loading...' : 'Continue to Dashboard'}
                            </Button>
                        </div>
                    ) : (
                        <>
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="accessKey">Access Key</Label>
                                    <Input
                                        id="accessKey"
                                        type="text"
                                        placeholder="Enter your UUID access key"
                                        value={accessKey}
                                        onChange={(e) => setAccessKey(e.target.value)}
                                        disabled={isSubmitting}
                                        autoFocus
                                        className="font-mono"
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={!accessKey.trim() || isSubmitting}
                                >
                                    {isSubmitting ? 'Verifying...' : 'Enter Dashboard'}
                                </Button>
                            </form>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <Separator />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">
                                        or
                                    </span>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleRegister}
                                disabled={isSubmitting}
                            >
                                Generate New Key
                            </Button>

                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    <strong>Note:</strong> Your access key is your only credential.
                                    Save it somewhere safe. There is no password reset or recovery option.
                                </p>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
