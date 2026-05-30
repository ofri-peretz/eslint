// Grid + GridItem — the 2-D sibling of Stack. A thin, token-bound CSS-grid
// primitive (NOT a grid framework): <Grid> sets the column track + gap on the
// foundation --spacing scale; <GridItem> spans columns, responsively. Two FLAT
// components (never a kind:"container"|"item" union — R11). Server components
// (as-prop seam, like Section). See LAYOUT_PHILOSOPHY.md "Allowed primitives".

/**
 * @interlace/ui — Grid / GridItem
 *
 * | Rule | Concept                          | Where in this file                                  |
 * | ---- | -------------------------------- | --------------------------------------------------- |
 * | R1   | New primitive, not a Stack mode  | 2-D track + span are meaningless on a flex Stack    |
 * | R4   | Extends native el + VariantProps | `React.ComponentProps<'div'> & VariantProps<...>`   |
 * | R6   | data-slot on both parts          | `data-slot="grid"` / `"grid-item"`                  |
 * | R7   | className merged + ...rest + ref  | `cn(variants(...), className)` + `{...props}`       |
 * | R11  | Two flat components, no kind-prop | `Grid` + `GridItem`, not a discriminated union      |
 * | R18  | Tailwind only                    | zero inline style; static class maps (JIT-safe)     |
 * | R19  | Tokens only                      | gap→gap-{--spacing}; cols/span→closed unions (R21)  |
 * | R25  | Server component                 | no hooks → no 'use client'                          |
 *
 * API parity: MUI Grid v2 (container/item, columns, spacing, size). Deviations:
 * MUI's nested `size={{xs,md}}` object → discrete `span`/`mdSpan`/`lgSpan` props
 * for JSX ergonomics; MUI `component=` → `as`; spacing → Tailwind gap on the DS
 * scale (not theme.spacing() inline style). `cols`/`span` are closed unions, the
 * Grid analogue of Container's "four sizes only" (R21 — keeps every grid on-system).
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/cn.js';

const gridVariants = cva('grid', {
  variants: {
    /** Column track count. Closed set (R21). */
    cols: {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      6: 'grid-cols-6',
      12: 'grid-cols-12',
    },
    /** Gap from the foundation --spacing scale (8/16/24/40/64/96px). */
    gap: {
      none: 'gap-0',
      xs: 'gap-xs',
      sm: 'gap-sm',
      md: 'gap-md',
      lg: 'gap-lg',
      xl: 'gap-xl',
      '2xl': 'gap-2xl',
    },
  },
  defaultVariants: { cols: 12, gap: 'md' },
});

interface GridProps
  extends React.ComponentProps<'div'>, VariantProps<typeof gridVariants> {
  /** Render as a different element (e.g. `ul`, `section`). Default `div`. */
  as?: React.ElementType;
}

/** 2-D grid container. Server component (no hooks). */
function Grid({ className, cols, gap, as, ...props }: GridProps) {
  const Tag = (as ?? 'div') as React.ElementType;
  return (
    <Tag
      data-slot="grid"
      data-cols={cols ?? undefined}
      data-gap={gap ?? undefined}
      className={cn(gridVariants({ cols, gap }), className)}
      {...props}
    />
  );
}

// Static span maps — Tailwind can't scan runtime-built `col-span-${n}`.
const gridItemVariants = cva('', {
  variants: {
    /** Base column span. `full` = the whole track. */
    span: {
      1: 'col-span-1',
      2: 'col-span-2',
      3: 'col-span-3',
      4: 'col-span-4',
      5: 'col-span-5',
      6: 'col-span-6',
      7: 'col-span-7',
      8: 'col-span-8',
      9: 'col-span-9',
      10: 'col-span-10',
      11: 'col-span-11',
      12: 'col-span-12',
      full: 'col-span-full',
    },
    /** Span from the `md` breakpoint up. */
    mdSpan: {
      1: 'md:col-span-1',
      2: 'md:col-span-2',
      3: 'md:col-span-3',
      4: 'md:col-span-4',
      5: 'md:col-span-5',
      6: 'md:col-span-6',
      7: 'md:col-span-7',
      8: 'md:col-span-8',
      9: 'md:col-span-9',
      10: 'md:col-span-10',
      11: 'md:col-span-11',
      12: 'md:col-span-12',
      full: 'md:col-span-full',
    },
    /** Span from the `lg` breakpoint up. */
    lgSpan: {
      1: 'lg:col-span-1',
      2: 'lg:col-span-2',
      3: 'lg:col-span-3',
      4: 'lg:col-span-4',
      5: 'lg:col-span-5',
      6: 'lg:col-span-6',
      7: 'lg:col-span-7',
      8: 'lg:col-span-8',
      9: 'lg:col-span-9',
      10: 'lg:col-span-10',
      11: 'lg:col-span-11',
      12: 'lg:col-span-12',
      full: 'lg:col-span-full',
    },
  },
  defaultVariants: { span: 'full' },
});

interface GridItemProps
  extends React.ComponentProps<'div'>, VariantProps<typeof gridItemVariants> {
  /** Render as a different element (e.g. `li`, `article`). Default `div`. */
  as?: React.ElementType;
}

/** 2-D grid cell. Server component (no hooks). */
function GridItem({
  className,
  span,
  mdSpan,
  lgSpan,
  as,
  ...props
}: GridItemProps) {
  const Tag = (as ?? 'div') as React.ElementType;
  return (
    <Tag
      data-slot="grid-item"
      data-span={span ?? undefined}
      className={cn(gridItemVariants({ span, mdSpan, lgSpan }), className)}
      {...props}
    />
  );
}

export { Grid, GridItem, gridVariants, gridItemVariants };
export type { GridProps, GridItemProps };
