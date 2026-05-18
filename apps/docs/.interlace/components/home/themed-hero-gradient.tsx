/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
'use client';

/**
 * Theme-aware hero gradient — wraps `<BackgroundGradientAnimation>` (Aceternity)
 * with light/dark color sets and a matching `useHeroTextStyles()` hook so
 * landing-page text always meets WCAG AA contrast against the live gradient.
 *
 * Brand defaults follow the line-wide Interlace palette (hue 263°). Override
 * `darkColors` / `lightColors` per-site for product-specific accents — but
 * keep the overall purple family so cross-product visits still feel familiar.
 *
 * Tailwind utilities + CSS variables only — no inline color styles in the
 * children's text. Use `useHeroTextStyles()` to get the right Tailwind class
 * for the current theme.
 *
 * Peer deps required in the consuming app:
 *   - `next-themes` (already a transitive of `fumadocs-ui`)
 *   - `@base-ui/react` (not used here directly, listed for the wider baseline)
 */

import { useTheme } from 'next-themes';
import { useEffect, useState, type ReactNode } from 'react';
import { BackgroundGradientAnimation } from '#interlace/components/ui/background-gradient-animation';

export interface HeroGradientColors {
  gradientBackgroundStart: string;
  gradientBackgroundEnd: string;
  firstColor: string;
  secondColor: string;
  thirdColor: string;
  fourthColor: string;
  fifthColor: string;
  pointerColor: string;
}

/**
 * Every visible text/control element in a `<ThemedHeroGradient>` gets a
 * theme-adaptive class so contrast tracks the active gradient. Hardcoding
 * `text-white` (the previous bug) renders the badge/CTA invisible against the
 * light-mode gradient — never use raw `text-white` inside the hero; always
 * pick the matching slot from `useHeroTextStyles()`.
 */
export interface HeroTextStyleSet {
  /** Top-level title — the largest, most contrast-critical element. */
  headline: string;
  /** Gradient run inside the headline (e.g. `<FlipWords>`). */
  headlineGradient: string;
  /** Tagline / subhead — smaller body text below the headline. */
  subheadline: string;
  /** Inline emphasized snippet within the subheadline. */
  subheadlineAccent: string;
  /** Above-the-fold context badge ("A family of TypeScript-native developer tools"). */
  badge: string;
  /** Border + background for the badge container. */
  badgeContainer: string;
  /** Primary CTA (filled button) — full surface + label classes. */
  ctaPrimary: string;
  /** Secondary CTA (outlined / ghost button) — full surface + label classes. */
  ctaSecondary: string;
  /** Any muted helper text rendered inside the hero (e.g. install command, footnote). */
  muted: string;
}

const DEFAULT_DARK_COLORS: HeroGradientColors = {
  gradientBackgroundStart: 'rgb(88, 28, 135)',
  gradientBackgroundEnd: 'rgb(30, 27, 75)',
  firstColor: '139, 92, 246',
  secondColor: '168, 85, 247',
  thirdColor: '192, 132, 252',
  fourthColor: '124, 58, 237',
  fifthColor: '147, 51, 234',
  pointerColor: '192, 132, 252',
};

const DEFAULT_LIGHT_COLORS: HeroGradientColors = {
  gradientBackgroundStart: 'rgb(243, 232, 255)',
  gradientBackgroundEnd: 'rgb(233, 213, 255)',
  firstColor: '139, 92, 246',
  secondColor: '124, 58, 237',
  thirdColor: '109, 40, 217',
  fourthColor: '91, 33, 182',
  fifthColor: '107, 33, 168',
  pointerColor: '139, 92, 246',
};

const DEFAULT_TEXT_STYLES: { dark: HeroTextStyleSet; light: HeroTextStyleSet } = {
  // Dark gradient (purple-900 → indigo-950): white-family text passes 4.5:1.
  dark: {
    headline: 'text-white',
    headlineGradient:
      'bg-gradient-to-r from-purple-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent',
    subheadline: 'text-purple-100',
    subheadlineAccent: 'text-white font-semibold',
    badge: 'text-white',
    badgeContainer: 'border-white/30 bg-white/15 backdrop-blur-sm',
    ctaPrimary:
      'bg-white text-purple-950 hover:bg-purple-50 shadow-lg hover:shadow-xl',
    ctaSecondary:
      'border border-white/40 bg-white/15 text-white backdrop-blur-sm hover:bg-white/25',
    muted: 'text-purple-100/80',
  },
  // Light gradient (purple-100 → violet-200): MUST use deep purple-950/800
  // family text — `text-white` here is invisible (4.5:1 fails by miles).
  light: {
    headline: 'text-purple-950',
    headlineGradient:
      'bg-gradient-to-r from-purple-700 via-violet-700 to-fuchsia-700 bg-clip-text text-transparent',
    subheadline: 'text-purple-900',
    subheadlineAccent: 'text-purple-950 font-semibold',
    badge: 'text-purple-950',
    badgeContainer: 'border-purple-800/30 bg-white/60 backdrop-blur-sm',
    // purple-700 + white text is ~4.0:1 (AA-fail). purple-900 hits ~7:1.
    ctaPrimary:
      'bg-purple-900 text-white hover:bg-purple-950 shadow-lg hover:shadow-xl',
    ctaSecondary:
      'border border-purple-800/40 bg-white/70 text-purple-950 backdrop-blur-sm hover:bg-white/90',
    muted: 'text-purple-900/80',
  },
};

