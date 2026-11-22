/**
 * GitHubCard — the repo, its star count and a link, on every docs page.
 *
 * Modelled on the card on ofriperetz.dev (title, one line, a stat, a link to
 * github.com/ofri-peretz/eslint), which converts 5.8% of sessions to the repo
 * against 0.12% on these docs (1 click in 808 sessions, PostHog 2026-11-20).
 *
 * A server component: the star count is fetched on the server (cached for an
 * hour, see `getGitHubStars`) and is in the HTML. No client fetch, no popup, no
 * layout shift. Per strategy-1m.md the wording is a statement, never a star
 * ask: the link says "View on GitHub", and the count is a fact beside the name.
 *
 * Two placements share one component: the sidebar banner (md and up, where the
 * sidebar is visible above the fold) and a one-line inline version for narrow
 * screens, where the sidebar is a drawer.
 */
import { Star } from 'lucide-react';

import { REPO, REPO_URL } from '@/lib/github-stars';

function formatStars(stars: number): string {
  return stars >= 1000
    ? `${(stars / 1000).toFixed(1).replace(/\.0$/, '')}k`
    : String(stars);
}

export function GitHubCard({
  stars,
  variant = 'sidebar',
}: {
  /** Build-time count; `null` when GitHub was unreachable (the card still renders). */
  stars: number | null;
  variant?: 'sidebar' | 'inline';
}) {
  if (variant === 'inline') {
    return (
      <div
        data-github-card="inline"
        data-placement="github-card"
        {...(stars === null ? {} : { 'data-github-stars': String(stars) })}
        className="mb-4 md:hidden"
      >
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-fd-border bg-fd-card px-3 py-1.5 text-sm text-fd-card-foreground hover:bg-fd-accent"
        >
          <span className="font-mono">{REPO}</span>
          {stars === null ? null : (
            <span className="inline-flex items-center gap-1 text-fd-muted-foreground">
              <Star className="size-3.5" aria-hidden="true" />
              <span className="tabular-nums">{formatStars(stars)}</span>
              <span className="sr-only">{stars === 1 ? 'star' : 'stars'}</span>
            </span>
          )}
        </a>
      </div>
    );
  }

  return (
    <div
      data-github-card="sidebar"
      data-placement="github-card"
      {...(stars === null ? {} : { 'data-github-stars': String(stars) })}
      className="mb-2"
    >
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg border border-fd-border bg-fd-card p-3 text-fd-card-foreground transition-colors hover:bg-fd-accent"
      >
        <span className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-sm font-medium">{REPO}</span>
          {stars === null ? null : (
            <span className="inline-flex shrink-0 items-center gap-1 text-sm text-fd-muted-foreground">
              <Star className="size-3.5" aria-hidden="true" />
              <span className="tabular-nums">{formatStars(stars)}</span>
              <span className="sr-only">{stars === 1 ? 'star' : 'stars'}</span>
            </span>
          )}
        </span>
        <span className="mt-1 block text-xs text-fd-muted-foreground">
          Open source, MIT. Maintained by Ofri Peretz.
        </span>
        <span className="mt-1.5 block text-xs font-medium text-fd-foreground underline underline-offset-2">
          View on GitHub
        </span>
      </a>
    </div>
  );
}
