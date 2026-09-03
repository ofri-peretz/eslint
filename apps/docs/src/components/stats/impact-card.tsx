import { NumberTicker } from '#interlace/components/ui/number-ticker';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ImpactStats } from '@/lib/stats-page';

interface ImpactCardProps {
  stats: ImpactStats;
}

/**
 * "2025-12-08" → "December 2025". Day precision would imply the total is
 * pinned to a launch event; the month is the honest resolution for a window
 * that simply began when the first package shipped.
 */
const formatMonthYear = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const formatCompact = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

interface AdoptionMetric {
  label: string;
  value: number;
  display: string;
}

function buildAdoptionMetrics(stats: ImpactStats): AdoptionMetric[] {
  const downloads = stats.npm.totalDownloads;
  return [
    // Omitted entirely when the canonical source was unreachable. A card
    // reading "0 downloads" is a claim; a missing card is a gap.
    ...(downloads === null
      ? []
      : [
          {
            // Cumulative, not weekly — and it says which. The same figure is
            // published on ofriperetz.dev, and an unqualified number invites
            // the reader to assume a different window than it covers.
            label: stats.npm.since
              ? `npm downloads since ${formatMonthYear(stats.npm.since)}`
              : 'npm downloads (all-time)',
            value: downloads,
            display: formatCompact(downloads),
          },
        ]),
    {
      label: 'GitHub stars',
      value: stats.github.totalStars,
      display: String(stats.github.totalStars),
    },
    {
      label: 'GitHub forks',
      value: stats.github.totalForks,
      display: String(stats.github.totalForks),
    },
    {
      label: 'Contributions',
      value: stats.github.totalContributions,
      display: formatCompact(stats.github.totalContributions),
    },
  ];
}

/**
 * Public adoption card for /stats. Deliberately adoption-only: article
 * engagement (reach / rate / reactions) is an internal growth metric —
 * on a visitor-facing page it answers a question no visitor asks, and a
 * sparse early-stage value reads as abandonment. The regression lock in
 * `stats-page-lock.test.tsx` forbids it from coming back here.
 */
export function ImpactCard({ stats }: ImpactCardProps) {
  const metrics = buildAdoptionMetrics(stats);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Code adoption</CardTitle>
        <CardDescription>
          Cumulative npm downloads plus GitHub stars, forks, and contributions
          — whether teams are actually shipping the rules.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label}>
              <dt className="text-xs font-medium uppercase tracking-wider text-fd-muted-foreground">
                {m.label}
              </dt>
              <dd className="mt-2 text-3xl font-semibold tabular-nums">
                <NumberTicker value={m.value} startValue={0} delay={0.2} />
              </dd>
            </div>
          ))}
        </dl>
        <p className="sr-only">
          Code adoption values:{' '}
          {metrics.map((m) => `${m.label}: ${m.display}`).join(', ')}
        </p>
      </CardContent>
    </Card>
  );
}
