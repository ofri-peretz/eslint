#!/usr/bin/env -S npx tsx
/**
 * ilb-llm-tokens runner — methodology v1.0
 *
 * Reads fixtures.json, renders each fixture through V1 + V2 (human / compact /
 * agent), tokenizes with gpt-tokenizer (o200k_base + cl100k_base), and writes
 * an ILB-schema JSON result to ../../results/ilb-llm-tokens/.
 *
 * Usage:
 *   npx tsx benchmarks/suites/ilb-llm-tokens/runner.ts
 *   ILB_OUT=/tmp/foo.json npx tsx ...   # override output path
 *   ILB_LABEL=my-label npx tsx ...      # override result filename label
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const SUITE_NAME = 'ilb-llm-tokens';
const METHODOLOGY_VERSION = 'v1.0';

const require_ = createRequire(import.meta.url);

// Encodings: gpt-tokenizer's package exports map `./cjs/*` → `cjs/*.js`,
// so we omit the .js suffix on the import (it's appended by the resolver).
const o200k: { encode: (s: string) => number[] } = require_(
  'gpt-tokenizer/cjs/encoding/o200k_base',
);
const cl100k: { encode: (s: string) => number[] } = require_(
  'gpt-tokenizer/cjs/encoding/cl100k_base',
);

// Pull formatters from the in-tree compiled output. We import via require so
// this script needs no transpilation step for the formatter code itself.
const DEVKIT_DIST = resolve(
  HERE,
  '../../../dist/out-tsc/packages/eslint-devkit/src/messaging',
);
type V1Formatters = {
  formatLLMMessage: (opts: unknown) => string;
};
type V2Formatters = {
  formatSecurityMessage: (opts: unknown, mode: 'human' | 'compact' | 'agent') => string;
  formatCodeQualityMessage: (opts: unknown, mode: 'human' | 'compact' | 'agent') => string;
  formatPerformanceMessage: (opts: unknown, mode: 'human' | 'compact' | 'agent') => string;
};
const v1: V1Formatters = require_(join(DEVKIT_DIST, 'formatters.js'));
const v2: V2Formatters = require_(join(DEVKIT_DIST, 'formatters-v2.js'));

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

type Category = 'security' | 'quality' | 'performance';
type Format = 'v1' | 'v2-human' | 'v2-compact' | 'v2-agent';

interface Measurement {
  fixtureId: string;
  category: Category;
  format: Format;
  chars: number;
  tokensO200k: number;
  tokensCl100k: number;
}

interface Aggregate {
  category: Category;
  format: Format;
  count: number;
  meanChars: number;
  meanTokensO200k: number;
  meanTokensCl100k: number;
}

interface Fixture {
  id: string;
  v1: unknown;
  v2: unknown;
}

interface FixturesFile {
  version: string;
  security: Fixture[];
  quality: Fixture[];
  performance: Fixture[];
}

// ---------------------------------------------------------------------------
// MEASUREMENT
// ---------------------------------------------------------------------------

function tokensO200k(s: string): number {
  return o200k.encode(s).length;
}

function tokensCl100k(s: string): number {
  return cl100k.encode(s).length;
}

function measure(
  fixtureId: string,
  category: Category,
  format: Format,
  output: string,
): Measurement {
  return {
    fixtureId,
    category,
    format,
    chars: output.length,
    tokensO200k: tokensO200k(output),
    tokensCl100k: tokensCl100k(output),
  };
}

function renderSecurity(fixture: Fixture): Measurement[] {
  return [
    measure(fixture.id, 'security', 'v1', v1.formatLLMMessage(fixture.v1)),
    measure(fixture.id, 'security', 'v2-human', v2.formatSecurityMessage(fixture.v2, 'human')),
    measure(fixture.id, 'security', 'v2-compact', v2.formatSecurityMessage(fixture.v2, 'compact')),
    measure(fixture.id, 'security', 'v2-agent', v2.formatSecurityMessage(fixture.v2, 'agent')),
  ];
}

function renderQuality(fixture: Fixture): Measurement[] {
  return [
    measure(fixture.id, 'quality', 'v1', v1.formatLLMMessage(fixture.v1)),
    measure(fixture.id, 'quality', 'v2-human', v2.formatCodeQualityMessage(fixture.v2, 'human')),
    measure(fixture.id, 'quality', 'v2-compact', v2.formatCodeQualityMessage(fixture.v2, 'compact')),
    measure(fixture.id, 'quality', 'v2-agent', v2.formatCodeQualityMessage(fixture.v2, 'agent')),
  ];
}

function renderPerformance(fixture: Fixture): Measurement[] {
  return [
    measure(fixture.id, 'performance', 'v1', v1.formatLLMMessage(fixture.v1)),
    measure(fixture.id, 'performance', 'v2-human', v2.formatPerformanceMessage(fixture.v2, 'human')),
    measure(fixture.id, 'performance', 'v2-compact', v2.formatPerformanceMessage(fixture.v2, 'compact')),
    measure(fixture.id, 'performance', 'v2-agent', v2.formatPerformanceMessage(fixture.v2, 'agent')),
  ];
}

// ---------------------------------------------------------------------------
// AGGREGATION + SCORE
// ---------------------------------------------------------------------------

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function aggregate(measurements: Measurement[]): Aggregate[] {
  const buckets = new Map<string, Measurement[]>();
  for (const m of measurements) {
    const key = `${m.category}::${m.format}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(m);
  }
  const out: Aggregate[] = [];
  for (const [key, arr] of buckets) {
    const [category, format] = key.split('::') as [Category, Format];
    const n = arr.length;
    out.push({
      category,
      format,
      count: n,
      meanChars: round1(arr.reduce((s, m) => s + m.chars, 0) / n),
      meanTokensO200k: round1(arr.reduce((s, m) => s + m.tokensO200k, 0) / n),
      meanTokensCl100k: round1(arr.reduce((s, m) => s + m.tokensCl100k, 0) / n),
    });
  }
  return out;
}

type HeadlineScore = Record<Exclude<Format, 'v1'>, number | null>;
type PerCategoryScore = Record<Category, HeadlineScore>;

/**
 * Single-number score: mean delta vs V1 across all fixtures, in percent,
 * for each non-V1 format. Negative is better (V2 saved tokens vs V1).
 *
 * NOTE: this is the *aggregate* score across all categories. It is
 * directionally informative but not the headline used by the scorecard,
 * because V2's quality + performance fixtures intentionally carry context
 * V1 lacks (`why`, examples, `impact`) — so they're not apples-to-apples
 * with V1 across those categories. Use `scorePerCategory` for the
 * SLO-targetable view (security is where V2 is supposed to win on cost).
 */
