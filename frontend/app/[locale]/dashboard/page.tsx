import React from 'react';
import SidebarLayout from '@/shared/components/layout/SidebarLayout';
import DashboardView from '@/features/Dashboard/components/DashboardView';

export default function DashboardPage() {
    return (
        <SidebarLayout>
            <DashboardView />
        </SidebarLayout>
    );
}
