import { Badge } from '@interlace/ui/badge';

import { InlineMarkdown } from '@/components/changelog/inline-markdown';
import {
  formatReleaseDate,
  getPluginReleases,
  isBreaking,
  kindLabel,
} from '@/lib/changelog-data';

const REPO_URL = 'https://github.com/ofri-peretz/eslint';

interface PluginChangelogProps {
  /** Plugin slug as used in the content tree, e.g. `jwt-security`. */
  plugin: string;
  /** Releases to show. 0 = all. */
  limit?: number;
}

/**
 * A plugin's release history, rendered from build-time data.
 *
 * ## What this replaced, and why
 *
 * The previous `<RemoteChangelog>` fetched the raw `CHANGELOG.md` from
 * `raw.githubusercontent.com` at request time and rendered it as MDX. Three
 * problems, all visible on the live site:
 *
 * 1. **It showed the reader the raw file.** Entries written before the release
 *    notes overhaul carry `@changesets/changelog-github`'s prefix, so the page
 *    opened each one with `#635 0d30b1c Thanks @ofri-peretz ! -` before the
 *    first word of prose — roughly 120 characters of plumbing. `/changelog`
 *    strips that; the plugin page, which is where someone researching *this
 *    plugin* actually lands, did not. Same content, two renderings, and the
 *    higher-intent surface had the worse one.
 * 2. **A runtime network dependency.** GitHub being slow or rate-limiting
 *    turned a docs page into an amber "unable to load" box.
 * 3. **It read `main`, not the deployed commit** — with a two-hour cache, so
 *    the page could show entries for a version the deployed docs don't
 *    describe, or lag one that just shipped.
 *
 * The data now comes from `src/data/changelog.json`, the same source
 * `/changelog` uses, so both surfaces render identically and neither touches
 * the network at request time.
 */
export function PluginChangelog({ plugin, limit = 0 }: PluginChangelogProps) {
  const releases = getPluginReleases(plugin, limit);

  if (releases.length === 0) {
    return (
      <p className="text-fd-muted-foreground text-sm">
        No releases recorded yet. The{' '}
        <a
          href={`${REPO_URL}/blob/main/packages/eslint-plugin-${plugin}/CHANGELOG.md`}
          className="underline"
        >
          CHANGELOG on GitHub
        </a>{' '}
        is the source of record.
      </p>
    );
  }

  return (
    <div className="not-prose space-y-8">
      {releases.map((release) => (
        <article
          key={`${release.package}@${release.version}`}
          id={`v${release.version}`}
          className="border-fd-border scroll-mt-24 border-b pb-6 last:border-b-0"
        >
          <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <h3 className="font-mono text-base font-semibold">
              {release.version}
            </h3>

            {isBreaking(release) ? (
              <Badge variant="destructive">Breaking</Badge>
            ) : null}

            <time
              className="text-fd-muted-foreground ml-auto text-sm"
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
                  key={`${release.version}-${i}`}
                  className="text-fd-muted-foreground flex gap-2 text-sm leading-relaxed"
                >
                  <span aria-hidden="true" className="text-fd-border">
                    —
                  </span>
                  <span>
                    {label ? (
                      <Badge variant="secondary" className="mr-2 align-middle">
                        {label}
                      </Badge>
                    ) : null}
                    <span className="text-fd-foreground">
                      <InlineMarkdown text={entry.title} />
                    </span>
                    {entry.pr ? (
                      <>
                        {' '}
                        <a
                          href={`${REPO_URL}/pull/${entry.pr}`}
                          className="text-fd-muted-foreground hover:text-fd-foreground font-mono text-xs"
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
        </article>
      ))}
    </div>
  );
}
