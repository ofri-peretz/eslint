import Link from 'next/link';

import { Badge } from '@interlace/ui/badge';
import { Stack } from '@interlace/ui/stack';

import { InlineMarkdown } from './inline-markdown';

import {
  formatReleaseDate,
  isBreaking,
  kindLabel,
  type ChangelogRelease,
} from '@/lib/changelog-data';

const REPO_URL = 'https://github.com/ofri-peretz/eslint';

interface ReleaseListProps {
  releases: ChangelogRelease[];
}

/**
 * The release list.
 *
 * A server component with no client JavaScript: filtering and paging are URL
 * state handled by the page, so this renders once and never hydrates. That is
 * also what keeps CLS at zero on a list whose rows vary in height — there is
 * no second render to shift them.
 *
 * Each release is an `<article>` rather than a list item because it is
 * independently meaningful and independently linkable (`#eslint-plugin-x-2.1.0`),
 * which is what a reader arriving from a GitHub Release or an npm page needs.
 */
export function ReleaseList({ releases }: ReleaseListProps) {
  if (releases.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center">
        No releases match this filter.
      </p>
    );
  }

  return (
    <Stack gap="xl">
      {releases.map((release) => {
        const anchor = `${release.short}-${release.version}`;
        const breaking = isBreaking(release);

        return (
          <article
            key={`${release.package}@${release.version}`}
            id={anchor}
            // `scroll-mt` so a deep link doesn't land under the sticky header.
            className="border-border scroll-mt-24 border-b pb-8 last:border-b-0"
          >
            <header className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-2">
              <h2 className="text-lg font-semibold tracking-tight">
                <Link
                  href={`/changelog?pkg=${release.short}`}
                  className="hover:text-primary focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                >
                  {release.short}
                </Link>{' '}
                <span className="text-muted-foreground font-mono text-base font-normal">
                  {release.version}
                </span>
              </h2>

              {breaking ? <Badge variant="destructive">Breaking</Badge> : null}

              {release.isPrivate ? (
                <Badge variant="outline">
                  {release.isApp ? 'App' : 'Internal'}
                </Badge>
              ) : null}

              <time
                className="text-muted-foreground ml-auto text-sm"
                dateTime={release.date ?? undefined}
              >
                {formatReleaseDate(release.date)}
              </time>
            </header>

            <ul className="space-y-2">
              {release.entries.map((entry, i) => {
                const label = kindLabel(entry.kind);
                return (
                  <li
                    key={`${anchor}-${i}`}
                    className="text-muted-foreground flex gap-2 text-sm leading-relaxed"
                  >
                    <span aria-hidden="true" className="text-border">
                      —
                    </span>
                    <span>
                      {label ? (
                        <Badge
                          variant="secondary"
                          className="mr-2 align-middle"
                        >
                          {label}
                        </Badge>
                      ) : null}
                      <span className="text-foreground">
                        <InlineMarkdown text={entry.title} />
                      </span>
                      {entry.pr ? (
                        <>
                          {' '}
                          <a
                            href={`${REPO_URL}/pull/${entry.pr}`}
                            className="text-muted-foreground hover:text-primary focus-visible:ring-ring rounded-sm font-mono text-xs focus-visible:ring-2 focus-visible:outline-none"
                          >
                            #{entry.pr}
                          </a>
                        </>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>

            {release.isPrivate ? null : (
              // One template string, not interpolated JSX children: the latter
              // renders as separate text nodes, so selecting the line to copy
              // it picks up stray whitespace around the `@`.
              <p className="text-muted-foreground bg-muted/40 mt-4 overflow-x-auto rounded px-3 py-2 font-mono text-xs">
                {`npm install --save-dev ${release.package}@${release.version}`}
              </p>
            )}
          </article>
        );
      })}
    </Stack>
  );
}
