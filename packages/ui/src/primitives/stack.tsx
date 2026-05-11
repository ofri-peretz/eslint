import * as React from 'react';
import { useRender } from '@base-ui-components/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/cn.js';

/**
 * `<Stack>` / `<Cluster>` — gap rhythm from LAYOUT_PHILOSOPHY.md §3.
 *
 * `Stack` lays children out vertically; `Cluster` lays them out
 * horizontally with wrap. Both pull their gap token from the six-step
 * scale:
 *
 *   | token  | px  | classes                  | use                          |
 *   | ------ | --- | ------------------------ | ---------------------------- |
 *   | `xs`   |  8  | `gap-2`                  | Inline chips                 |
 *   | `sm`   | 16  | `gap-4`                  | Cards, mobile padding        |
 *   | `md`   | 24  | `gap-6`                  | Card-grid gaps, header→grid  |
 *   | `lg`   | 40  | `gap-10`                 | Mobile section gaps          |
 *   | `xl`   | 64  | `gap-16`                 | Desktop section gaps         |
 *   | `2xl`  | 96  | `gap-24`                 | Hero / CTA breathing room    |
 */

const stackVariants = cva('flex', {
  variants: {
    direction: {
      vertical: 'flex-col',
      horizontal: 'flex-row flex-wrap',
    },
    gap: {
      xs: 'gap-2',
      sm: 'gap-4',
      md: 'gap-6',
      lg: 'gap-10',
      xl: 'gap-16',
      '2xl': 'gap-24',
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
      className: cn(stackVariants({ direction, gap, align, justify }), className),
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
