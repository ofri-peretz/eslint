'use client';

/**
 * @interlace/ui — Meteors (decorative animation primitive)
 *
 * Aceternity-style falling-meteor effect with per-meteor variety: viewport-
 * distributed origins (some above the fold), trail lengths randomized
 * between 50–140px, opacities 0.45–1.0, durations 3–9s. The variety is the
 * difference between "meteors" and "looks like a CSS animation" — a flat
 * shower of identical streaks reads as synthetic; uneven trails read as a
 * real night sky.
 *
 * | Rule | Concept                          | Where in this file                                                          |
 * | ---- | -------------------------------- | --------------------------------------------------------------------------- |
 * | R4   | Extends native el                | `React.HTMLAttributes<HTMLDivElement>`                                      |
 * | R5   | data-slot on the root           | `data-slot="meteors"` on the wrapper                                        |
 * | R7   | className merged + ...rest      | `cn(...)` + `{...rest}`                                                     |
 * | R9   | Honors `prefers-reduced-motion` | Inline `useReducedMotion()` returns null when reduce is requested           |
 * | R18  | Tailwind only                   | Inline `style` is per-meteor randomized values only (top/left/duration/etc) |
 * | R19  | Tokens                          | Head rim consumes `--color-meteor-glow`. Rod uses slate-300/dark:slate-200. |
 * | R26  | a11y                            | `aria-hidden` + `pointer-events-none` — decorative, not announced           |
 *
 * Out of scope: this primitive does not own a `data-testid` default (R6) —
 * consumers supply one. Theming for the head rim ships via this registry
 * item's `cssVars` block; rod color is a Tailwind utility that resolves
 * against the consumer's neutral palette without extra wiring.
 */

import { useEffect, useState } from 'react';

import { cn } from '../lib/cn.js';

interface MeteorsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Total number of meteors to render. Higher = denser shower. */
  number?: number;
  /** Stable selector for E2E tests; consumer provides — no default. */
  'data-testid'?: string;
}

interface MeteorMeta {
  /** Vertical origin as a viewport percentage. Some start above the fold (-15vh)
   * so they fall into the hero naturally instead of all popping in at top:0. */
  top: string;
  /** Horizontal origin spread across the full viewport. */
  left: string;
  /** Per-meteor animation duration. */
  animationDuration: string;
  /** Stagger so the shower doesn't pulse in synchronized waves. */
  animationDelay: string;
  /** Trail length in pixels — picked once per meteor so the shower has variety. */
  trail: number;
  /** Tail opacity (0.45–1.0) — makes the field feel deep instead of flat. */
  opacity: number;
}

const TRAIL_MIN_PX = 50;
const TRAIL_MAX_PX = 140;
const DURATION_MIN_S = 3;
const DURATION_MAX_S = 9;
const OPACITY_MIN = 0.45;
const OPACITY_MAX = 1.0;
const DELAY_MAX_S = 4;
const TOP_MIN_VH = -15;
const TOP_MAX_VH = 55;

const rand = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function Meteors({
  number = 22,
  className,
  'data-testid': testId,
  ...rest
}: MeteorsProps) {
  const reduced = useReducedMotion();
  const [meteors, setMeteors] = useState<MeteorMeta[]>([]);

  useEffect(() => {
    if (reduced) return;
    // Positions are randomized client-side once per mount to avoid a
    // hydration mismatch. The state is intentionally never updated again.
    setMeteors(
      Array.from({ length: number }, () => ({
        top: `${rand(TOP_MIN_VH, TOP_MAX_VH).toFixed(2)}vh`,
        left: `${rand(0, 100).toFixed(2)}vw`,
        animationDuration: `${rand(DURATION_MIN_S, DURATION_MAX_S).toFixed(2)}s`,
        animationDelay: `${rand(0, DELAY_MAX_S).toFixed(2)}s`,
        trail: Math.round(rand(TRAIL_MIN_PX, TRAIL_MAX_PX)),
        opacity: Number(rand(OPACITY_MIN, OPACITY_MAX).toFixed(2)),
      })),
    );
    // The flagged names (length/top/left/animationDuration/animationDelay/
    // trail/opacity) are object-literal property keys inside the generated
    // MeteorMeta above, not free-variable references, and `rand` is a
    // module-level stable function — none of them are real reactive
    // dependencies.
    // eslint-disable-next-line react-features/hooks-exhaustive-deps
  }, [number, reduced]);

  if (reduced) return null;

  return (
    <div
      data-slot="meteors"
      data-testid={testId}
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className,
      )}
      {...rest}
    >
      {/* The array is fully regenerated (never spliced/reordered) on every
          `number`/`reduced` change, and meteors carry no natural id — the
          position itself is a stable key for this list's lifetime. */}
      {meteors.map((m, meteorIndex) => (
        <span
          key={meteorIndex}
          className={cn(
            'pointer-events-none absolute rotate-[215deg] animate-meteor rounded-full bg-slate-300 dark:bg-slate-200',
            'shadow-[0_0_2px_1px_var(--color-meteor-glow)]',
            'h-[1px] w-[1px]',
            'before:absolute before:top-1/2 before:left-0 before:h-px before:w-[var(--trail)] before:-translate-y-1/2',
            'before:bg-linear-to-r before:from-slate-300 before:via-slate-300/70 before:to-transparent',
            'dark:before:from-slate-200 dark:before:via-slate-200/80',
            "before:content-['']",
          )}
          style={
            {
              top: m.top,
              left: m.left,
              animationDuration: m.animationDuration,
              animationDelay: m.animationDelay,
              opacity: m.opacity,
              ['--trail' as string]: `${m.trail}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export { Meteors };
export type { MeteorsProps };