function score(measurements: Measurement[]): HeadlineScore {
  const v1Map = new Map<string, number>();
  for (const m of measurements) {
    if (m.format === 'v1') {
      v1Map.set(`${m.category}::${m.fixtureId}`, m.tokensO200k);
    }
  }

  const deltas: Record<Exclude<Format, 'v1'>, number[]> = {
    'v2-human': [],
    'v2-compact': [],
    'v2-agent': [],
  };
  for (const m of measurements) {
    if (m.format === 'v1') continue;
    const v1Tokens = v1Map.get(`${m.category}::${m.fixtureId}`);
    if (v1Tokens === undefined) continue;
    deltas[m.format as Exclude<Format, 'v1'>].push((m.tokensO200k - v1Tokens) / v1Tokens);
  }

  const result: HeadlineScore = {
    'v2-human': null,
    'v2-compact': null,
    'v2-agent': null,
  };
  for (const [format, ds] of Object.entries(deltas) as [Exclude<Format, 'v1'>, number[]][]) {
    if (ds.length === 0) continue;
    const meanDelta = ds.reduce((s, d) => s + d, 0) / ds.length;
    result[format] = round1(meanDelta * 100); // percent
  }
  return result;
}

/**
 * Per-category mean delta vs V1, in percent. This is the SLO-targetable
 * view: security is where V2 is designed to win on cost (it drops
 * OWASP/compliance metadata that V1 force-fits). Quality + performance
 * carry intentional V2-only context (`why`, examples, `impact`) that V1
 * lacks, so cost-only comparisons there are apples-to-oranges.
 */
