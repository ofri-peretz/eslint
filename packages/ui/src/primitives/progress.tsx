'use client';

/**
 * @interlace/ui — Progress
 *
 * Determinate progress indicator. Wraps the Base UI `Progress` compound — Root,
 * Track, Indicator, Label, Value — and re-exports DS-styled parts that consume
 * theme tokens (no raw px, no hex). The Track defines the rail height (`size`);
 * the Indicator carries the filled tone (`tone`). Width animation is
 * disabled when `prefers-reduced-motion: reduce` is set — per the MOTION
 * philosophy, a CSS `transition-[width]` would otherwise animate from 0 → value
 * on every render, including for users who opted out.
 *
 * ## Anatomy
 *
 *   <Progress value={62}>                  ← BaseProgress.Root, data-min-viewport
 *     <ProgressLabel>Uploading</ProgressLabel>
 *     <ProgressValue />                    ← "62%"
 *     <ProgressTrack size="md">            ← rail
 *       <ProgressIndicator tone="default" /> ← filled portion
 *     </ProgressTrack>
 *   </Progress>
 *
 * ## MIN_VIEWPORT — 320
 *
 * Progress bars are linear; the rail scales to whatever width the parent
 * offers, down to a 320 CSS-px iPhone SE column. The smallest size (`sm`,
 * h-1 = 4px) clears visibility at that width and reduced-motion is on by
 * default for OS-level "reduce motion" users (DESIGN_PRINCIPLES #14).
 *
 * | Rule | Concept                          | Where in this file                                          |
 * | ---- | -------------------------------- | ----------------------------------------------------------- |
 * | R4   | Extends Base UI part + VariantProps | `ComponentProps<typeof BaseProgress.Track> & VariantProps<...>` |
 * | R6   | data-slot on every part          | `data-slot="progress" / "-track" / "-indicator" / "-label" / "-value"` |
 * | R7   | className merged + ...rest       | `cn(progressXVariants(...), className)` + `{...props}` on every part |
 * | R8   | No `isXxx`; enums for >2 states  | `size` (sm/md/lg) / `tone` (default/success/warning/danger) |
 * | R11  | One variable per part            | Track owns `size`; Indicator owns `tone` — orthogonal axes  |
 * | R13  | Ecosystem first                  | `@base-ui/react/progress` owns ARIA, value math, indeterminate |
 * | R14  | Declares min viewport            | `data-min-viewport={String(MIN_VIEWPORT)}` + exported const |
 * | R17  | API parity                       | Mirrors Base UI Progress part names (Root/Track/Indicator/Label/Value) |
 * | R18  | Tailwind only                    | Zero inline `style`; cva classes only                       |
 * | R19  | Tokens only                      | h-1/2/3 = 4/8/12px on Tailwind's spacing scale; tones from `--color-*` |
 * | R20  | AA contrast                      | Track on `bg-secondary`; Indicator on `bg-primary/success/warning/destructive` |
 * | R25  | Client component                 | useReducedMotion → matchMedia hook → 'use client' required  |
 * | R26  | A11y from Base UI part           | BaseProgress.Root owns role="progressbar" + aria-value*     |
 *
 * Out of scope: this primitive does NOT ship the `<XCircle />` "error" leading
 * icon or the "complete" check — those belong one level up in a composed
 * `ProgressCard` block. The indicator transition is also intentionally simple
 * (width-only) so it composes inside any parent layout without bleeding motion.
 */

import * as React from 'react';
import { Progress as BaseProgress } from '@base-ui/react/progress';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/cn.js';
import { useReducedMotion } from '../lib/use-reduced-motion.js';

/**
 * Minimum viable viewport (CSS px) for this primitive. Below it, the
 * preflight contract draws a dev-mode outline; in prod the rail still renders.
 */
export const MIN_VIEWPORT = 320 as const;

// ─────────────────────────────────────────────────────────────────
// Progress (root) — BaseProgress.Root + data-min-viewport
// ─────────────────────────────────────────────────────────────────
type ProgressProps = React.ComponentProps<typeof BaseProgress.Root>;

const Progress = React.forwardRef<
  React.ElementRef<typeof BaseProgress.Root>,
  ProgressProps
>(function Progress({ className, ...props }, ref) {
  return (
    <BaseProgress.Root
      ref={ref}
      data-slot="progress"
      data-min-viewport={String(MIN_VIEWPORT)}
      className={cn('w-full', className)}
      {...props}
    />
  );
});
Progress.displayName = 'Progress';

