// Typography — the single text primitive for the whole type scale.
// Mirrors MUI <Typography> (variant + polymorphic element), adapted to the
// Interlace floor: cva over the foundation --text-* tokens (no inline style),
// the server-safe `as`-prop seam (like Section — NOT useRender, so it stays a
// server component), semantic `tone` colors. See TYPOGRAPHY_PHILOSOPHY.md.

/**
 * @interlace/ui — Typography
 *
 * One component renders every row of the type scale (h1–h6, body, long-form,
 * UI, caption, code) through a single `variant`, plus an orthogonal semantic
 * `tone`. The reading-vs-UI distinction (TYPOGRAPHY_PHILOSOPHY "Reading mode vs
 * UI mode") is encoded in the variant set, not a second axis (R11: one
 * variable). Sizes/leading come from the bridged `--text-*` tokens in
 * foundation.css; weights use the built-in 400/500/600/700 ladder (no 900).
 *
 * | Rule | Concept                          | Where in this file                                   |
 * | ---- | -------------------------------- | ---------------------------------------------------- |
 * | R4   | Extends native el + VariantProps | `React.ComponentProps<'p'> & VariantProps<...>`      |
 * | R6   | data-slot on the part            | `data-slot="typography"` + data-variant/data-tone    |
 * | R7   | className merged + ...rest + ref  | `cn(typographyVariants(...), clamp, className)` + `{...props}` |
 * | R8   | No `isXxx`; enum if >2            | variant/tone/align are enums                         |
 * | R11  | One variable (size), ReactNode    | `children: ReactNode`; one truncation contract (lineClamp) |
 * | R18  | Tailwind only                    | zero inline style; classes from cva + static clamp map |
 * | R19  | Tokens only                      | text-h1/text-body… from foundation --text-*; no raw px |
 * | R20  | AA contrast                      | tone maps to AA-cleared semantic text tokens         |
 * | R25  | Server component                 | no hooks → no 'use client' (as-prop seam, like Section) |
 *
 * API parity: MUI `component=` → our `as`; MUI `color=` palette → semantic
 * `tone` (never raw pigment). `variant`'s natural element (h1→<h1>, body→<p>)
 * is a NON-SEMANTIC default — control the document outline with `as` (e.g. a
 * visual h2 that must be an <h3> for outline correctness: `variant="h2" as="h3"`).
 * Default body weight is 400 (per the token), intentionally MUI-body1-like.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/cn.js';

const typographyVariants = cva('', {
  variants: {
    variant: {
      h1: 'font-body text-h1 font-bold tracking-display text-balance',
      h2: 'font-body text-h2 font-bold tracking-heading text-balance',
      h3: 'font-body text-h3 font-semibold tracking-heading',
      h4: 'font-body text-h4 font-semibold',
      h5: 'font-body text-h5 font-semibold',
      h6: 'font-body text-h6 font-semibold',
      body: 'font-body text-body font-normal',
      long: 'font-body text-long font-normal',
      ui: 'font-body text-ui font-normal',
      'ui-sm': 'font-body text-ui-sm font-normal',
      caption: 'font-body text-caption font-normal',
      code: 'font-mono text-code',
    },
    tone: {
      default: '',
      foreground: 'text-foreground',
      muted: 'text-muted-foreground',
      primary: 'text-primary',
      destructive: 'text-destructive',
    },
    align: {
      start: 'text-left',
      center: 'text-center',
      end: 'text-right',
    },
  },
  defaultVariants: { variant: 'body', tone: 'default' },
});

type TypographyVariant = NonNullable<
  VariantProps<typeof typographyVariants>['variant']
>;

/** Natural element per variant — a NON-SEMANTIC default; override with `as`. */
const VARIANT_TAG: Record<TypographyVariant, React.ElementType> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  body: 'p',
  long: 'p',
  ui: 'span',
  'ui-sm': 'span',
  caption: 'span',
  code: 'code',
};

/** Static clamp map — Tailwind can't see runtime-built `line-clamp-${n}`. */
const CLAMP_CLASSES: Record<number, string> = {
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  5: 'line-clamp-5',
  6: 'line-clamp-6',
};

interface TypographyProps
  extends
    Omit<React.ComponentProps<'p'>, 'color'>,
    VariantProps<typeof typographyVariants> {
  /**
   * Override the rendered element. Defaults to the variant's natural tag
   * (h1→`h1`, body→`p`, code→`code`). Use this to keep the document outline
   * correct when the visual level differs from the semantic level.
   */
  as?: React.ElementType;
  /** Clamp to N lines with an ellipsis (single truncation contract). @default none */
  lineClamp?: 1 | 2 | 3 | 4 | 5 | 6;
  children?: React.ReactNode;
}

/**
 * Render scale-aware text. Server component (no hooks).
 */
function Typography({
  className,
  variant,
  tone,
  align,
  as,
  lineClamp,
  children,
  ...props
}: TypographyProps) {
  const resolvedVariant: TypographyVariant = variant ?? 'body';
  const Tag = (as ?? VARIANT_TAG[resolvedVariant]) as React.ElementType;
  return (
    <Tag
      data-slot="typography"
      data-variant={resolvedVariant}
      data-tone={tone ?? undefined}
      className={cn(
        typographyVariants({ variant, tone, align }),
        lineClamp ? CLAMP_CLASSES[lineClamp] : undefined,
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export { Typography, typographyVariants };
export type { TypographyProps };
