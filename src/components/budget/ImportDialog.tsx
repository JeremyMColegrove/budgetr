// ============================================================================
// IMPORT DIALOG COMPONENT
// ============================================================================
// Modal dialog for importing budget data with validation and options.
// ============================================================================

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    dataTransfer,
    type ConflictResolution,
    type ImportMode,
    type ImportResult,
    type ValidationResult
} from '@/lib/data-transfer';
import { AlertTriangle, CheckCircle2, FileWarning, Upload, XCircle } from 'lucide-react';
import { useCallback, useState } from 'react';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface ImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImportComplete: () => void;
}

type ImportStep = 'select' | 'preview' | 'result';

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function ImportDialog({ open, onOpenChange, onImportComplete }: ImportDialogProps) {
    const [step, setStep] = useState<ImportStep>('select');
    const [validation, setValidation] = useState<ValidationResult | null>(null);
    const [importMode, setImportMode] = useState<ImportMode>('merge');
    const [conflictResolution, setConflictResolution] = useState<ConflictResolution>('skip');
    const [result, setResult] = useState<ImportResult | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const resetState = useCallback(() => {
        setStep('select');
        setValidation(null);
        setResult(null);
        setImportMode('merge');
        setConflictResolution('skip');
    }, []);

    const handleOpenChange = useCallback(
        (newOpen: boolean) => {
            if (!newOpen) {
                resetState();
            }
            onOpenChange(newOpen);
        },
        [onOpenChange, resetState]
    );

    const handleFileSelect = useCallback(async (file: File) => {
        try {
            const text = await file.text();
            const json = JSON.parse(text);
            const validationResult = dataTransfer.validateImport(json);
            setValidation(validationResult);
            setStep('preview');
        } catch {
            setValidation({
                valid: false,
                errors: ['Invalid JSON file'],
                warnings: [],
                data: null,
            });
            setStep('preview');
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'application/json') {
                handleFileSelect(file);
            }
        },
        [handleFileSelect]
    );

    const handleImport = useCallback(async () => {
        if (!validation?.data) return;

        const importResult = await dataTransfer.importData(validation.data, {
            mode: importMode,
            conflictResolution,
        });

        setResult(importResult);
        setStep('result');

        if (importResult.success) {
            onImportComplete();
        }
    }, [validation, importMode, conflictResolution, onImportComplete]);

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogContent className="max-w-lg">
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {step === 'select' && 'Import Budget Data'}
                        {step === 'preview' && 'Preview Import'}
                        {step === 'result' && 'Import Complete'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {step === 'select' && 'Select a JSON file exported from Budget Blueprint.'}
                        {step === 'preview' && 'Review the data and configure import options.'}
                        {step === 'result' && 'Your data has been imported.'}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {/* Step 1: File Selection */}
                {step === 'select' && (
                    <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                            }`}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        <Upload className="size-10 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-3">
                            Drag and drop a JSON file here, or
                        </p>
                        <Button variant="outline" asChild>
                            <label>
                                Browse Files
                                <input
                                    type="file"
                                    accept=".json,application/json"
                                    className="sr-only"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileSelect(file);
                                    }}
                                />
                            </label>
                        </Button>
                    </div>
                )}

                {/* Step 2: Preview & Options */}
                {step === 'preview' && validation && (
                    <div className="space-y-4">
                        {/* Validation Status */}
                        <div
                            className={`flex items-start gap-3 p-3 rounded-lg ${validation.valid
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-destructive/10 text-destructive'
                                }`}
                        >
                            {validation.valid ? (
                                <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
                            ) : (
                                <XCircle className="size-5 shrink-0 mt-0.5" />
                            )}
                            <div className="text-sm">
                                {validation.valid ? (
                                    <p>
                                        Valid export file with{' '}
                                        <strong>{validation.data?.profiles.length}</strong> profile(s)
                                    </p>
                                ) : (
                                    <div>
                                        <p className="font-medium">Invalid file</p>
                                        <ul className="list-disc list-inside mt-1">
                                            {validation.errors.map((error, i) => (
                                                <li key={i}>{error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Warnings */}
                        {validation.warnings.length > 0 && (
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                <AlertTriangle className="size-5 shrink-0 mt-0.5" />
                                <ul className="text-sm list-disc list-inside">
                                    {validation.warnings.map((warning, i) => (
                                        <li key={i}>{warning}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Import Options */}
                        {validation.valid && (
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label>Import Mode</Label>
                                    <Select value={importMode} onValueChange={(v) => setImportMode(v as ImportMode)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="merge">
                                                Merge with existing data
                                            </SelectItem>
                                            <SelectItem value="replace">
                                                Replace all existing data
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {importMode === 'merge' && (
                                    <div className="space-y-1.5">
                                        <Label>When names conflict</Label>
                                        <Select
                                            value={conflictResolution}
                                            onValueChange={(v) => setConflictResolution(v as ConflictResolution)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="skip">Skip duplicates</SelectItem>
                                                <SelectItem value="overwrite">Overwrite existing</SelectItem>
                                                <SelectItem value="rename">Rename imported</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Result */}
                {step === 'result' && result && (
                    <div className="space-y-4">
                        <div
                            className={`flex items-start gap-3 p-4 rounded-lg ${result.success
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-destructive/10 text-destructive'
                                }`}
                        >
                            {result.success ? (
                                <CheckCircle2 className="size-6 shrink-0" />
                            ) : (
                                <FileWarning className="size-6 shrink-0" />
                            )}
                            <div>
                                <p className="font-medium">
                                    {result.success ? 'Import Successful' : 'Import Failed'}
                                </p>
                                <div className="flex gap-2 mt-2">
                                    <Badge variant="secondary">
                                        {result.profilesImported} profiles
                                    </Badge>
                                    <Badge variant="secondary">
                                        {result.rulesImported} rules
                                    </Badge>
                                    {result.profilesSkipped > 0 && (
                                        <Badge variant="outline">
                                            {result.profilesSkipped} skipped
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        {result.warnings.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                                <p className="font-medium mb-1">Notes:</p>
                                <ul className="list-disc list-inside space-y-0.5">
                                    {result.warnings.map((warning, i) => (
                                        <li key={i}>{warning}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {result.errors.length > 0 && (
                            <div className="text-sm text-destructive">
                                <p className="font-medium mb-1">Errors:</p>
                                <ul className="list-disc list-inside space-y-0.5">
                                    {result.errors.map((error, i) => (
                                        <li key={i}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <AlertDialogFooter>
                    <AlertDialogCancel onClick={resetState}>
                        {step === 'result' ? 'Close' : 'Cancel'}
                    </AlertDialogCancel>
                    {step === 'preview' && validation?.valid && (
                        <AlertDialogAction onClick={handleImport}>Import</AlertDialogAction>
                    )}
                    {step === 'preview' && !validation?.valid && (
                        <Button variant="outline" onClick={() => setStep('select')}>
                            Try Another File
                        </Button>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
