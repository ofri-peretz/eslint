import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/cn.js';

/**
 * `<SectionHeader>` — the "text-center mb-12 + h2 + tagline" pattern from
 * LAYOUT_PHILOSOPHY.md §1, lifted into a single primitive.
 *
 * Owns:
 *   - Bottom margin (tied to spacing token, default `xl`).
 *   - Alignment (`center` default; `start` for content-heavy sections).
 *   - The h2/tagline typography rhythm.
 *   - The tagline's prose width (`max-w-prose` — never per-instance).
 *
 * Replaces the per-page duplication called out in HOMEPAGE_LAYOUT_AUDIT.md:
 * six near-identical "text-center mb-12 / h2 / tagline" blocks → one
 * import.
 */

const sectionHeaderVariants = cva('', {
  variants: {
    align: {
      center: 'text-center [&_p]:mx-auto',
      start: 'text-left',
    },
    spacing: {
      md: 'mb-12',
      lg: 'mb-16',
    },
  },
  defaultVariants: {
    align: 'center',
    spacing: 'lg',
  },
});

interface SectionHeaderProps
  extends Omit<React.ComponentProps<'div'>, 'title'>,
    VariantProps<typeof sectionHeaderVariants> {
  /** Small label above the title (e.g. a section number, chip, or eyebrow tag). */
  eyebrow?: React.ReactNode;
  /** The h2 heading. */
  title: React.ReactNode;
  /** Optional subhead paragraph. */
  tagline?: React.ReactNode;
  /** Heading level. Defaults to h2 (page-level h1 lives in the hero). */
  as?: 'h1' | 'h2' | 'h3';
}

function SectionHeader({
  className,
  eyebrow,
  title,
  tagline,
  align,
  spacing,
  as: Heading = 'h2',
  ...props
}: SectionHeaderProps) {
  return (
    <div
      data-slot="section-header"
      data-align={align ?? undefined}
      className={cn(sectionHeaderVariants({ align, spacing }), className)}
      {...props}
    >
      {eyebrow ? (
        <div className="mb-4 flex items-center justify-center">{eyebrow}</div>
      ) : null}
      <Heading className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
        {title}
      </Heading>
      {tagline ? (
        <p className="text-fd-muted-foreground max-w-prose text-base md:text-lg">
          {tagline}
        </p>
      ) : null}
    </div>
  );
}

export { SectionHeader, sectionHeaderVariants };
export type { SectionHeaderProps };
