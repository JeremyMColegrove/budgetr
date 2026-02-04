import { BudgetDashboard, DataManagement } from '@/components/budget';
import { SidebarLayout, type PageId } from '@/components/layout';
import { AccountsPage, SettingsPage } from '@/components/pages';

function renderPage(page: PageId) {
    switch (page) {
        case 'budget':
            return <BudgetDashboard />;
        case 'accounts':
            return <AccountsPage />;
        case 'data':
            return <DataManagement />;
        case 'settings':
            return <SettingsPage />;
        default:
            return <BudgetDashboard />;
    }
}

export function App() {
    return (
        <SidebarLayout>
            {(activePage) => renderPage(activePage)}
        </SidebarLayout>
    );
}

export default App;