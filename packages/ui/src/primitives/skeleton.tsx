// Loading-state placeholder. Pure CSS — no headless dep.
// Mirrors the shadcn canon: https://ui.shadcn.com/docs/components/skeleton
import * as React from 'react';

import { cn } from '../lib/cn.js';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-muted animate-pulse rounded-md', className)}
      {...props}
    />
  );
}

export { Skeleton };
