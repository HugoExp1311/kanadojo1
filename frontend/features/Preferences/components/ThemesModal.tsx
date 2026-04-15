'use client';

import { applyTheme } from '@/features/Preferences/data/themes';
import usePreferencesStore from '@/features/Preferences/store/usePreferencesStore';
import { useClick } from '@/shared/hooks/useAudio';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { memo, useCallback, useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';

interface ThemesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Local type definitions for lazy-loaded themes
interface Theme {
  id: string;
  backgroundColor: string;
  cardColor: string;
  borderColor: string;
  mainColor: string;
  secondaryColor: string;
}

interface ThemeGroup {
  name: string;
  icon: LucideIcon;
  themes: Theme[];
}

interface ThemeCardProps {
  theme: {
    id: string;
    backgroundColor: string;
    cardColor: string;
    borderColor: string;
    mainColor: string;
    secondaryColor: string;
  };
  isSelected: boolean;
  onClick: (id: string) => void;
}

const ThemeCard = memo(function ThemeCard({
  theme,
  isSelected,
  onClick,
}: ThemeCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const themeName = theme.id.replaceAll('-', ' ');

  return (
    <div
      className='cursor-pointer rounded-lg p-3'
      style={{
        backgroundColor: isHovered ? theme.cardColor : theme.backgroundColor,
        border: isSelected
          ? `1px solid ${theme.mainColor}`
          : `1px solid ${theme.borderColor}`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(theme.id)}
    >
      <div className='mb-2'>
        <span className='text-sm capitalize' style={{ color: theme.mainColor }}>
          {isSelected && '\u2B24 '}
          {themeName}
        </span>
      </div>
      <div className='flex gap-1.5'>
        <div
          className='h-4 w-4 rounded-full ring-1'
          style={
            {
              background: theme.backgroundColor,
              '--tw-ring-color': theme.borderColor,
            } as React.CSSProperties
          }
        />
        <div
          className='h-4 w-4 rounded-full ring-1'
          style={
            {
              background: theme.mainColor,
              '--tw-ring-color': theme.borderColor,
            } as React.CSSProperties
          }
        />
        <div
          className='h-4 w-4 rounded-full ring-1'
          style={
            {
              background: theme.secondaryColor,
              '--tw-ring-color': theme.borderColor,
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
});

export default function ThemesModal({ open, onOpenChange }: ThemesModalProps) {
  const { playClick } = useClick();
  const selectedTheme = usePreferencesStore(state => state.theme);
  const setSelectedTheme = usePreferencesStore(state => state.setTheme);

  // Lazy load themes
  const [themeSets, setThemeSets] = useState<ThemeGroup[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (open && !isLoaded) {
      import('@/features/Preferences/data/themes').then(module => {
        setThemeSets(module.default);
        setIsLoaded(true);
      });
    }
  }, [open, isLoaded]);

  const handleThemeClick = useCallback(
    (themeId: string) => {
      playClick();
      setSelectedTheme(themeId);
      applyTheme(themeId);
    },
    [playClick, setSelectedTheme],
  );

  const handleClose = useCallback(() => {
    playClick();
    onOpenChange(false);
  }, [playClick, onOpenChange]);

  if (!open) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal forceMount>
        <DialogPrimitive.Overlay className='fixed inset-0 z-50 bg-black/80' />
        <DialogPrimitive.Content
          className='fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[95vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col gap-0 rounded-2xl border-0 border-(--border-color) bg-(--background-color) p-0 sm:max-h-[80vh] sm:w-[90vw]'
          onOpenAutoFocus={e => e.preventDefault()}
        >
          <div className='sticky top-0 z-10 flex flex-row items-center justify-between rounded-t-2xl border-b border-(--border-color) bg-(--background-color) px-6 pt-6 pb-4'>
            <DialogPrimitive.Title className='text-2xl font-semibold text-(--main-color)'>
              Themes
            </DialogPrimitive.Title>
            <button
              onClick={handleClose}
              className='shrink-0 rounded-xl p-2 hover:cursor-pointer hover:bg-(--card-color)'
            >
              <X size={24} className='text-(--secondary-color)' />
            </button>
          </div>
          <div id='modal-scroll' className='flex-1 overflow-y-auto px-6 py-6'>
            <div className='space-y-6'>
              {themeSets.map(group => {
                const Icon = group.icon;
                return (
                  <div key={group.name} className='space-y-3'>
                    <div className='flex items-center gap-2 text-lg font-medium text-(--main-color)'>
                      <Icon size={20} />
                      {group.name}
                      <span className='text-sm font-normal text-(--secondary-color)'>
                        ({group.themes.length})
                      </span>
                    </div>
                    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4'>
                      {group.themes.map(theme => (
                        <ThemeCard
                          key={theme.id}
                          theme={theme}
                          isSelected={selectedTheme === theme.id}
                          onClick={handleThemeClick}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
