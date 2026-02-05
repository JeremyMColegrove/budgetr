import { BudgetDashboard } from '@/components/budget';
import { SidebarLayout, type PageId } from '@/components/layout';
import { AccountsPage, LoginPage, SettingsPage } from '@/components/pages';
import { useAuth } from '@/hooks/useAuth';

function renderPage(page: PageId) {
    switch (page) {
        case 'budget':
            return <BudgetDashboard />;
        case 'accounts':
            return <AccountsPage />;
        case 'settings':
            return <SettingsPage />;
        default:
            return <BudgetDashboard />;
    }
}

export function App() {
    const { isAuthenticated, isLoading } = useAuth();

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
        <SidebarLayout>
            {(activePage) => renderPage(activePage)}
        </SidebarLayout>
    );
}

export default App;