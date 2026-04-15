'use client';

import { useMemo } from 'react';
import usePreferencesStore from '../store/usePreferencesStore';

export interface ThemePreferences {
  theme: string;
  setTheme: (theme: string) => void;
  font: string;
  setFont: (fontName: string) => void;
  themePreview: boolean;
  setThemePreview: (enabled: boolean) => void;
  displayKana: boolean;
  setDisplayKana: (displayKana: boolean) => void;
  furiganaEnabled: boolean;
  setFuriganaEnabled: (enabled: boolean) => void;
}

/**
 * Theme Preferences Facade
 *
 * Provides access to theme and display preferences
 */
export function useThemePreferences(): ThemePreferences {
  const theme = usePreferencesStore(state => state.theme);
  const setTheme = usePreferencesStore(state => state.setTheme);
  const font = usePreferencesStore(state => state.font);
  const setFont = usePreferencesStore(state => state.setFont);
  const themePreview = usePreferencesStore(state => state.themePreview);
  const setThemePreview = usePreferencesStore(state => state.setThemePreview);
  const displayKana = usePreferencesStore(state => state.displayKana);
  const setDisplayKana = usePreferencesStore(state => state.setDisplayKana);
  const furiganaEnabled = usePreferencesStore(state => state.furiganaEnabled);
  const setFuriganaEnabled = usePreferencesStore(
    state => state.setFuriganaEnabled,
  );

  return useMemo<ThemePreferences>(
    () => ({
      theme,
      setTheme,
      font,
      setFont,
      themePreview,
      setThemePreview,
      displayKana,
      setDisplayKana,
      furiganaEnabled,
      setFuriganaEnabled,
    }),
    [
      theme,
      setTheme,
      font,
      setFont,
      themePreview,
      setThemePreview,
      displayKana,
      setDisplayKana,
      furiganaEnabled,
      setFuriganaEnabled,
    ],
  );
}
