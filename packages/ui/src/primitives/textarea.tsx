/**
 * @interlace/ui — Textarea
 *
 * Multi-line text input. A pure surface primitive with no controlled-state
 * machinery: the native `<textarea>` already owns selection, IME, undo/redo,
 * `onChange` etc., so we add structure (size + tone) without wrapping a
 * single native behaviour. Server component — no hooks, no Base UI client
 * surface required. Inherits the DS font from `preflight.css` (rule #3).
 *
 * ## Anatomy
 *
 *   <textarea data-slot="textarea" data-min-viewport="320">
 *     <!-- user content -->
 *   </textarea>
 *
 * ## MIN_VIEWPORT — 320
 *
 * Form controls are the LAST thing that may degrade on a narrow screen; a
 * sign-in / contact / search form must work on a 320 CSS-px iPhone SE. The
 * `sm` size at min-h 64px clears the WCAG 2.5.5 target-size floor on that
 * viewport (TARGET_SIZE_AA in DESIGN_PRINCIPLES #11).
 *
 * | Rule | Concept                          | Where in this file                                          |
 * | ---- | -------------------------------- | ----------------------------------------------------------- |
 * | R4   | Extends native el + VariantProps | `React.ComponentProps<'textarea'> & VariantProps<...>`      |
 * | R6   | data-slot on the part            | `data-slot="textarea"` + data-size / data-tone              |
 * | R7   | className merged + ...rest       | `cn(textareaVariants(...), className)` + `{...props}`       |
 * | R8   | No `isXxx`; enums for >2 states  | `size` / `tone` / `resize` are enums                        |
 * | R9   | Native onChange stays native     | `onChange` / `onFocus` etc. pass through `{...props}`       |
 * | R14  | Declares min viewport            | `data-min-viewport={String(MIN_VIEWPORT)}` + exported const |
 * | R18  | Tailwind only                    | zero inline `style`; cva classes only                       |
 * | R19  | Tokens only                      | padding from `--spacing-*`, size from `--text-*`, radius `--radius-md`, colors via semantic tokens |
 * | R20  | AA contrast                      | `border-input` / `aria-invalid:border-destructive`, placeholder uses `--muted-foreground` (preflight) |
 * | R25  | Server component                 | no hooks → no `'use client'`                                |
 * | R26  | A11y from native el              | `<textarea>` owns focus, keyboard, ARIA, label association  |
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/cn.js';

/**
 * Minimum viable viewport (CSS px) for this primitive. Below it, the
 * preflight contract draws a dev-mode outline; in prod the component still
 * renders. Exported so consumers / tests can read it.
 */
export const MIN_VIEWPORT = 320 as const;

const textareaVariants = cva(
  // Base — surface, border, radius, focus + invalid rings, disabled.
  [
    'block w-full min-w-0 border border-input bg-transparent',
    'rounded-md shadow-xs outline-none transition-[color,box-shadow]',
    'placeholder:text-muted-foreground',
    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
    'dark:bg-input/30',
  ].join(' '),
  {
    variants: {
      /**
       * Padding + type-scale density. min-h is grounded in the
       * `--spacing-xl` scale (xl=64px, 2xl=96px; lg doubles xl via calc
       * to stay token-anchored — no raw px literal).
       */
      size: {
        sm: 'px-sm py-xs text-ui-sm min-h-xl',
        md: 'px-sm py-xs text-ui min-h-2xl',
        lg: 'px-md py-sm text-body min-h-[calc(var(--spacing-xl)*2)]',
      },
      /** Border tone. `invalid` is an explicit prop AND a fallback for `aria-invalid`. */
      tone: {
        default: '',
        invalid: 'border-destructive',
      },
      /** Resize affordance. Vertical-only by default; opt out for fixed-height fields. */
      resize: {
        y: 'resize-y',
        none: 'resize-none',
      },
    },
    defaultVariants: {
      size: 'md',
      tone: 'default',
      resize: 'y',
    },
  },
);

interface TextareaProps
  extends Omit<React.ComponentProps<'textarea'>, 'size'>,
    VariantProps<typeof textareaVariants> {}

/** Multi-line text input. Server component (no hooks). */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, size, tone, resize, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        data-min-viewport={String(MIN_VIEWPORT)}
        data-size={size ?? undefined}
        data-tone={tone ?? undefined}
        className={cn(textareaVariants({ size, tone, resize }), className)}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea, textareaVariants };
export type { TextareaProps };