// ─────────────────────────────────────────────────────────────────
// ProgressTrack — the rail. `size` controls height (4/8/12px).
// ─────────────────────────────────────────────────────────────────
const progressTrackVariants = cva(
  // Base — surface, radius, clipping for the indicator fill.
  'relative w-full overflow-hidden rounded-full bg-secondary',
  {
    variants: {
      /**
       * Rail height. Maps to Tailwind's 4px spacing step:
       *   sm = h-1 (4px), md = h-2 (8px), lg = h-3 (12px).
       * No raw [px] values; sizes live on the canonical spacing scale.
       */
      size: {
        sm: 'h-1',
        md: 'h-2',
        lg: 'h-3',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

type ProgressTrackProps = React.ComponentProps<typeof BaseProgress.Track> &
  VariantProps<typeof progressTrackVariants>;

const ProgressTrack = React.forwardRef<
  React.ElementRef<typeof BaseProgress.Track>,
  ProgressTrackProps
>(function ProgressTrack({ className, size, ...props }, ref) {
  return (
    <BaseProgress.Track
      ref={ref}
      data-slot="progress-track"
      data-size={size ?? undefined}
      className={cn(progressTrackVariants({ size }), className)}
      {...props}
    />
  );
});
ProgressTrack.displayName = 'ProgressTrack';

// ─────────────────────────────────────────────────────────────────
// ProgressIndicator — filled portion. `tone` controls the bar color.
// Width is driven by BaseProgress.Indicator (sets `style.width`); we
// only animate the transition (and gate it on reduced-motion).
// ─────────────────────────────────────────────────────────────────
const progressIndicatorVariants = cva(
  // Base — absolute fill, inherits track radius. NO transition here:
  // it's appended conditionally in JSX so reduced-motion users skip it.
  'h-full w-full flex-1 rounded-full',
  {
    variants: {
      /**
       * Semantic tone. Maps to the DS color tokens. `danger` is the public
       * spelling; under the hood it maps to `bg-destructive` (shadcn canon).
       */
      tone: {
        default: 'bg-primary',
        success: 'bg-success',
        warning: 'bg-warning',
        danger: 'bg-destructive',
      },
    },
    defaultVariants: { tone: 'default' },
  },
);

type ProgressIndicatorProps = React.ComponentProps<
  typeof BaseProgress.Indicator
> &
  VariantProps<typeof progressIndicatorVariants>;

const ProgressIndicator = React.forwardRef<
  React.ElementRef<typeof BaseProgress.Indicator>,
  ProgressIndicatorProps
>(function ProgressIndicator({ className, tone, ...props }, ref) {
  const reduceMotion = useReducedMotion();
  return (
    <BaseProgress.Indicator
      ref={ref}
      data-slot="progress-indicator"
      data-tone={tone ?? undefined}
      className={cn(
        progressIndicatorVariants({ tone }),
        // Width-only transition. Omitted entirely when the user has
        // prefers-reduced-motion: reduce — no easing, no duration.
        reduceMotion ? undefined : 'transition-[width] duration-200 ease-out',
        className,
      )}
      {...props}
    />
  );
});
ProgressIndicator.displayName = 'ProgressIndicator';

// ─────────────────────────────────────────────────────────────────
// ProgressLabel — accessible label associated with the progressbar.
// ─────────────────────────────────────────────────────────────────
type ProgressLabelProps = React.ComponentProps<typeof BaseProgress.Label>;

const ProgressLabel = React.forwardRef<
  React.ElementRef<typeof BaseProgress.Label>,
  ProgressLabelProps
>(function ProgressLabel({ className, ...props }, ref) {
  return (
    <BaseProgress.Label
      ref={ref}
      data-slot="progress-label"
      className={cn('text-ui-sm font-medium text-foreground', className)}
      {...props}
    />
  );
});
ProgressLabel.displayName = 'ProgressLabel';

// ─────────────────────────────────────────────────────────────────
// ProgressValue — current value rendered as text (e.g. "62%").
// ─────────────────────────────────────────────────────────────────
type ProgressValueProps = React.ComponentProps<typeof BaseProgress.Value>;

const ProgressValue = React.forwardRef<
  React.ElementRef<typeof BaseProgress.Value>,
  ProgressValueProps
>(function ProgressValue({ className, ...props }, ref) {
  return (
    <BaseProgress.Value
      ref={ref}
      data-slot="progress-value"
      className={cn('text-ui-sm tabular-nums text-muted-foreground', className)}
      {...props}
    />
  );
});
ProgressValue.displayName = 'ProgressValue';

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
  progressTrackVariants,
  progressIndicatorVariants,
};
export type {
  ProgressProps,
  ProgressTrackProps,
  ProgressIndicatorProps,
  ProgressLabelProps,
  ProgressValueProps,
};
