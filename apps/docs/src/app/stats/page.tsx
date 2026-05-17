import { Badge } from '@interlace/ui/badge';
import { Container } from '@interlace/ui/container';
import type { Metadata } from 'next';

import { DownloadsByPackage } from '@/components/charts/downloads-by-package';
import { ImpactCard } from '@/components/stats/impact-card';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getStatsPageData, type PluginRow } from '@/lib/stats-page';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Stats',
  description:
    'Live numbers for the Interlace ESLint ecosystem. Engagement is the North Star Metric; code adoption (npm + GitHub) and per-plugin depth (rules, downloads, coverage) underpin it.',
  alternates: { canonical: '/stats' },
  openGraph: {
    title: 'Stats | ESLint Interlace',
    description:
      'Engagement, code adoption, and per-plugin depth for the Interlace ESLint ecosystem.',
    type: 'website',
    url: '/stats',
  },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function fmtDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat('en-US').format(n);
}

interface CoverageCellProps {
  value: number | null;
}

function CoverageCell({ value }: CoverageCellProps) {
  if (value === null) {
    return (
      <span aria-label="No coverage data" className="text-fd-muted-foreground">
        —
      </span>
    );
  }
  return <span className="tabular-nums">{value.toFixed(1)}%</span>;
}

/**
 * Structural lock: `src/__tests__/stats-page-lock.test.tsx` pins required
 * imports, section ids, plugins-table columns, and forbids open-coded HTML
 * table tags / `max-w-*` ad-hoc widths per LAYOUT_PHILOSOPHY.md.
 */
export default async function StatsPage() {
  const data = await getStatsPageData();
  const packages = data.plugins
    .filter((p) => p.downloads > 0)
    .map((p) => ({ name: p.name, downloads: p.downloads }));

  return (
    <Container
      size="wide"
      id="main-content"
      tabIndex={-1}
      className="py-12 outline-hidden"
    >
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Stats</h1>
        <p className="mt-3 max-w-prose text-base text-fd-muted-foreground">
          How the Interlace ESLint ecosystem is doing — engagement (the North
          Star Metric), adoption across npm + GitHub, and the full plugin
          catalog with per-plugin downloads, rule count, and test coverage.
        </p>
      </header>

      <section aria-labelledby="impact-heading" className="mt-12">
        <h2
          id="impact-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Impact
        </h2>
        <p className="mt-2 text-sm text-fd-muted-foreground">
          Engagement separates magnitude (Reach) from quality (Engagement
          rate). Code-adoption metrics confirm whether the audience is
          shipping the rules, not just reading the articles.
        </p>
        <div className="mt-6">
          <ImpactCard stats={data.impact} />
        </div>
      </section>

      <section aria-labelledby="downloads-heading" className="mt-12">
        <h2
          id="downloads-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Top packages by downloads
        </h2>
        <p className="mt-2 text-sm text-fd-muted-foreground">
          Weekly npm downloads per plugin, top 10. Same data as the table
          below, ranked visually.
        </p>
        <Card className="mt-6">
          <CardHeader className="sr-only">
            <CardTitle>Weekly npm downloads by plugin (top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <DownloadsByPackage packages={packages} />
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="plugins-heading" className="mt-12">
        <h2
          id="plugins-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Plugins
        </h2>
        <p className="mt-2 text-sm text-fd-muted-foreground">
          Every published Interlace plugin with rule count, weekly downloads,
          test coverage, and the latest published version. Sorted by
          downloads, descending.
        </p>
        <Card className="mt-6">
          <Table>
            <TableCaption className="sr-only">
              Published Interlace ESLint plugins — category, rule count,
              weekly downloads, line coverage, and version.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Plugin</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Rules</TableHead>
                <TableHead className="text-right">Downloads / wk</TableHead>
                <TableHead className="text-right">Coverage</TableHead>
                <TableHead>Version</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.plugins.map((p: PluginRow) => (
                <TableRow key={p.name}>
                  <TableCell className="font-mono text-xs">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {p.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.rules}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtDownloads(p.downloads)}
                  </TableCell>
                  <TableCell className="text-right">
                    <CoverageCell value={p.coverage} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {p.version}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>

      <footer className="mt-12 border-t border-fd-border pt-6 text-xs text-fd-muted-foreground">
        <p>
          <strong>Catalog</strong> (plugin list, rule counts, versions)
          generated{' '}
          <time dateTime={data.catalogGeneratedAt}>
            {fmtDate(data.catalogGeneratedAt)}
          </time>{' '}
          by <code className="font-mono">npm run sync:plugin-stats</code>.{' '}
          <strong>Live numbers</strong> (npm downloads, GitHub stars, forks,
          contributions) fetched at build and revalidated hourly; last
          resolved{' '}
          <time dateTime={data.liveFetchedAt}>
            {fmtDate(data.liveFetchedAt)}
          </time>
          .
        </p>
      </footer>
    </Container>
  );
}
