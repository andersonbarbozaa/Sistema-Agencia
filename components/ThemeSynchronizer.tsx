'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export type AppTheme = 'light' | 'dark' | 'system';

export function applyAppTheme(theme?: AppTheme | string | null) {
  if (typeof window === 'undefined') return;
  try {
    const activeTheme = (theme || localStorage.getItem('agency_app_theme') || 'system') as AppTheme;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = activeTheme === 'dark' || (activeTheme === 'system' && systemPrefersDark);

    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
    }
  } catch (e) {
    // Ignore storage errors
  }
}

export default function ThemeSynchronizer() {
  const pathname = usePathname();

  // Re-apply whenever route changes to guarantee class is preserved across navigations
  useEffect(() => {
    applyAppTheme();
  }, [pathname]);

  useEffect(() => {
    applyAppTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = () => {
      try {
        const saved = localStorage.getItem('agency_app_theme') || 'system';
        if (saved === 'system') {
          applyAppTheme('system');
        }
      } catch (e) {}
    };

    const handleStorageOrCustomThemeChange = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt?.detail?.theme) {
        applyAppTheme(customEvt.detail.theme);
      } else {
        applyAppTheme();
      }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else if (typeof (mediaQuery as any).addListener === 'function') {
      (mediaQuery as any).addListener(handleSystemThemeChange);
    }

    window.addEventListener('storage', handleStorageOrCustomThemeChange);
    window.addEventListener('theme-changed', handleStorageOrCustomThemeChange);

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else if (typeof (mediaQuery as any).removeListener === 'function') {
        (mediaQuery as any).removeListener(handleSystemThemeChange);
      }
      window.removeEventListener('storage', handleStorageOrCustomThemeChange);
      window.removeEventListener('theme-changed', handleStorageOrCustomThemeChange);
    };
  }, []);

  return null;
}
