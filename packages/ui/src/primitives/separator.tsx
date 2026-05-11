import * as React from 'react';
import { Separator as BaseSeparator } from '@base-ui-components/react/separator';

import { cn } from '../lib/cn.js';

type SeparatorProps = React.ComponentProps<typeof BaseSeparator> & {
  orientation?: 'horizontal' | 'vertical';
};

function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: SeparatorProps) {
  return (
    <BaseSeparator
      data-slot="separator"
      orientation={orientation}
      className={cn(
        'bg-border shrink-0',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
export type { SeparatorProps };
