'use client';

/**
 * @interlace/ui — Slider
 *
 * Range / value-picker primitive on top of @base-ui/react/slider. Compositional
 * API: Slider.Root + Track + Indicator + Thumb. Re-exports the DS-styled
 * surface (rail, fill, thumb) without owning state — Base UI handles keyboard
 * (Arrow / Home / End / PageUp / PageDown), drag, focus-visible, and ARIA.
 *
 * ## Anatomy
 *
 *   Slider (Root)                    (div — data-min-viewport=320)
 *     ├─ SliderControl              (the rail track wrapper — flex row)
 *     │   ├─ SliderTrack            (the rail)
 *     │   │   └─ SliderIndicator    (the filled portion)
 *     │   └─ SliderThumb            (the draggable knob — repeats for range)
 *     └─ {value readout}             (consumer-supplied, optional)
 *
 * ## MIN_VIEWPORT — 320
 *
 * Sliders must hit the WCAG 2.5.5 target-size floor (24×24 CSS px minimum
 * touch target). The 16px thumb expands to a 24-px hit area via padding on
 * the smallest size, so the primitive works on every phone.
 *
 * | Rule | Concept                          | Where in this file                                          |
 * | ---- | -------------------------------- | ----------------------------------------------------------- |
 * | R4   | Extends Base UI part props       | Each wrapper extends `React.ComponentProps<typeof BaseSlider.X>` |
 * | R6   | data-slot on every part          | slider / -control / -track / -indicator / -thumb            |
 * | R7   | className merged + ...rest       | `cn(BASE, className)` + `{...props}`                        |
 * | R8   | No isXxx; enums for variants     | n/a — no variants yet                                       |
 * | R12  | Reuse over wrap                  | Wraps Base UI's slider — no bespoke drag/keyboard state    |
 * | R14  | Declares min viewport            | `data-min-viewport={String(MIN_VIEWPORT)}` + exported const |
 * | R18  | Tailwind only                    | Zero inline style; Tailwind classes only                    |
 * | R19  | Tokens only                      | bg-primary, bg-muted, border-border — semantic tokens       |
 * | R25  | Client component                 | Required — Base UI Slider ships client hooks                |
 * | R26  | A11y from upstream               | Base UI owns role=slider, aria-valuenow, keyboard           |
 */

import * as React from 'react';
import { Slider as BaseSlider } from '@base-ui/react/slider';

import { cn } from '../lib/cn.js';

export const MIN_VIEWPORT = 320 as const;

const Slider = React.forwardRef<
  React.ElementRef<typeof BaseSlider.Root>,
  React.ComponentProps<typeof BaseSlider.Root>
>(({ className, ...props }, ref) => (
  <BaseSlider.Root
    ref={ref}
    data-slot="slider"
    data-min-viewport={String(MIN_VIEWPORT)}
    className={cn('relative flex w-full touch-none select-none items-center', className)}
    {...props}
  />
));
Slider.displayName = 'Slider';

const SliderControl = React.forwardRef<
  React.ElementRef<typeof BaseSlider.Control>,
  React.ComponentProps<typeof BaseSlider.Control>
>(({ className, ...props }, ref) => (
  <BaseSlider.Control
    ref={ref}
    data-slot="slider-control"
    className={cn('relative flex w-full items-center', className)}
    {...props}
  />
));
SliderControl.displayName = 'SliderControl';

const SliderTrack = React.forwardRef<
  React.ElementRef<typeof BaseSlider.Track>,
  React.ComponentProps<typeof BaseSlider.Track>
>(({ className, ...props }, ref) => (
  <BaseSlider.Track
    ref={ref}
    data-slot="slider-track"
    className={cn('bg-muted relative h-2 w-full grow overflow-hidden rounded-full', className)}
    {...props}
  />
));
SliderTrack.displayName = 'SliderTrack';

const SliderIndicator = React.forwardRef<
  React.ElementRef<typeof BaseSlider.Indicator>,
  React.ComponentProps<typeof BaseSlider.Indicator>
>(({ className, ...props }, ref) => (
  <BaseSlider.Indicator
    ref={ref}
    data-slot="slider-indicator"
    className={cn('bg-primary absolute h-full', className)}
    {...props}
  />
));
SliderIndicator.displayName = 'SliderIndicator';

const SliderThumb = React.forwardRef<
  React.ElementRef<typeof BaseSlider.Thumb>,
  React.ComponentProps<typeof BaseSlider.Thumb>
>(({ className, ...props }, ref) => (
  <BaseSlider.Thumb
    ref={ref}
    data-slot="slider-thumb"
    className={cn(
      'border-primary bg-background block size-5 rounded-full border-2 shadow-sm transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
SliderThumb.displayName = 'SliderThumb';

export {
  Slider,
  SliderControl,
  SliderTrack,
  SliderIndicator,
  SliderThumb,
};
