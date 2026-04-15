'use client';

import SidebarLayout from '@/shared/components/layout/SidebarLayout';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
