// Box — the lowest-altitude layout primitive: surface + box-model on one
// element. Mirrors MUI <Box> (polymorphic unopinionated wrapper) minus the `sx`
// CSS-in-JS prop — Interlace uses a curated, tokenized cva variant set instead,
// so it can't reopen the magic-number problem LAYOUT_PHILOSOPHY closes.
// `<Card>` composes `<Box>` (not the reverse); reach for <Section>/<Container>
// for page rhythm. Server component (as-prop seam, like Section). See
// LAYOUT_PHILOSOPHY.md "Allowed primitives".

/**
 * @interlace/ui — Box
 *
 * | Rule | Concept                          | Where in this file                                   |
 * | ---- | -------------------------------- | ---------------------------------------------------- |
 * | R4   | Extends native el + VariantProps | `React.ComponentProps<'div'> & VariantProps<...>`    |
 * | R6   | data-slot                        | `data-slot="box"` + data-surface                     |
 * | R7   | className merged + ...rest + ref  | `cn(boxVariants(...), className)` + `{...props}`     |
 * | R8   | boolean default-false, no isXxx  | `border` boolean variant; surface/padding/radius enums |
 * | R18  | Tailwind only                    | zero inline style                                    |
 * | R19  | Tokens only                      | surface→bg-card/muted/accent; padding→p-{--spacing}; radius→rounded-{sm,md,lg} (foundation) |
 * | R20  | AA contrast                      | every surface ships its paired `text-*-foreground`   |
 * | R25  | Server component                 | no hooks → no 'use client'                           |
 *
 * API parity: MUI `component=` → `as`; MUI `sx` (CSS-in-JS) → tokenized cva +
 * className (no runtime). No open-ended system props (`mt`/`px`/`bgcolor`).
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/cn.js';

const boxVariants = cva('', {
  variants: {
    /** Background + paired foreground (AA token pairs). */
    surface: {
      none: '',
      card: 'bg-card text-card-foreground',
      muted: 'bg-muted text-muted-foreground',
      accent: 'bg-accent text-accent-foreground',
    },
    /** Padding from the foundation --spacing scale (8/16/24/40/64px). */
    padding: {
      none: '',
      xs: 'p-xs',
      sm: 'p-sm',
      md: 'p-md',
      lg: 'p-lg',
      xl: 'p-xl',
    },
    /** Corner radius from the foundation 3-step scale (8/12/16px). */
    radius: {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
    },
    /** 1px token border. */
    border: {
      true: 'border border-border',
      false: '',
    },
  },
  defaultVariants: {
    surface: 'none',
    padding: 'none',
    radius: 'none',
    border: false,
  },
});

interface BoxProps
  extends React.ComponentProps<'div'>, VariantProps<typeof boxVariants> {
  /** Render as a different element (e.g. `section`, `article`, `ul`). Default `div`. */
  as?: React.ElementType;
}

/** Surface + box-model wrapper. Server component (no hooks). */
function Box({
  className,
  surface,
  padding,
  radius,
  border,
  as,
  ...props
}: BoxProps) {
  const Tag = (as ?? 'div') as React.ElementType;
  return (
    <Tag
      data-slot="box"
      data-surface={surface ?? undefined}
      className={cn(
        boxVariants({ surface, padding, radius, border }),
        className,
      )}
      {...props}
    />
  );
}

export { Box, boxVariants };
export type { BoxProps };
