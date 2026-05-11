// Form-control label. No headless dep — Base UI's `Field.Label` is the
// MDX/forms-aware variant; this is the lower-level shadcn-canon label.
// Mirrors: https://ui.shadcn.com/docs/components/label
import * as React from 'react';

import { cn } from '../lib/cn.js';

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn(
        'flex select-none items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
