import { BudgetDashboard } from '@/components/budget';
import { SidebarLayout, type PageId } from '@/components/layout';
import { AccountsPage, LoginPage, OverviewPage, SettingsPage, TrackingPage } from '@/components/pages';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

export function App() {
    const { isAuthenticated, isLoading } = useAuth();
    const [activePage, setActivePage] = useState<PageId>('overview');

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-slate-600 dark:text-slate-400">Loading...</div>
            </div>
        );
    }

    // Show login page if not authenticated
    if (!isAuthenticated) {
        return <LoginPage />;
    }

    // Show main app if authenticated
    return (
        <SidebarLayout activePage={activePage} onNavigate={setActivePage}>
            {(page) => renderPage(page, setActivePage)}
        </SidebarLayout>
    );
}

function renderPage(page: PageId, onNavigate: (page: PageId) => void) {
    switch (page) {
        case 'budget':
            return <BudgetDashboard />;
        case 'overview':
            return <OverviewPage onNavigate={onNavigate} />;
        case 'accounts':
            return <AccountsPage />;
        case 'tracking':
            return <TrackingPage onNavigate={onNavigate} />;
        case 'settings':
            return <SettingsPage />;
        default:
            return <BudgetDashboard />;
    }
}

export default App;
