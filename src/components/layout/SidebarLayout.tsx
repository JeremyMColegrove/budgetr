// ============================================================================
// SIDEBAR LAYOUT COMPONENT
// ============================================================================
// Layout wrapper providing sidebar context and page routing.
// ============================================================================

import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useState } from 'react';
import { AppSidebar, type PageId } from './AppSidebar';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface SidebarLayoutProps {
    children: (activePage: PageId) => React.ReactNode;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function SidebarLayout({ children }: SidebarLayoutProps) {
    const [activePage, setActivePage] = useState<PageId>('budget');

    return (
        <SidebarProvider>
            <AppSidebar activePage={activePage} onNavigate={setActivePage} />
            <SidebarInset>
                <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 px-4 print:hidden">
                    <SidebarTrigger className="-ml-2" />
                </header>
                <main className="flex-1">
                    {children(activePage)}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
