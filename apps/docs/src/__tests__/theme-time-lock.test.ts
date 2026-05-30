/**
 * Theme-Time Behavior Lock Tests
 *
 * Locks the time-of-day default-theme contract:
 *   06:00–17:59 local → light
 *   18:00–05:59 local → dark
 *
 * Plus the integration points (inline <head> script + ThemeTimeSync component
 * mounted in root layout) that make the contract observable without FOUC.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getTimeBasedTheme, THEME_TIME_INLINE_SCRIPT } from '@/lib/theme-time';

describe('getTimeBasedTheme: hour boundary contract', () => {
  const at = (hour: number, minute = 0) =>
    new Date(2026, 4, 17, hour, minute);

  it('05:59 → dark (last minute of night)', () => {
    expect(getTimeBasedTheme(at(5, 59))).toBe('dark');
  });

  it('06:00 → light (first minute of day)', () => {
    expect(getTimeBasedTheme(at(6, 0))).toBe('light');
  });

  it('12:00 → light (noon)', () => {
    expect(getTimeBasedTheme(at(12))).toBe('light');
  });

  it('17:59 → light (last minute of day)', () => {
    expect(getTimeBasedTheme(at(17, 59))).toBe('light');
  });

  it('18:00 → dark (first minute of night)', () => {
    expect(getTimeBasedTheme(at(18, 0))).toBe('dark');
  });

  it('23:59 → dark (just before midnight)', () => {
    expect(getTimeBasedTheme(at(23, 59))).toBe('dark');
  });

  it('00:00 → dark (midnight)', () => {
    expect(getTimeBasedTheme(at(0, 0))).toBe('dark');
  });
});

describe('THEME_TIME_INLINE_SCRIPT: structural contract', () => {
  it('uses the 06:00 / 18:00 boundary', () => {
    expect(THEME_TIME_INLINE_SCRIPT).toContain('hour >= 6 && hour < 18');
  });

  it('reads the explicit user-pick key', () => {
    expect(THEME_TIME_INLINE_SCRIPT).toContain("'theme-user-pick'");
  });

  it('writes the next-themes storage key', () => {
    expect(THEME_TIME_INLINE_SCRIPT).toContain("setItem('theme'");
  });

  it('applies the resolved class to <html>', () => {
    expect(THEME_TIME_INLINE_SCRIPT).toContain('classList.add(theme)');
  });

  it('clears any pre-existing light/dark class to avoid double-mode', () => {
    expect(THEME_TIME_INLINE_SCRIPT).toContain("classList.remove('light','dark')");
  });

  it('sets color-scheme for native form controls / scrollbars', () => {
    expect(THEME_TIME_INLINE_SCRIPT).toContain('colorScheme');
  });

  it('is wrapped in try/catch (private mode / blocked storage)', () => {
    expect(THEME_TIME_INLINE_SCRIPT).toContain('try');
    expect(THEME_TIME_INLINE_SCRIPT).toContain('catch');
  });
});

describe('THEME_TIME_INLINE_SCRIPT: executable behaviour', () => {
  function run(hour: number, pick?: 'light' | 'dark') {
    const store: Record<string, string> = {};
    if (pick) store['theme-user-pick'] = pick;
    const ls = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    };
    const fakeDate = function () {
      return { getHours: () => hour };
    } as unknown as DateConstructor;

    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';

    new Function('localStorage', 'Date', 'document', THEME_TIME_INLINE_SCRIPT)(
      ls,
      fakeDate,
      document
    );

    return {
      cls: document.documentElement.className,
      colorScheme: document.documentElement.style.colorScheme,
      stored: store['theme'],
    };
  }

  it('08:00 with no user pick → light, persisted to next-themes key', () => {
    const { cls, colorScheme, stored } = run(8);
    expect(cls).toContain('light');
    expect(colorScheme).toBe('light');
    expect(stored).toBe('light');
  });

  it('20:00 with no user pick → dark, persisted to next-themes key', () => {
    const { cls, colorScheme, stored } = run(20);
    expect(cls).toContain('dark');
    expect(colorScheme).toBe('dark');
    expect(stored).toBe('dark');
  });

  it('22:00 with user-pick=light → light (override wins over time)', () => {
    const { cls, stored } = run(22, 'light');
    expect(cls).toContain('light');
    expect(stored).toBe('light');
  });

  it('10:00 with user-pick=dark → dark (override wins over time)', () => {
    const { cls, stored } = run(10, 'dark');
    expect(cls).toContain('dark');
    expect(stored).toBe('dark');
  });
});

describe('layout.tsx: time-based theme integration', () => {
  const layout = readFileSync(
    join(process.cwd(), 'src/app/layout.tsx'),
    'utf-8'
  );

  it('imports the inline script source', () => {
    expect(layout).toContain("from '@/lib/theme-time'");
    expect(layout).toContain('THEME_TIME_INLINE_SCRIPT');
  });

  it('embeds the inline script in <head> via dangerouslySetInnerHTML', () => {
    expect(layout).toContain('dangerouslySetInnerHTML');
    expect(layout).toMatch(
      /dangerouslySetInnerHTML=\{\{\s*__html:\s*THEME_TIME_INLINE_SCRIPT\s*\}\}/
    );
  });

  it('mounts <ThemeTimeSync /> inside <RootProvider>', () => {
    expect(layout).toContain("from '@/components/theme-time-sync'");
    expect(layout).toContain('<ThemeTimeSync />');
  });
});