export interface ThemedHeroGradientProps {
  children: ReactNode;
  className?: string;
  darkColors?: HeroGradientColors;
  lightColors?: HeroGradientColors;
  /** Pointer interactivity. Default true (cursor influences the gradient). */
  interactive?: boolean;
  /** Container size pass-through. Default `80%`. */
  size?: string;
  /** SSR fallback theme. Default `dark` (matches the production hero feel). */
  ssrDefault?: 'dark' | 'light';
}

/**
 * Read the current theme synchronously from `<html class="dark">` (the
 * convention used by `next-themes`, `@storybook/addon-themes`, and any other
 * Tailwind dark-mode setup). Falls back to the `ssrDefault` during SSR (no
 * window) to avoid hydration mismatch.
 */
function readDomTheme(ssrDefault: 'dark' | 'light'): 'dark' | 'light' {
  if (typeof document === 'undefined') return ssrDefault;
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function ThemedHeroGradient({
  children,
  className,
  darkColors = DEFAULT_DARK_COLORS,
  lightColors = DEFAULT_LIGHT_COLORS,
  interactive = true,
  size = '80%',
  ssrDefault = 'dark',
}: ThemedHeroGradientProps) {
  const { resolvedTheme } = useTheme();
  // `useState` initializer reads the DOM once on first render so the very
  // first paint matches the active theme — fixes axe-core color-contrast
  // checks that capture markup before `useEffect` runs.
  const [theme, setTheme] = useState<'dark' | 'light'>(() => readDomTheme(ssrDefault));

  useEffect(() => {
    if (resolvedTheme === 'dark' || resolvedTheme === 'light') {
      setTheme(resolvedTheme);
      return;
    }
    setTheme(readDomTheme(ssrDefault));
  }, [resolvedTheme, ssrDefault]);

  const palette = theme === 'dark' ? darkColors : lightColors;

  return (
    <BackgroundGradientAnimation
      gradientBackgroundStart={palette.gradientBackgroundStart}
      gradientBackgroundEnd={palette.gradientBackgroundEnd}
      firstColor={palette.firstColor}
      secondColor={palette.secondColor}
      thirdColor={palette.thirdColor}
      fourthColor={palette.fourthColor}
      fifthColor={palette.fifthColor}
      pointerColor={palette.pointerColor}
      size={size}
      blendingValue="hard-light"
      interactive={interactive}
      containerClassName={`!h-auto min-h-screen ${className || ''}`}
    >
      {children}
    </BackgroundGradientAnimation>
  );
}

/**
 * Theme-aware text classes for hero copy. Use these on text rendered
 * inside `<ThemedHeroGradient>` so contrast tracks the active gradient.
 *
 * Override the defaults by passing your own `dark` / `light` style sets.
 */
export function useHeroTextStyles(overrides?: {
  dark?: Partial<HeroTextStyleSet>;
  light?: Partial<HeroTextStyleSet>;
  ssrDefault?: 'dark' | 'light';
}): HeroTextStyleSet {
  const { resolvedTheme } = useTheme();
  const ssrDefault = overrides?.ssrDefault ?? 'dark';
  // Same DOM-class read as ThemedHeroGradient so the very first render
  // (before any effect) returns classes matching the active theme.
  const [theme, setTheme] = useState<'dark' | 'light'>(() => readDomTheme(ssrDefault));

  useEffect(() => {
    if (resolvedTheme === 'dark' || resolvedTheme === 'light') {
      setTheme(resolvedTheme);
      return;
    }
    setTheme(readDomTheme(ssrDefault));
  }, [resolvedTheme, ssrDefault]);

  const isDark = theme === 'dark';
  const base = isDark ? DEFAULT_TEXT_STYLES.dark : DEFAULT_TEXT_STYLES.light;
  const overlay = isDark ? overrides?.dark : overrides?.light;

  return { ...base, ...overlay };
}

export const heroDefaultColors = {
  dark: DEFAULT_DARK_COLORS,
  light: DEFAULT_LIGHT_COLORS,
};

export const heroDefaultTextStyles = DEFAULT_TEXT_STYLES;
