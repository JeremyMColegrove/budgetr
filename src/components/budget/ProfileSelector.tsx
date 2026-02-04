// ============================================================================
// PROFILE SELECTOR COMPONENT
// ============================================================================
// Dropdown for switching between budget profiles with CRUD actions.
// ============================================================================

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useBudgetStore } from '@/store/budget-store';
import { Copy, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export function ProfileSelector() {
    const profiles = useBudgetStore((s) => s.profiles);
    const activeProfileId = useBudgetStore((s) => s.activeProfileId);
    const setActiveProfile = useBudgetStore((s) => s.setActiveProfile);
    const createProfile = useBudgetStore((s) => s.createProfile);
    const updateProfile = useBudgetStore((s) => s.updateProfile);
    const deleteProfile = useBudgetStore((s) => s.deleteProfile);
    const duplicateProfile = useBudgetStore((s) => s.duplicateProfile);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'create' | 'rename'>('create');
    const [profileName, setProfileName] = useState('');
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

    const activeProfile = profiles.find((p) => p.id === activeProfileId);

    const handleCreate = () => {
        setDialogMode('create');
        setProfileName('');
        setDialogOpen(true);
    };

    const handleRename = () => {
        if (!activeProfile) return;
        setDialogMode('rename');
        setProfileName(activeProfile.name);
        setEditingProfileId(activeProfile.id);
        setDialogOpen(true);
    };

    const handleDuplicate = async () => {
        if (!activeProfileId) return;
        await duplicateProfile(activeProfileId);
    };

    const handleDelete = async () => {
        if (!activeProfileId || profiles.length <= 1) return;
        if (confirm('Are you sure you want to delete this profile?')) {
            await deleteProfile(activeProfileId);
        }
    };

    const handleDialogSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profileName.trim()) return;

        if (dialogMode === 'create') {
            await createProfile(profileName.trim());
        } else if (editingProfileId) {
            await updateProfile(editingProfileId, profileName.trim());
        }

        setDialogOpen(false);
        setProfileName('');
        setEditingProfileId(null);
    };

    return (
        <div className="flex items-center gap-2" data-no-print>
            {/* Profile Selector */}
            <Select value={activeProfileId ?? ''} onValueChange={setActiveProfile}>
                <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                    {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                            {profile.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Actions Menu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="size-7 p-0">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Profile actions</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCreate}>
                        <Plus className="size-4 mr-2" />
                        New Budget
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleRename}>
                        <Pencil className="size-4 mr-2" />
                        Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDuplicate}>
                        <Copy className="size-4 mr-2" />
                        Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={handleDelete}
                        disabled={profiles.length <= 1}
                        className="text-destructive focus:text-destructive"
                    >
                        <Trash2 className="size-4 mr-2" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Create/Rename Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            {dialogMode === 'create' ? 'New Profile' : 'Rename Profile'}
                        </DialogTitle>
                        <DialogDescription>
                            {dialogMode === 'create'
                                ? 'Create a new budget profile to organize your finances.'
                                : 'Enter a new name for this profile.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleDialogSubmit} className="space-y-4">
                        <Input
                            placeholder="Profile name"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            autoFocus
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                {dialogMode === 'create' ? 'Create' : 'Rename'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
