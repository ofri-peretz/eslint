'use client';

import * as React from 'react';
import { useRender } from '@base-ui-components/react/use-render';
import type { VariantProps } from 'class-variance-authority';

import { cn } from '../lib/cn.js';
import { buttonVariants } from './button-variants.js';

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /**
     * Replace the rendered element. Equivalent to shadcn's legacy `asChild`.
     * Pass a `ReactElement` (e.g. `<Link href="...">`) or a render function.
     */
    render?: useRender.RenderProp;
  };

function Button({
  className,
  variant = 'default',
  size = 'default',
  render,
  ...props
}: ButtonProps) {
  const element = useRender({
    render: render ?? <button />,
    props: {
      'data-slot': 'button',
      'data-variant': variant ?? undefined,
      'data-size': size ?? undefined,
      className: cn(buttonVariants({ variant, size, className })),
      ...props,
    },
  });

  return element;
}

export { Button, buttonVariants };
export type { ButtonProps };
