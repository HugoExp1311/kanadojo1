'use client';
import clsx from 'clsx';
import Sidebar from '@/shared/components/Menu/Sidebar';
import Banner from '@/shared/components/Menu/Banner';
import { useState } from 'react';
import { Palette } from 'lucide-react';
import { ThemesModal } from '@/features/Preferences';

interface SidebarLayoutProps {
  children: React.ReactNode;
  showBanner?: boolean;
  className?: string;
}

/**
 * Shared layout component for pages that need the sidebar.
 * Provides consistent structure across the app.
 */
const SidebarLayout = ({
  children,
  showBanner = true,
  className,
}: SidebarLayoutProps) => {
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  return (
    <div className='flex min-h-[100dvh] max-w-[100dvw] gap-4 lg:pr-20'>
      <Sidebar />
      <div
        className={clsx(
          'flex flex-col gap-4',
          'w-full px-4 md:px-8 lg:w-4/5 lg:px-0',
          'pt-16 lg:pt-0 pb-20',
          className,
        )}
      >
        <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[var(--background-color)]/80 backdrop-blur-md border-b border-[var(--border-color)] z-[40] flex items-center justify-between px-4">
          <h1 className='flex items-center gap-1.5 text-lg font-bold'>
            <span>KanaDojo</span>
            <span className='font-normal text-[var(--secondary-color)] text-xs'>かな道場️</span>
          </h1>
          <button 
            onClick={() => setIsThemeOpen(true)}
            className="p-2 text-[var(--secondary-color)] hover:text-[var(--main-color)] bg-[var(--card-color)] rounded-lg border border-[var(--border-color)] active:scale-95 transition-all outline-none"
            aria-label="Change Theme"
          >
            <Palette size={20} />
          </button>
        </div>
        <ThemesModal open={isThemeOpen} onOpenChange={setIsThemeOpen} />
        {showBanner && <Banner />}
        {children}
      </div>
    </div>
  );
};

export default SidebarLayout;
