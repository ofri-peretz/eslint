import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/cn.js';
import { Container, type ContainerProps } from './container.js';

/**
 * `<Section>` — vertical rhythm + tone + dividers + container, from
 * LAYOUT_PHILOSOPHY.md §7-8.
 *
 * A page composes `<Section>` × N. The page file describes what's *in* each
 * section, never what each section's wrapper looks like. Open-coded
 * `<section className="container mx-auto px-4 py-24">` is forbidden in app
 * code (philosophy §1, §7).
 *
 * Props own:
 *   - `spacing`  → vertical padding (token from the §3 spacing scale).
 *   - `tone`     → background. `inset` adds the muted card-like tone.
 *   - `divider`  → top/bottom borders at section transitions.
 *   - `container`→ which `<Container>` size wraps the children.
 *   - `as`       → semantic element (`section`, `header`, `aside`, ...).
 */

const sectionVariants = cva('relative', {
  variants: {
    spacing: {
      // LAYOUT_PHILOSOPHY §3/§5: mobile section vertical floor = `py-10`
      // (lg token); desktop section vertical floor = `py-16` (xl token).
      // Every spacing variant must clear those floors at the matching
      // breakpoint, or it ships a section that visually looks "padless".
      tight: 'py-12 md:py-16 lg:py-20',
      comfortable: 'py-16 md:py-20 lg:py-24',
      spacious: 'py-20 md:py-24 lg:py-32',
      none: '',
    },
    tone: {
      default: '',
      muted: 'bg-fd-card/30',
      inset: 'bg-fd-card/50 backdrop-blur-sm',
    },
    divider: {
      none: '',
      top: 'border-t border-fd-border',
      bottom: 'border-b border-fd-border',
      both: 'border-y border-fd-border',
    },
  },
  defaultVariants: {
    spacing: 'comfortable',
    tone: 'default',
    divider: 'none',
  },
});

interface SectionProps
  extends Omit<React.ComponentProps<'section'>, 'children'>,
    VariantProps<typeof sectionVariants> {
  /** Container size that wraps the section's children. Defaults to `content`. */
  container?: ContainerProps['size'];
  /** Render as a different element (e.g. `header`, `footer`). Default `section`. */
  as?: 'section' | 'header' | 'footer' | 'aside' | 'div';
  children?: React.ReactNode;
}

function Section({
  className,
  spacing,
  tone,
  divider,
  container = 'content',
  as = 'section',
  children,
  ...props
}: SectionProps) {
  const Tag = as as React.ElementType;
  return (
    <Tag
      data-slot="section"
      data-spacing={spacing ?? undefined}
      data-tone={tone ?? undefined}
      data-divider={divider ?? undefined}
      className={cn(sectionVariants({ spacing, tone, divider }), className)}
      {...props}
    >
      <Container size={container}>{children}</Container>
    </Tag>
  );
}

export { Section, sectionVariants };
export type { SectionProps };
