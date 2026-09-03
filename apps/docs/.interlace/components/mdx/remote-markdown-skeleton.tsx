/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
// Skeleton placeholder for `<RemoteMarkdown>` while ISR cold-start fetches.
// Smooths the "blank flash" gap (UX_PHILOSOPHY #6 Performance).
//
// Use as `<Suspense fallback={<RemoteMarkdownSkeleton />}>...</Suspense>`.
import * as React from 'react';

import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

export interface RemoteMarkdownSkeletonProps {
  /** How many paragraph skeleton rows to render. Default: 6. */
  rows?: number;
  /** Render a heading skeleton at the top. Default: true. */
  withHeading?: boolean;
  /** Render the source-callout placeholder bar. Default: true. */
  withSourceCallout?: boolean;
  /** Override className on the wrapping element. */
  className?: string;
}

/**
 * Renders a content-shaped placeholder approximating a typical rendered
 * remote-markdown layout: source callout, heading, body paragraphs.
 */
export function RemoteMarkdownSkeleton({
  rows = 6,
  withHeading = true,
  withSourceCallout = true,
  className,
}: RemoteMarkdownSkeletonProps) {
  return (
    <div
      data-slot="remote-markdown-skeleton"
      className={cn('space-y-4', className)}
      aria-hidden
    >
      {withSourceCallout ? (
        <Skeleton className="h-10 w-full rounded-lg" />
      ) : null}
      {withHeading ? <Skeleton className="h-8 w-2/3" /> : null}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4"
            style={{ width: `${75 + ((i * 13) % 25)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
