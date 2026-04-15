import type { Metadata } from 'next';
import SidebarLayout from '@/shared/components/layout/SidebarLayout';

// Default metadata for resources section
export const metadata: Metadata = {
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

interface ResourcesLayoutProps {
  children: React.ReactNode;
}

export default function ResourcesLayout({ children }: ResourcesLayoutProps) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
