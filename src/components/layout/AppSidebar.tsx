// ============================================================================
// APP SIDEBAR COMPONENT
// ============================================================================
// Main navigation sidebar for the Budget Blueprint application.
// ============================================================================

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Database, LayoutDashboard, Settings, Wallet } from 'lucide-react';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type PageId = 'budget' | 'accounts' | 'data' | 'settings';

interface NavItem {
    id: PageId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

interface AppSidebarProps {
    activePage: PageId;
    onNavigate: (page: PageId) => void;
}

// ----------------------------------------------------------------------------
// Navigation Configuration
// ----------------------------------------------------------------------------

const NAV_ITEMS: NavItem[] = [
    { id: 'budget', label: 'Budget', icon: LayoutDashboard },
    { id: 'accounts', label: 'Accounts', icon: Wallet },
    { id: 'data', label: 'Data Management', icon: Database },
    { id: 'settings', label: 'Settings', icon: Settings },
];

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function AppSidebar({ activePage, onNavigate }: AppSidebarProps) {
    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="size-6 rounded-md bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xs">
                        B
                    </div>
                    <span className="font-semibold text-sm group-data-[collapsible=icon]:hidden">
                        Budget Blueprint
                    </span>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {NAV_ITEMS.map((item) => (
                                <SidebarMenuItem key={item.id}>
                                    <SidebarMenuButton
                                        isActive={activePage === item.id}
                                        onClick={() => onNavigate(item.id)}
                                        tooltip={item.label}
                                    >
                                        <item.icon className="size-4" />
                                        <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t px-4 py-2">
                <p className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                    v1.0.0
                </p>
            </SidebarFooter>
        </Sidebar>
    );
}
