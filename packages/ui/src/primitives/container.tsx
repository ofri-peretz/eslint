import * as React from 'react';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/cn.js';

/**
 * `<Container>` — width contract from LAYOUT_PHILOSOPHY.md §2.
 *
 * Four sizes only, mapped to fixed max-widths. Mixing ad-hoc `max-w-3xl` /
 * `max-w-5xl` is forbidden in app code.
 *
 *   | size      | max-width | Use                                  |
 *   | --------- | --------- | ------------------------------------ |
 *   | `prose`   | 65ch      | Long-form text (rule docs, articles) |
 *   | `content` | 1024px    | Default for landing sections         |
 *   | `wide`    | 1280px    | Card-grid heavy sections             |
 *   | `full`    | none      | Full-bleed hero, decorative bands    |
 *
 * Owns the responsive horizontal padding scale: `px-4 sm:px-6 lg:px-8`
 * (LAYOUT_PHILOSOPHY §5).
 */

const containerVariants = cva('mx-auto w-full px-4 sm:px-6 lg:px-8', {
  variants: {
    size: {
      prose: 'max-w-[65ch]',
      content: 'max-w-[1024px]',
      wide: 'max-w-[1280px]',
      full: 'max-w-none px-0 sm:px-0 lg:px-0',
    },
  },
  defaultVariants: {
    size: 'content',
  },
});

type ContainerProps = React.ComponentProps<'div'> &
  VariantProps<typeof containerVariants> & {
    render?: useRender.RenderProp;
  };

function Container({ className, size, render, ...props }: ContainerProps) {
  const element = useRender({
    render: render ?? <div />,
    props: {
      'data-slot': 'container',
      'data-size': size ?? undefined,
      className: cn(containerVariants({ size }), className),
      ...props,
    },
  });

  return element;
}

export { Container, containerVariants };
export type { ContainerProps };
