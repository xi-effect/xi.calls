import { useState, useEffect } from 'react';

import { ThemeContext } from './context';

import type { FC, PropsWithChildren } from 'react';
import type { ThemeT, ThemeItemT } from './types';

const DEFAULT_THEME: ThemeT = 'light';
const ALL_THEMES: ThemeItemT[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
];

export const ThemeProvider: FC<PropsWithChildren> = ({ children }) => {
  // Get theme from localStorage or use default
  const getInitialTheme = (): ThemeT => {
    if (typeof window === 'undefined') return DEFAULT_THEME;
    const stored = localStorage.getItem('theme') as ThemeT | null;
    return stored && ['light', 'dark', 'system'].includes(stored) ? stored : DEFAULT_THEME;
  };

  const [theme, setThemeState] = useState<ThemeT>(getInitialTheme());

  const applyTheme = (newTheme: ThemeT) => {
    const root = document.documentElement;

    ALL_THEMES.forEach((t) => {
      root.classList.remove(t.value);
    });

    root.classList.add(newTheme);
    root.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    applyTheme(theme);
    // Save theme to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeT) => {
    setThemeState(newTheme);
    // Note: If you need to save theme to backend, add your API call here
    // Example:
    // try {
    //   await updateProfile({ theme: newTheme });
    // } catch (error) {
    //   console.error('Error updating theme:', error);
    // }
  };

  const value = {
    theme,
    setTheme,
    themes: ALL_THEMES,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
