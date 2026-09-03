import * as React from 'react';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/cn.js';

/**
 * `<Stack>` / `<Cluster>` — gap rhythm from LAYOUT_PHILOSOPHY.md §3.
 *
 * `Stack` lays children out vertically; `Cluster` lays them out
 * horizontally with wrap. Both pull their gap token from the six-step
 * scale:
 *
 * Gap maps to the foundation `--spacing-*` tokens (DS-owned, not Tailwind's
 * default scale — R19), shared with `<Grid>` so the two stay rhythm-consistent:
 *
 *   | token  | px  | class      | use                          |
 *   | ------ | --- | ---------- | ---------------------------- |
 *   | `xs`   |  8  | `gap-xs`   | Inline chips                 |
 *   | `sm`   | 16  | `gap-sm`   | Cards, mobile padding        |
 *   | `md`   | 24  | `gap-md`   | Card-grid gaps, header→grid  |
 *   | `lg`   | 40  | `gap-lg`   | Mobile section gaps          |
 *   | `xl`   | 64  | `gap-xl`   | Desktop section gaps         |
 *   | `2xl`  | 96  | `gap-2xl`  | Hero / CTA breathing room    |
 */

const stackVariants = cva('flex', {
  variants: {
    direction: {
      vertical: 'flex-col',
      horizontal: 'flex-row flex-wrap',
    },
    gap: {
      xs: 'gap-xs',
      sm: 'gap-sm',
      md: 'gap-md',
      lg: 'gap-lg',
      xl: 'gap-xl',
      '2xl': 'gap-2xl',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
    },
  },
  defaultVariants: {
    direction: 'vertical',
    gap: 'md',
  },
});

type StackProps = React.ComponentProps<'div'> &
  Omit<VariantProps<typeof stackVariants>, 'direction'> & {
    direction?: 'vertical' | 'horizontal';
    render?: useRender.RenderProp;
  };

function Stack({
  className,
  direction = 'vertical',
  gap,
  align,
  justify,
  render,
  ...props
}: StackProps) {
  const element = useRender({
    render: render ?? <div />,
    props: {
      'data-slot': 'stack',
      'data-direction': direction,
      'data-gap': gap ?? undefined,
      'data-align': align ?? undefined,
      'data-justify': justify ?? undefined,
      className: cn(
        stackVariants({ direction, gap, align, justify }),
        className,
      ),
      ...props,
    },
  });

  return element;
}

/**
 * `<Cluster>` — horizontal Stack with wrap. Sugar for tag rows, chip rows,
 * button rows. Use Stack with `direction="horizontal"` if you need more
 * control.
 */
function Cluster({
  className,
  gap = 'sm',
  align = 'center',
  ...props
}: Omit<StackProps, 'direction'>) {
  return (
    <Stack
      direction="horizontal"
      gap={gap}
      align={align}
      className={className}
      data-slot="cluster"
      {...props}
    />
  );
}

export { Stack, Cluster, stackVariants };
export type { StackProps };
