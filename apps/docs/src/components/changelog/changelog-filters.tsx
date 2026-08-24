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
 * JavaScript. A `<select>` would need hydration to navigate and would hide 31
 * of 32 options behind a click.
 *
 * `aria-current="page"` rather than a visual-only active state: the selected
 * filter has to be announced, and it is the one piece of state a screen-reader
 * user cannot infer from the list below.
 */
export function ChangelogFilters({ packages, active }: ChangelogFiltersProps) {
  return (
    <nav aria-label="Filter releases by package" className="mb-8">
      {/* One scrolling row on mobile, wrapped on desktop. Wrapping at 375px
          stacks 32 chips into ~900px — two and a half screens of filter before
          the reader reaches a single release, which is the mobile failure mode
          CLAUDE.md calls out. `flex` is nowrap by default, so the mobile case
          is the absence of `flex-wrap` rather than an override. */}
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
        <li className="shrink-0">
          <Link
            href="/changelog"
            aria-current={active ? undefined : 'page'}
            className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none"
          >
            <Badge variant={active ? 'outline' : 'default'}>All packages</Badge>
          </Link>
        </li>

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
    </nav>
  );
}
