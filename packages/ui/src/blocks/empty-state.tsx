import * as React from 'react';

import { cn } from '../lib/cn.js';
import { Stack } from '../primitives/stack.js';
import { Typography } from '../primitives/typography.js';

/**
 * @interlace/ui — EmptyState
 *
 * The "nothing here yet" surface. Used wherever a list, table, or search
 * returns zero rows AND the consumer can act on it (create the first item,
 * adjust filters, link to docs). Empty states are first-class UX, not an
 * afterthought — `LOADING_PHILOSOPHY` flags any zero-state without one
 * as a design bug.
 *
 * ## Anatomy
 *
 *   EmptyState                       (block — data-min-viewport=320)
 *     ├─ {icon}                      (optional — usually a lucide outline icon)
 *     ├─ Typography variant=h4       (title)
 *     ├─ Typography variant=body     (description)
 *     └─ {actions}                   (optional CTA cluster, often a Button)
 *
 * MIN_VIEWPORT — 320. Always usable on phones; this is the failure-mode
 * surface, so it must work on every device.
 *
 * | Rule | Concept                          | Where in this file                                          |
 * | ---- | -------------------------------- | ----------------------------------------------------------- |
 * | R4   | Extends native el                | `React.ComponentProps<'div'> & EmptyStateProps`             |
 * | R6   | data-slot on root                | `data-slot="empty-state"`                                   |
 * | R7   | className merged + ...rest       | `cn(BASE, className)` + `{...props}`                        |
 * | R8   | No isXxx; enums for variants     | n/a — no variants on this block                             |
 * | R10  | Composition seam                 | `icon` + `actions` slots                                    |
 * | R14  | Declares min viewport            | `data-min-viewport={String(MIN_VIEWPORT)}` + exported const |
 * | R18  | Tailwind only                    | Zero inline style                                           |
 * | R19  | Tokens only                      | bg/border/text from semantic tokens                         |
 * | R25  | Server component                 | No hooks → no `'use client'`                                |
 */

export const MIN_VIEWPORT = 320 as const;

type EmptyStateProps = React.ComponentProps<'div'> & {
  /** The headline — keep it factual and short. e.g. "No rules match these filters". */
  title: React.ReactNode;
  /** Supporting copy — describe how the consumer can change the result. */
  description?: React.ReactNode;
  /** Optional icon slot — pass a lucide-react icon element. */
  icon?: React.ReactNode;
  /** Optional action slot — typically a primary Button + a quiet text link. */
  actions?: React.ReactNode;
};

export function EmptyState({
  className,
  title,
  description,
  icon,
  actions,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      data-min-viewport={String(MIN_VIEWPORT)}
      className={cn(
        'border-border bg-card/40 flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center',
        className,
      )}
      {...props}
    >
      <Stack gap="md" align="center" className="max-w-md">
        {icon ? (
          <div className="text-muted-foreground" aria-hidden>
            {icon}
          </div>
        ) : null}
        <Typography as="h4" variant="h4">
          {title}
        </Typography>
        {description ? (
          <Typography variant="body" tone="muted" align="center">
            {description}
          </Typography>
        ) : null}
        {actions ? <div className="mt-2">{actions}</div> : null}
      </Stack>
    </div>
  );
}