function scorePerCategory(measurements: Measurement[]): PerCategoryScore {
  const result: PerCategoryScore = {
    security: { 'v2-human': null, 'v2-compact': null, 'v2-agent': null },
    quality: { 'v2-human': null, 'v2-compact': null, 'v2-agent': null },
    performance: { 'v2-human': null, 'v2-compact': null, 'v2-agent': null },
  };
  for (const category of ['security', 'quality', 'performance'] as const) {
    const v1Map = new Map<string, number>();
    for (const m of measurements) {
      if (m.format === 'v1' && m.category === category) {
        v1Map.set(m.fixtureId, m.tokensO200k);
      }
    }
    for (const fmt of ['v2-human', 'v2-compact', 'v2-agent'] as const) {
      const ds: number[] = [];
      for (const m of measurements) {
        if (m.format !== fmt || m.category !== category) continue;
        const v1Tokens = v1Map.get(m.fixtureId);
        if (v1Tokens === undefined) continue;
        ds.push((m.tokensO200k - v1Tokens) / v1Tokens);
      }
      if (ds.length > 0) {
        result[category][fmt] = round1((ds.reduce((s, d) => s + d, 0) / ds.length) * 100);
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main(): void {
  const fixturesPath = join(HERE, 'fixtures.json');
  const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf8')) as FixturesFile;

  const measurements: Measurement[] = [
    ...fixtures.security.flatMap(renderSecurity),
    ...fixtures.quality.flatMap(renderQuality),
    ...fixtures.performance.flatMap(renderPerformance),
  ];

  const summary = aggregate(measurements);
  const headlineScore = score(measurements);
  const perCategoryScore = scorePerCategory(measurements);

  const tokenizerPkg = require_('gpt-tokenizer/package.json') as { version: string };
  const devkitPkg = require_(
    resolve(HERE, '../../../packages/eslint-devkit/package.json'),
  ) as { version: string };

  const result = {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    benchmark: SUITE_NAME,
    benchmarkType: 'token-cost',
    scoringMode: 'composite-mean-delta',
    methodologyVersion: METHODOLOGY_VERSION,
    methodology: {
      file: 'eslint/benchmarks/suites/ilb-llm-tokens/methodology.md',
      version: METHODOLOGY_VERSION,
      tokenizer: 'gpt-tokenizer',
      tokenizerEncoding: 'o200k_base (headline) + cl100k_base (sanity)',
      score: 'mean across (category, fixture) of (tokens(format)/tokens(v1) − 1), as percent',
      sloHeadline: 'security/v2-compact ≤ V1 (this is what V2 was designed to deliver). Quality/performance carry V2-only context that V1 lacks, so are not directly cost-comparable.',
    },
    versions: {
      tokenizer: `gpt-tokenizer@${tokenizerPkg.version}`,
      eslintDevkit: `@interlace/eslint-devkit@${devkitPkg.version}`,
      fixtures: fixtures.version,
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    headlineScore,
    perCategoryScore,
    summary,
    measurements,
  };

  const label = process.env['ILB_LABEL'] ?? `formatters-${devkitPkg.version}`;
  const date = new Date().toISOString().slice(0, 10);
  const defaultOut = resolve(
    HERE,
    `../../results/ilb-llm-tokens/${date}-${label}.json`,
  );
  const outPath = process.env['ILB_OUT'] ? resolve(process.env['ILB_OUT']) : defaultOut;
  const latestPath = resolve(HERE, '../../results/ilb-llm-tokens/latest.json');

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  mkdirSync(dirname(latestPath), { recursive: true });
  writeFileSync(latestPath, JSON.stringify(result, null, 2), 'utf8');

  console.log(`ilb-llm-tokens ${METHODOLOGY_VERSION} — ${measurements.length} measurements across ${summary.length} (category, format) cells`);
  console.log('');
  console.log('Aggregate score (mean delta vs V1, % across ALL fixtures — directional only):');
  for (const [format, pct] of Object.entries(headlineScore)) {
    console.log(`  ${format.padEnd(12)} ${pct === null ? 'n/a' : (pct >= 0 ? '+' : '') + pct + '%'}`);
  }
  console.log('');
  console.log('Per-category score (SLO-targetable view — security is where V2 is designed to win):');
  for (const category of ['security', 'quality', 'performance'] as const) {
    console.log(`  ${category}:`);
    for (const [format, pct] of Object.entries(perCategoryScore[category])) {
      console.log(`    ${format.padEnd(12)} ${pct === null ? 'n/a' : (pct >= 0 ? '+' : '') + pct + '%'}`);
    }
  }
  console.log('');
  console.log(`Wrote ${outPath}`);
  console.log(`Wrote ${latestPath}`);
}

main();
