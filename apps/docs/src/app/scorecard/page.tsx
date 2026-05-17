import { Container } from '@interlace/ui/container';
import type { Metadata } from 'next';
import Link from 'next/link';

import {
  FLAGSHIP_RULES,
  computeCacheBenefit,
  computeStackMedians,
  formatCount,
  formatMs,
  formatRunAt,
  loadLatestFlagshipSnapshot,
  orderResultsByFlagshipSpec,
} from '@/lib/scorecard';

// The page reads a JSON snapshot committed to the repo — pre-render once at
// build time. Without this, Next treats the readFileSync as a dynamic input
// and re-evaluates the loader on every request.
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Flagship Scorecard',
  description:
    'Per-rule latency, findings, and head-to-head numbers for the 10 Interlace flagship ESLint rules, measured on 5 real OSS repositories. Generated from the ILB-Flagship bench suite.',
  alternates: { canonical: '/scorecard' },
  openGraph: {
    title: 'Flagship Scorecard | ESLint Interlace',
    description:
      'Per-rule latency, findings, and head-to-head numbers for the 10 flagship ESLint rules — measured, dated, sourced.',
    type: 'website',
    url: '/scorecard',
  },
};

const GITHUB_RAW_BASE =
  'https://github.com/ofri-peretz/eslint/blob/main/benchmarks/results/ilb-flagship';

/**
 * Structural lock: `src/__tests__/scorecard-lock.test.ts` pins required
 * imports, headings, every flagship rule identifier, and forbids ad-hoc
 * `max-w-*` widths per LAYOUT_PHILOSOPHY.md.
 */
