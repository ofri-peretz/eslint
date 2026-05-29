'use client';

/**
 * @interlace/ui — NumberField
 *
 * A numeric input with increment/decrement controls and built-in scrubbing.
 * Wraps @base-ui/react/number-field. Re-exports the compositional parts
 * (Root, Group, Increment, Input, Decrement, ScrubArea) under DS-styled
 * wrappers without owning state.
 *
 * ## Anatomy
 *
 *   NumberField (Root)               (div — data-min-viewport=320)
 *     ├─ NumberFieldScrubArea       (optional drag-to-scrub region)
 *     └─ NumberFieldGroup            (the visible button group)
 *         ├─ NumberFieldDecrement   (minus button)
 *         ├─ NumberFieldInput        (the actual number input)
 *         └─ NumberFieldIncrement    (plus button)
 *
 * ## MIN_VIEWPORT — 320
 *
 * Same target-size floor as Slider/Toggle — the increment/decrement buttons
 * sit at the 32-px size minimum. Native keyboard (Up/Down arrows) inherited
 * from Base UI.
 *
 * | Rule | Concept                          | Where in this file                                          |
 * | ---- | -------------------------------- | ----------------------------------------------------------- |
 * | R4   | Extends Base UI part props       | each wrapper extends `React.ComponentProps<typeof BaseNF.X>` |
 * | R6   | data-slot per part               | number-field / -group / -input / -increment / -decrement    |
 * | R7   | cn + ...rest                     | `cn(BASE, className)` + `{...props}`                        |
 * | R12  | Reuse over wrap                  | Base UI owns scrub + keyboard + clamping                    |
 * | R14  | Declares min viewport            | `data-min-viewport={String(MIN_VIEWPORT)}` + exported const |
 * | R19  | Tokens only                      | border-input, bg-background, ring-ring — semantic tokens    |
 * | R25  | Client component                 | Required — Base UI NumberField ships client hooks           |
 * | R26  | A11y from upstream               | aria-valuenow, aria-valuemin, aria-valuemax handled         |
 */

import * as React from 'react';
import { NumberField as BaseNumberField } from '@base-ui/react/number-field';

import { cn } from '../lib/cn.js';

export const MIN_VIEWPORT = 320 as const;

const NumberField = React.forwardRef<
  React.ElementRef<typeof BaseNumberField.Root>,
  React.ComponentProps<typeof BaseNumberField.Root>
>(({ className, ...props }, ref) => (
  <BaseNumberField.Root
    ref={ref}
    data-slot="number-field"
    data-min-viewport={String(MIN_VIEWPORT)}
    className={cn('inline-flex items-stretch', className)}
    {...props}
  />
));
NumberField.displayName = 'NumberField';

const NumberFieldGroup = React.forwardRef<
  React.ElementRef<typeof BaseNumberField.Group>,
  React.ComponentProps<typeof BaseNumberField.Group>
>(({ className, ...props }, ref) => (
  <BaseNumberField.Group
    ref={ref}
    data-slot="number-field-group"
    className={cn(
      'border-input bg-background flex items-stretch overflow-hidden rounded-md border shadow-sm',
      'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
      className,
    )}
    {...props}
  />
));
NumberFieldGroup.displayName = 'NumberFieldGroup';

const NumberFieldInput = React.forwardRef<
  React.ElementRef<typeof BaseNumberField.Input>,
  React.ComponentProps<typeof BaseNumberField.Input>
>(({ className, ...props }, ref) => (
  <BaseNumberField.Input
    ref={ref}
    data-slot="number-field-input"
    className={cn(
      'h-9 w-20 bg-transparent px-3 text-center text-sm tabular-nums',
      'focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
NumberFieldInput.displayName = 'NumberFieldInput';

const NumberFieldIncrement = React.forwardRef<
  React.ElementRef<typeof BaseNumberField.Increment>,
  React.ComponentProps<typeof BaseNumberField.Increment>
>(({ className, ...props }, ref) => (
  <BaseNumberField.Increment
    ref={ref}
    data-slot="number-field-increment"
    className={cn(
      'border-input hover:bg-muted active:bg-accent flex w-9 cursor-pointer items-center justify-center border-l text-sm transition-colors',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
NumberFieldIncrement.displayName = 'NumberFieldIncrement';

const NumberFieldDecrement = React.forwardRef<
  React.ElementRef<typeof BaseNumberField.Decrement>,
  React.ComponentProps<typeof BaseNumberField.Decrement>
>(({ className, ...props }, ref) => (
  <BaseNumberField.Decrement
    ref={ref}
    data-slot="number-field-decrement"
    className={cn(
      'border-input hover:bg-muted active:bg-accent flex w-9 cursor-pointer items-center justify-center border-r text-sm transition-colors',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
NumberFieldDecrement.displayName = 'NumberFieldDecrement';

const NumberFieldScrubArea = React.forwardRef<
  React.ElementRef<typeof BaseNumberField.ScrubArea>,
  React.ComponentProps<typeof BaseNumberField.ScrubArea>
>(({ className, ...props }, ref) => (
  <BaseNumberField.ScrubArea
    ref={ref}
    data-slot="number-field-scrub-area"
    className={cn('cursor-ew-resize', className)}
    {...props}
  />
));
NumberFieldScrubArea.displayName = 'NumberFieldScrubArea';

export {
  NumberField,
  NumberFieldGroup,
  NumberFieldInput,
  NumberFieldIncrement,
  NumberFieldDecrement,
  NumberFieldScrubArea,
};
