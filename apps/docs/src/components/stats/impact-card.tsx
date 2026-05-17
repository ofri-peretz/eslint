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

const formatCompact = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

interface SupportMetric {
  label: string;
  value: number;
  display: string;
}

function buildSupportMetrics(stats: ImpactStats): SupportMetric[] {
  return [
    {
      label: 'Weekly npm downloads',
      value: stats.npm.totalDownloads,
      display: formatCompact(stats.npm.totalDownloads),
    },
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

function EngagementHero({ engagement }: { engagement: ImpactStats['engagement'] }) {
  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardDescription className="text-xs font-medium uppercase tracking-wider">
          North Star Metric
        </CardDescription>
        <CardTitle className="text-base font-semibold">Engagement</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-fd-muted-foreground">
              Reach
            </dt>
            <dd className="mt-1 text-5xl font-bold tabular-nums sm:text-6xl">
              <NumberTicker value={engagement.reach} startValue={0} delay={0.1} />
            </dd>
            <p className="mt-1 text-xs text-fd-muted-foreground">
              People who read an article.
            </p>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-fd-muted-foreground">
              Engagement rate
            </dt>
            <dd className="mt-1 text-5xl font-bold tabular-nums sm:text-6xl">
              <NumberTicker
                value={engagement.ratePercent}
                startValue={0}
                delay={0.15}
                decimalPlaces={2}
              />
              <span className="text-2xl font-semibold text-fd-muted-foreground sm:text-3xl">
                %
              </span>
            </dd>
            <p className="mt-1 text-xs text-fd-muted-foreground">
              (reactions + comments) / reach.
            </p>
          </div>
        </dl>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-fd-border pt-4 text-sm">
          <div className="flex items-baseline justify-between">
            <dt className="text-fd-muted-foreground">Reactions</dt>
            <dd className="tabular-nums font-medium">
              <NumberTicker value={engagement.reactions} startValue={0} delay={0.2} />
            </dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt className="text-fd-muted-foreground">Comments</dt>
            <dd className="tabular-nums font-medium">
              <NumberTicker value={engagement.comments} startValue={0} delay={0.2} />
            </dd>
          </div>
        </dl>

        <p className="sr-only">
          Engagement: reach{' '}
          {engagement.reach.toLocaleString('en-US')} (views), engagement rate{' '}
          {engagement.ratePercent}%, reactions{' '}
          {engagement.reactions.toLocaleString('en-US')}, comments{' '}
          {engagement.comments.toLocaleString('en-US')}.
        </p>
      </CardContent>
    </Card>
  );
}

export function ImpactCard({ stats }: ImpactCardProps) {
  const metrics = buildSupportMetrics(stats);

  return (
    <div className="space-y-6">
      <EngagementHero engagement={stats.engagement} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Code adoption
          </CardTitle>
          <CardDescription>
            Engagement explains the audience; these show whether the audience
            is actually shipping the rules.
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
    </div>
  );
}
