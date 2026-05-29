import * as React from 'react';

import { cn } from '../lib/cn.js';
import { Stack } from '../primitives/stack.js';
import { Typography } from '../primitives/typography.js';

/**
 * @interlace/ui — PageHeader
 *
 * The header band at the top of admin / docs / settings pages. Carries a
 * breadcrumb (optional), title, optional description, and a right-aligned
 * actions slot (typically a primary CTA + an optional menu). Renders a
 * `<header>` landmark for screen-reader navigation.
 *
 * ## Anatomy
 *
 *   PageHeader                       (header — data-min-viewport=480)
 *     ├─ {breadcrumb}                (optional — Breadcrumb primitive)
 *     ├─ <div>                       (title row — flex justify-between)
 *     │   ├─ Stack                   (left column)
 *     │   │   ├─ Typography h1       (title)
 *     │   │   └─ Typography body     (description — optional)
 *     │   └─ {actions}               (right column — Cluster of Buttons)
 *     └─ {meta}                      (optional — tags / status / dates row)
 *
 * MIN_VIEWPORT — 480. Page headers expect a breadcrumb + title + actions
 * row, which doesn't fit cleanly below the iPhone-mini-portrait floor; the
 * actions stack vertically below, but the meta strip + breadcrumb crowd
 * the title. Reach for a simpler title-only header on narrower phones.
 *
 * | Rule | Concept                          | Where in this file                                          |
 * | ---- | -------------------------------- | ----------------------------------------------------------- |
 * | R4   | Extends native <header>          | `React.ComponentProps<'header'> & PageHeaderProps`          |
 * | R6   | data-slot on root                | `data-slot="page-header"`                                   |
 * | R10  | Composition seams                | `breadcrumb` + `actions` + `meta` props                     |
 * | R14  | Declares min viewport            | `data-min-viewport={String(MIN_VIEWPORT)}` + exported const |
 * | R19  | Tokens only                      | border/spacing/typography from primitives                   |
 * | R25  | Server component                 | No hooks → no `'use client'`                                |
 * | R26  | A11y landmark                    | `<header>` is the rendered element                          |
 */

export const MIN_VIEWPORT = 480 as const;

type PageHeaderProps = React.ComponentProps<'header'> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional <Breadcrumb> above the title. */
  breadcrumb?: React.ReactNode;
  /** Optional right-aligned actions cluster — typically Buttons. */
  actions?: React.ReactNode;
  /** Optional meta strip below the title — tags / status / dates. */
  meta?: React.ReactNode;
};

export function PageHeader({
  className,
  title,
  description,
  breadcrumb,
  actions,
  meta,
  ...props
}: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      data-min-viewport={String(MIN_VIEWPORT)}
      className={cn('border-border w-full border-b pb-6', className)}
      {...props}
    >
      <Stack gap="md">
        {breadcrumb ? <div>{breadcrumb}</div> : null}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Typography as="h1" variant="h1">
              {title}
            </Typography>
            {description ? (
              <Typography variant="body" tone="muted" className="mt-2">
                {description}
              </Typography>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
        {meta ? (
          <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
            {meta}
          </div>
        ) : null}
      </Stack>
    </header>
  );
}
