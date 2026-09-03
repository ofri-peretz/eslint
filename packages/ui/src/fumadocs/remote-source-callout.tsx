// Inline callout that explains where remote-fetched content came from
// and offers an "Edit on GitHub" affordance. Used at the top of pages
// rendered by `<RemoteMarkdown>`.
//
// Aligned with UX_PHILOSOPHY #2 (URL contract), #4 (Momentum), #7 (SEO/blog
// reciprocation), and the "single source of truth = repo" architecture.
import * as React from 'react';
import { RadioIcon } from 'lucide-react';

import { cn } from '../lib/cn.js';
import { EditOnGitHub } from './edit-on-github.js';

export interface RemoteSourceCalloutProps {
  /**
   * What kind of content this is — drives default copy.
   * - `readme`: "📡 Live README from GitHub..."
   * - `rule`: "📡 Live rule documentation..."
   * - `changelog`: "📡 Live changelog..."
   * - `markdown`: generic "Live content..."
   */
  variant?: 'readme' | 'rule' | 'changelog' | 'markdown';
  /** Display label inside the link (e.g., the file name or rule slug). */
  label: string;
  /** Raw URL link — usually the GitHub `blob/...` URL pointing at the file. */
  sourceUrl: string;
  /** GitHub edit URL (`blob/...` rewritten to `edit/...`). Optional; computed from sourceUrl if absent. */
  editUrl?: string;
  /** ISR cache window for context — formatted into "cached for X". */
  cacheWindowLabel?: string;
  /** Override className on the wrapping element. */
  className?: string;
}

const COPY: Record<NonNullable<RemoteSourceCalloutProps['variant']>, string> = {
  readme: 'Live README from GitHub',
  rule: 'Live rule documentation',
  changelog: 'Live changelog',
  markdown: 'Live content from GitHub',
};

function deriveEditUrl(sourceUrl: string): string {
  return sourceUrl.replace(/\/blob\//, '/edit/');
}

/**
 * Renders a short "this content is fetched from GitHub, here's where, here's
 * how to fix it" affordance. Two-purpose:
 *
 * 1. **Trust** — readers can see and verify the canonical source.
 * 2. **Contribution path** — one-click jump to GitHub editor.
 */
export function RemoteSourceCallout({
  variant = 'markdown',
  label,
  sourceUrl,
  editUrl,
  cacheWindowLabel,
  className,
}: RemoteSourceCalloutProps) {
  const resolvedEditUrl = editUrl ?? deriveEditUrl(sourceUrl);

  return (
    <div
      data-slot="remote-source-callout"
      className={cn(
        'border-fd-info/30 bg-fd-info/10 mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-3 text-sm',
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5 font-medium">
        <RadioIcon className="size-4" aria-hidden />
        {COPY[variant]}
      </span>
      <span className="text-muted-foreground">
        from{' '}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-fd-primary underline underline-offset-2"
        >
          {label}
        </a>
        {cacheWindowLabel ? `, cached for ${cacheWindowLabel}` : ''}
        .
      </span>
      <span className="ml-auto">
        <EditOnGitHub url={resolvedEditUrl} />
      </span>
    </div>
  );
}
