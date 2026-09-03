/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * PluginScorecard — Server Component rendering the canonical scorecard table.
 *
 * Reads a benchmark JSON file produced by the consumer's `npm run bench:<slug>`
 * and renders either the composite-score summary (default) or the per-dimension
 * breakdown (`view="dimensions"`). The same data file backs both views, so the
 * MDX page can render them side-by-side without duplicating data.
 *
 * Default data path (relative to consumer's project cwd):
 *   `benchmarks/benchmark-results/<slug>/latest.json`
 *
 * Override via `dataPath` prop or `NEXT_PUBLIC_INTERLACE_BENCH_DIR` env (which
 * substitutes for `benchmarks/benchmark-results`).
 *
 * Usage:
 *   <PluginScorecard slug="api-gateway-caching" />
 *   <PluginScorecard slug="api-gateway-caching" view="dimensions" />
 *   <PluginScorecard dataPath="./apps/docs/data/scorecard.json" />
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface ScorecardDimension {
  name: string;
  weight: number;
  interlace: number | null;
  community: number | null;
  source: string;
}

export interface ScorecardData {
  slug: string;
  lastVerified: string;
  interlace: { name: string; version: string };
  community: { name: string; version: string; daysSincePublish?: number };
  compositeScore: { interlace: number; community: number };
  dimensions: ScorecardDimension[];
}

export interface PluginScorecardProps {
  /** Plugin slug used to resolve `benchmarks/benchmark-results/<slug>/latest.json`. */
  slug?: string;
  /** Explicit path override (relative to project cwd or absolute). */
  dataPath?: string;
  /** Inline data — wins over `slug` and `dataPath`. */
  data?: ScorecardData;
  /** `summary` (default) shows composite + version block; `dimensions` shows the per-dim table. */
  view?: 'summary' | 'dimensions';
}

async function loadScorecard(props: PluginScorecardProps): Promise<ScorecardData | null> {
  if (props.data) return props.data;
  const baseDir =
    process.env.NEXT_PUBLIC_INTERLACE_BENCH_DIR ?? 'benchmarks/benchmark-results';
  const path =
    props.dataPath ??
    (props.slug ? `${baseDir}/${props.slug}/latest.json` : null);
  if (!path) {
    throw new Error('PluginScorecard: provide `slug`, `dataPath`, or `data`.');
  }
  const absolute = path.startsWith('/') ? path : resolve(process.cwd(), path);
  try {
    const raw = await readFile(absolute, 'utf8');
    return JSON.parse(raw) as ScorecardData;
  } catch {
    return null;
  }
}

function formatPercent(value: number | null): string {
  if (value === null) return '_null_';
  return `${(value * 100).toFixed(1)}%`;
}

function formatDimensionScore(value: number | null): string {
  if (value === null) return '_null_';
  return value.toFixed(2);
}

export async function PluginScorecard(props: PluginScorecardProps) {
  const data = await loadScorecard(props);

  if (!data) {
    return <ScorecardPending slug={props.slug} />;
  }

  if (props.view === 'dimensions') {
    return <DimensionsView data={data} />;
  }
  return <SummaryView data={data} />;
}

function ScorecardPending({ slug }: { slug?: string }) {
  return (
    <div className="my-4 rounded-lg border border-dashed border-fd-border bg-fd-card/50 px-4 py-3 text-sm text-fd-muted-foreground">
      <strong>Scorecard pending.</strong> Benchmark JSON for{' '}
      {slug ? <code className="font-mono">{slug}</code> : 'this plugin'} hasn't been
      committed yet — it ships on the first publish. Until then, see the migration
      page for source-cited differences.
    </div>
  );
}

function SummaryView({ data }: { data: ScorecardData }) {
  const interlaceWins = data.compositeScore.interlace > data.compositeScore.community;
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-fd-border">
      <table className="w-full text-sm">
        <thead className="bg-fd-card">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Plugin</th>
            <th className="px-3 py-2 text-left font-medium">Version</th>
            <th className="px-3 py-2 text-right font-medium">Composite</th>
          </tr>
        </thead>
        <tbody>
          <tr className={interlaceWins ? 'bg-fd-primary/5' : undefined}>
            <td className="px-3 py-2 font-mono text-xs">{data.interlace.name}</td>
            <td className="px-3 py-2 font-mono text-xs">{data.interlace.version}</td>
            <td className="px-3 py-2 text-right font-semibold">
              {formatPercent(data.compositeScore.interlace)}
            </td>
          </tr>
          <tr>
            <td className="px-3 py-2 font-mono text-xs">{data.community.name}</td>
            <td className="px-3 py-2 font-mono text-xs">
              {data.community.version}
              {data.community.daysSincePublish !== undefined
                ? ` (${data.community.daysSincePublish}d stale)`
                : ''}
            </td>
            <td className="px-3 py-2 text-right">
              {formatPercent(data.compositeScore.community)}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="px-3 py-2 text-xs text-fd-muted-foreground">
        Last verified <strong>{data.lastVerified}</strong>. Re-run from the repo root with{' '}
        <code className="font-mono">npm run bench:{data.slug}</code>.
      </p>
    </div>
  );
}

function DimensionsView({ data }: { data: ScorecardData }) {
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-fd-border">
      <table className="w-full text-sm">
        <thead className="bg-fd-card">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Dimension</th>
            <th className="px-3 py-2 text-right font-medium">Weight</th>
            <th className="px-3 py-2 text-right font-medium">Interlace</th>
            <th className="px-3 py-2 text-right font-medium">Community</th>
            <th className="px-3 py-2 text-left font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {data.dimensions.map((d) => {
            const interlaceWins =
              d.interlace !== null && d.community !== null && d.interlace > d.community;
            return (
              <tr key={d.name}>
                <td className="px-3 py-2">{d.name}</td>
                <td className="px-3 py-2 text-right">{(d.weight * 100).toFixed(0)}%</td>
                <td
                  className={`px-3 py-2 text-right ${interlaceWins ? 'font-semibold text-fd-primary' : ''}`}
                >
                  {formatDimensionScore(d.interlace)}
                </td>
                <td className="px-3 py-2 text-right">{formatDimensionScore(d.community)}</td>
                <td className="px-3 py-2 text-xs text-fd-muted-foreground">{d.source}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
