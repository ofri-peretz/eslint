import Link from 'next/link';

import { Badge } from '@interlace/ui/badge';

interface ChangelogFiltersProps {
  packages: Array<{ short: string; name: string; count: number }>;
  active?: string;
}

/**
 * Package filter.
 *
 * Plain links, not a client-side control. The filter is URL state
 * (`/changelog?pkg=eslint-plugin-jwt-security`), which makes every filtered
 * view shareable, crawlable, and back-button correct — and costs no
 * JavaScript. A `<select>` would need hydration to navigate and would hide
 * every option behind a click.
 *
 * The full chip cloud lives inside a native `<details>`: at 34 packages the
 * wrapped cloud is ~5 rows — half the first desktop screen spent on filter
 * before the reader sees a single release. The always-visible row carries the
 * two things that matter without opening anything: the "All packages" reset
 * and the currently active filter. `<details>` keeps every link in the DOM
 * (crawlable), needs no hydration, and is keyboard-operable natively.
 *
 * `aria-current="page"` rather than a visual-only active state: the selected
 * filter has to be announced, and it is the one piece of state a screen-reader
 * user cannot infer from the list below.
 */
export function ChangelogFilters({ packages, active }: ChangelogFiltersProps) {
  const activePkg = packages.find((p) => p.short === active);
  return (
    <nav aria-label="Filter releases by package" className="mb-8">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/changelog"
          aria-current={active ? undefined : 'page'}
          className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none"
        >
          <Badge variant={active ? 'outline' : 'default'}>All packages</Badge>
        </Link>
        {activePkg ? (
          <Link
            href={`/changelog?pkg=${activePkg.short}`}
            aria-current="page"
            className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none"
          >
            <Badge variant="default">
              {activePkg.short}
              <span className="text-muted-foreground ml-1.5 tabular-nums">
                {activePkg.count}
              </span>
            </Badge>
          </Link>
        ) : null}
      </div>

      <details className="group mt-2">
        <summary className="cursor-pointer list-none text-sm text-fd-muted-foreground hover:text-fd-foreground focus-visible:ring-2 focus-visible:ring-fd-primary focus-visible:outline-none rounded">
          <span aria-hidden className="mr-1 inline-block transition-transform group-open:rotate-90">
            ▸
          </span>
          Filter by package · {packages.length} packages
        </summary>
        <ul className="mt-3 flex flex-wrap gap-2">
          {packages.map((pkg) => (
            <li key={pkg.short} className="shrink-0">
              <Link
                href={`/changelog?pkg=${pkg.short}`}
                aria-current={active === pkg.short ? 'page' : undefined}
                className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none"
              >
                <Badge variant={active === pkg.short ? 'default' : 'outline'}>
                  {pkg.short}
                  <span className="text-muted-foreground ml-1.5 tabular-nums">
                    {pkg.count}
                  </span>
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </nav>
  );
}
