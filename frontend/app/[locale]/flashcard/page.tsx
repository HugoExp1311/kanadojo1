import React from 'react';
import { LessonList } from '@/features/Lessons/components/LessonList';
import SidebarLayout from '@/shared/components/layout/SidebarLayout';

export default function LessonDashboardPage() {
    return (
        <SidebarLayout>
            <LessonList />
        </SidebarLayout>
    );
}
