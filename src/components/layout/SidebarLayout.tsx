// ============================================================================
// SIDEBAR LAYOUT COMPONENT
// ============================================================================
// Layout wrapper providing sidebar context and page routing.
// ============================================================================

import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar, type PageId } from './AppSidebar';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface SidebarLayoutProps {
    activePage: PageId;
    onNavigate: (page: PageId) => void;
    children: (activePage: PageId) => React.ReactNode;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function SidebarLayout({ activePage, onNavigate, children }: SidebarLayoutProps) {
    return (
        <SidebarProvider>
            <AppSidebar activePage={activePage} onNavigate={onNavigate} />
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
