/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
"use client";

import { cn } from "#interlace/lib/utils";
import { useReducedMotion } from "#interlace/lib/use-reduced-motion";

interface SunnyBackgroundProps {
  className?: string;
  /** When false, render the no-motion static frame. Defaults to honoring `prefers-reduced-motion`. */
  animate?: boolean;
}

/**
 * Daylight / sunny background — animated radial sun glow + warm gradient field.
 * Built as a layered gradient (no particle physics) so it's cheap on the GPU
 * and SSR-safe. Honors `prefers-reduced-motion` by freezing the gradient
 * position.
 */
export function SunnyBackground({
  className,
  animate,
}: SunnyBackgroundProps) {
  const reduced = useReducedMotion();
  const shouldAnimate = animate ?? !reduced;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-amber-50/60 via-sky-50/40 to-sky-100/30 dark:from-amber-950/30 dark:via-slate-950/40 dark:to-slate-900/30" />
      <div
        className={cn(
          "absolute -top-32 left-1/2 -translate-x-1/2 h-[60vmin] w-[60vmin] rounded-full bg-gradient-radial from-amber-200/70 via-amber-200/30 to-transparent blur-3xl dark:from-amber-300/30 dark:via-amber-400/15",
          shouldAnimate && "animate-sunny-pulse",
        )}
      />
    </div>
  );
}