export default function ScorecardPage() {
  const snapshot = loadLatestFlagshipSnapshot();
  if (!snapshot) {
    return (
      <Container
        size="wide"
        id="main-content"
        tabIndex={-1}
        className="py-12 outline-hidden"
      >
        <Header />
        <p className="mt-6 rounded-lg border border-dashed border-fd-border bg-fd-card/50 px-4 py-3 text-sm text-fd-muted-foreground">
          No complete flagship snapshot is committed yet. Run{' '}
          <code className="font-mono">npm run ilb:flagship</code> to generate one.
        </p>
      </Container>
    );
  }
  const rows = orderResultsByFlagshipSpec(snapshot);
  const medians = computeStackMedians(snapshot);

  return (
    <Container
      size="wide"
      id="main-content"
      tabIndex={-1}
      className="py-12 outline-hidden"
    >
      <Header />

      <section aria-labelledby="provenance-heading" className="mt-8">
        <h2 id="provenance-heading" className="text-lg font-semibold">
          Provenance
        </h2>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <ProvenanceItem label="Generated" value={formatRunAt(snapshot.runAt)} />
          <ProvenanceItem label="ESLint" value={snapshot.eslintVersion || '—'} />
          <ProvenanceItem label="oxlint" value={snapshot.oxlintVersion || '—'} />
          <ProvenanceItem label="Node" value={snapshot.nodeVersion || '—'} />
        </dl>
        <p className="mt-4 text-sm text-fd-muted-foreground">
          Source JSON:{' '}
          <Link
            href={`${GITHUB_RAW_BASE}/${snapshot.filename}`}
            className="font-mono text-fd-primary underline hover:no-underline"
            target="_blank"
            rel="noreferrer"
          >
            benchmarks/results/ilb-flagship/{snapshot.filename}
          </Link>
          {' '}· Schema <code className="font-mono">{snapshot.schema}</code>.
        </p>
      </section>

      <section aria-labelledby="latency-heading" className="mt-12">
        <h2 id="latency-heading" className="text-lg font-semibold">
          Latency (cold &rarr; warm) and findings count
        </h2>
        <p className="mt-2 text-sm text-fd-muted-foreground">
          One row per flagship rule, measured on a real OSS repository.{' '}
          <strong>Cold</strong> is <code className="font-mono">eslint --no-cache</code>;{' '}
          <strong>Warm</strong> is the same command after a prior cold run with a
          stable cache location. <strong>oxlint</strong> caches implicitly via
          file mtime + content hash. A dash means the stack wasn&rsquo;t exercised
          for that rule (green-field rules have no competitor; not every rule has
          an oxlint port yet).
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-fd-border">
          <table className="w-full text-sm">
            <thead className="bg-fd-card text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Rule</th>
                <th className="px-3 py-2 font-medium">Repo</th>
                <th className="px-3 py-2 text-right font-medium">⭐</th>
                <th className="px-3 py-2 text-center font-medium">Tier</th>
                <th className="px-3 py-2 text-right font-medium">Ours cold</th>
                <th className="px-3 py-2 text-right font-medium">Ours warm</th>
                <th className="px-3 py-2 text-right font-medium">Ours findings</th>
                <th className="px-3 py-2 text-right font-medium">Comp cold</th>
                <th className="px-3 py-2 text-right font-medium">Comp warm</th>
                <th className="px-3 py-2 text-right font-medium">oxlint cold</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.rule} className="border-t border-fd-border">
                  <td className="px-3 py-2 font-mono text-xs">{row.rule}</td>
                  <td className="px-3 py-2">{row.repo}</td>
                  <td className="px-3 py-2 text-right text-fd-muted-foreground">
                    {row.starsK}K
                  </td>
                  <td className="px-3 py-2 text-center text-fd-muted-foreground">
                    {row.tier}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatMs(row.runs.oursEslint?.cold?.ms)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatMs(row.runs.oursEslint?.warm?.ms)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {formatCount(row.runs.oursEslint?.cold?.findingsCount)}
                  </td>
                  <td className="px-3 py-2 text-right text-fd-muted-foreground">
                    {formatMs(row.runs.competitorEslint?.cold?.ms)}
                  </td>
                  <td className="px-3 py-2 text-right text-fd-muted-foreground">
                    {formatMs(row.runs.competitorEslint?.warm?.ms)}
                  </td>
                  <td className="px-3 py-2 text-right text-fd-muted-foreground">
                    {formatMs(row.runs.oxlintNative?.cold?.ms)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="cache-heading" className="mt-12">
        <h2 id="cache-heading" className="text-lg font-semibold">
          Cache effectiveness (median across rules)
        </h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-fd-border">
          <table className="w-full text-sm">
            <thead className="bg-fd-card text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Stack</th>
                <th className="px-3 py-2 text-right font-medium">Median cold</th>
                <th className="px-3 py-2 text-right font-medium">Median warm</th>
                <th className="px-3 py-2 text-right font-medium">Δ</th>
                <th className="px-3 py-2 text-right font-medium">Cache benefit</th>
              </tr>
            </thead>
            <tbody>
              {medians.map((m) => {
                const { delta, pct } = computeCacheBenefit(m);
                return (
                  <tr key={m.stack} className="border-t border-fd-border">
                    <td className="px-3 py-2">{m.label}</td>
                    <td className="px-3 py-2 text-right">{formatMs(m.medianCold)}</td>
                    <td className="px-3 py-2 text-right">{formatMs(m.medianWarm)}</td>
                    <td className="px-3 py-2 text-right">{formatMs(delta)}</td>
                    <td className="px-3 py-2 text-right">
                      {pct !== null ? `${pct}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="how-to-read-heading" className="mt-12 text-sm text-fd-muted-foreground">
        <h2 id="how-to-read-heading" className="text-base font-semibold text-fd-foreground">
          How to read this
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>
            <strong>Latency is single-shot today.</strong> For SLO-grade numbers
            we owe you median-of-N with confidence intervals (tracked on the{' '}
            <Link href="/docs" className="text-fd-primary underline hover:no-underline">
              roadmap
            </Link>
            ).
          </li>
          <li>
            <strong>Findings count is filtered by the rule&rsquo;s own ID prefix</strong>{' '}
            — parser errors and unrelated rules are excluded.
          </li>
          <li>
            <strong>A higher findings count is not automatically better.</strong>{' '}
            See the source markdown report (linked above) for the per-rule
            ours-only / theirs-only triage tables.
          </li>
          <li>
            <strong>The 10 rules are the flagship list</strong> at{' '}
            <code className="font-mono">.agent/flagship-rules.md</code>. Each is
            type-unaware and locked by the meta-package test at{' '}
            <code className="font-mono">
              packages/eslint-config-interlace/src/index.test.ts
            </code>
            .
          </li>
        </ul>
      </section>

      <p className="mt-12 text-xs text-fd-muted-foreground">
        Re-run with <code className="font-mono">npm run ilb:flagship</code> at
        the repo root. Tracks {FLAGSHIP_RULES.length} rules per snapshot.
      </p>
    </Container>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Flagship Scorecard</h1>
      <p className="mt-3 text-base text-fd-muted-foreground">
        Per-rule numbers for the 10 Interlace flagship ESLint rules, measured
        on real open-source repositories. Generated from the{' '}
        <Link
          href="https://github.com/ofri-peretz/eslint/tree/main/benchmarks/suites/ilb-flagship"
          className="text-fd-primary underline hover:no-underline"
          target="_blank"
          rel="noreferrer"
        >
          ILB-Flagship
        </Link>{' '}
        bench suite — dated snapshots committed to{' '}
        <code className="font-mono">benchmarks/results/ilb-flagship/</code>.
      </p>
    </div>
  );
}

function ProvenanceItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-fd-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono text-sm">{value}</dd>
    </div>
  );
}
