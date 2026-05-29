import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/cn.js';
import { Typography } from '../primitives/typography.js';

/**
 * @interlace/ui — StatCard
 *
 * A single labeled metric — the building block of dashboards, scorecards,
 * and "key results" rows. Renders: label / value / optional delta / optional
 * icon. The `tone` variant pairs the delta accent with one of four semantic
 * colors (default / success / warning / danger).
 *
 * Numbers are rendered with `font-variant-numeric: tabular-nums` (inherited
 * from preflight when wrapped in a `[data-tabular-nums]` container or table)
 * — set `data-tabular-nums` on the StatCard root to opt in.
 *
 * ## Anatomy
 *
 *   StatCard                         (article — data-min-viewport=320)
 *     ├─ <div>                       (header row — label + icon)
 *     │   ├─ Typography ui-sm        (label)
 *     │   └─ {icon}                  (lucide icon, optional)
 *     ├─ Typography h2               (value — tabular numerals)
 *     ├─ {delta}                     (optional — "+12.3% · 30d" — tone-tinted)
 *     └─ {footnote}                  (optional smaller meta — "since launch")
 *
 * MIN_VIEWPORT — 320. Dashboards must work on phones; this is the smallest
 * widget on the canvas.
 *
 * | Rule | Concept                          | Where in this file                                          |
 * | ---- | -------------------------------- | ----------------------------------------------------------- |
 * | R4   | Extends native el + VariantProps | `React.ComponentProps<'article'> & VariantProps<...>`       |
 * | R6   | data-slot + data-tone            | `data-slot="stat-card"` + `data-tone`                       |
 * | R7   | cn + ...rest                     | `cn(statCardVariants(...), className)` + `{...props}`       |
 * | R8   | Enums for tone                   | `tone = default|success|warning|danger`                     |
 * | R10  | Composition seams                | `icon` / `delta` / `footnote` props                         |
 * | R14  | Declares min viewport            | `data-min-viewport={String(MIN_VIEWPORT)}` + exported const |
 * | R19  | Tokens only                      | tone classes map to semantic tokens                         |
 * | R25  | Server component                 | No hooks → no `'use client'`                                |
 */

export const MIN_VIEWPORT = 320 as const;

const statCardVariants = cva(
  'border-border bg-card text-card-foreground rounded-lg border p-5 flex flex-col gap-2',
  {
    variants: {
      tone: {
        default: '',
        success: 'border-emerald-500/40',
        warning: 'border-amber-500/40',
        danger: 'border-rose-500/40',
      },
    },
    defaultVariants: {
      tone: 'default',
    },
  },
);

const deltaToneClass: Record<NonNullable<VariantProps<typeof statCardVariants>['tone']>, string> = {
  default: 'text-muted-foreground',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-rose-600 dark:text-rose-400',
};

type StatCardProps = React.ComponentProps<'article'> &
  VariantProps<typeof statCardVariants> & {
    label: React.ReactNode;
    value: React.ReactNode;
    /** Optional change/trend line — e.g. "+12.3% · 30d". Inherits the tone color. */
    delta?: React.ReactNode;
    /** Optional secondary line under the delta — e.g. "since launch". */
    footnote?: React.ReactNode;
    /** Optional lucide icon — pinned to the top-right of the card. */
    icon?: React.ReactNode;
  };

export function StatCard({
  className,
  tone = 'default',
  label,
  value,
  delta,
  footnote,
  icon,
  ...props
}: StatCardProps) {
  return (
    <article
      data-slot="stat-card"
      data-tone={tone ?? undefined}
      data-min-viewport={String(MIN_VIEWPORT)}
      className={cn(statCardVariants({ tone, className }))}
      {...props}
    >
      <div className="flex items-start justify-between gap-2">
        <Typography variant="ui-sm" tone="muted">
          {label}
        </Typography>
        {icon ? (
          <span className="text-muted-foreground" aria-hidden>
            {icon}
          </span>
        ) : null}
      </div>
      <Typography as="div" variant="h2" data-tabular-nums>
        {value}
      </Typography>
      {delta ? (
        <div className={cn('text-sm font-medium', deltaToneClass[tone ?? 'default'])}>
          {delta}
        </div>
      ) : null}
      {footnote ? (
        <Typography variant="ui-sm" tone="muted">
          {footnote}
        </Typography>
      ) : null}
    </article>
  );
}

export { statCardVariants };
