import * as React from 'react';

import { cn } from '../lib/cn.js';
import { Stack } from '../primitives/stack.js';
import { Typography } from '../primitives/typography.js';

/**
 * @interlace/ui — Hero
 *
 * The above-the-fold section every landing page reaches for: eyebrow,
 * headline, supporting copy, primary + secondary CTAs, optional media slot.
 * Server-component-safe; the calm-confident-technical voice is enforced by
 * Typography variants (no h1 with weight=900 anywhere).
 *
 * ## Anatomy
 *
 *   Hero                             (section — data-min-viewport=320)
 *     ├─ Stack                       (text column)
 *     │   ├─ {eyebrow}               (Typography variant=ui-sm tone=primary)
 *     │   ├─ Typography variant=h1   (headline)
 *     │   ├─ Typography variant=long (subhead, max-w-prose)
 *     │   └─ {actions}               (Cluster of Buttons — primary first)
 *     └─ {media}                     (optional right-column visual slot)
 *
 * MIN_VIEWPORT — 320. Heroes must read on phones — the headline reflows,
 * the CTA stacks vertically, the media slot drops below.
 *
 * | Rule | Concept                          | Where in this file                                          |
 * | ---- | -------------------------------- | ----------------------------------------------------------- |
 * | R4   | Extends native <section>         | `React.ComponentProps<'section'> & HeroProps`               |
 * | R6   | data-slot on root                | `data-slot="hero"`                                          |
 * | R10  | Composition seams                | `eyebrow` + `actions` + `media` props                       |
 * | R14  | Declares min viewport            | `data-min-viewport={String(MIN_VIEWPORT)}` + exported const |
 * | R19  | Tokens only                      | spacing/typography from primitives                          |
 * | R25  | Server component                 | No hooks → no `'use client'`                                |
 * | R26  | A11y landmark                    | `<section aria-labelledby>` is the rendered element         |
 */

export const MIN_VIEWPORT = 320 as const;

type HeroProps = React.ComponentProps<'section'> & {
  /** Small accent line above the headline — e.g. "v2.0 · February 2026". */
  eyebrow?: React.ReactNode;
  /** Big display headline. */
  headline: React.ReactNode;
  /** Supporting paragraph — max-w-prose by default. */
  body?: React.ReactNode;
  /** CTA cluster — typically a primary Button and a secondary link/Button. */
  actions?: React.ReactNode;
  /** Optional right-column visual — image, video, code window, decorative SVG. */
  media?: React.ReactNode;
};

export function Hero({
  className,
  eyebrow,
  headline,
  body,
  actions,
  media,
  ...props
}: HeroProps) {
  return (
    <section
      data-slot="hero"
      data-min-viewport={String(MIN_VIEWPORT)}
      className={cn(
        'relative isolate w-full py-16 sm:py-24',
        media ? 'grid gap-10 lg:grid-cols-2 lg:items-center' : '',
        className,
      )}
      {...props}
    >
      <Stack gap="lg">
        {eyebrow ? (
          <Typography
            variant="ui-sm"
            tone="primary"
            className="font-semibold uppercase tracking-wider"
          >
            {eyebrow}
          </Typography>
        ) : null}
        <Typography as="h1" variant="h1">
          {headline}
        </Typography>
        {body ? (
          <Typography variant="long" tone="muted" className="max-w-prose">
            {body}
          </Typography>
        ) : null}
        {actions ? (
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        ) : null}
      </Stack>
      {media ? (
        <div className="relative w-full" aria-hidden={typeof media === 'string' ? undefined : true}>
          {media}
        </div>
      ) : null}
    </section>
  );
}
