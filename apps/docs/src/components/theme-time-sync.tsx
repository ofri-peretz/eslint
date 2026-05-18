'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

// Records the user's explicit theme toggle so the inline time-based script in
// <head> can stop overriding it on subsequent loads. The first observed theme
// value belongs to the inline script (auto or already-stored pick) — only
// changes after that count as a user action.
export function ThemeTimeSync() {
  const { theme } = useTheme();
  const initialised = useRef(false);

  useEffect(() => {
    if (theme === undefined) return;
    if (!initialised.current) {
      initialised.current = true;
      return;
    }
    if (theme === 'light' || theme === 'dark') {
      try {
        localStorage.setItem('theme-user-pick', theme);
      } catch {}
    }
  }, [theme]);

  return null;
}
