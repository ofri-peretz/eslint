#!/usr/bin/env -S npx tsx
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ilb-formatter runner — methodology v1.0
 *
 * Renders every (shape × scale) fixture through every formatter under
 * test, tokenizes with gpt-tokenizer (o200k_base + cl100k_base), probes
 * signal preservation, and writes an ILB-schema JSON result.
 *
 * Usage:
 *   npx tsx benchmarks/suites/ilb-formatter/runner.ts
 *   ILB_OUT=/tmp/foo.json npx tsx ...    # override output path
 *   ILB_LABEL=my-label npx tsx ...       # override result filename label
 *   ILB_SHAPES=mono-rule-storm,...       # subset of shapes (debug)
 *   ILB_SCALES=tiny,small                # subset of scales (debug)
 *   ILB_FORMATS=interlace-compact,...    # subset of formats (debug)
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import {
  allFixtures,
  FIXTURES_VERSION,
  SCALES,
  SHAPES,
  type Scale,
  type Shape,
  type SyntheticFixture,
} from './fixtures';

const HERE = dirname(fileURLToPath(import.meta.url));
const SUITE_NAME = 'ilb-formatter';
const METHODOLOGY_VERSION = 'v1.2';

const require_ = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// TOKENIZERS
// ---------------------------------------------------------------------------

const o200k: { encode: (s: string) => number[] } = require_(
  'gpt-tokenizer/cjs/encoding/o200k_base',
);
const cl100k: { encode: (s: string) => number[] } = require_(
  'gpt-tokenizer/cjs/encoding/cl100k_base',
);

// ---------------------------------------------------------------------------
// FORMATTERS UNDER TEST
// ---------------------------------------------------------------------------

type FormatId =
  | 'interlace-human'
  | 'interlace-compact'
  | 'interlace-json'
  | 'interlace-ndjson'
  | 'interlace-xml'
  | 'eslint-stylish'
  | 'eslint-json'
  | 'eslint-json-with-metadata'
  | 'eslint-html';

const ALL_FORMATS: FormatId[] = [
  'interlace-human',
  'interlace-compact',
  'interlace-json',
  'interlace-ndjson',
  'interlace-xml',
  'eslint-stylish',
  'eslint-json',
  'eslint-json-with-metadata',
  'eslint-html',
];

const BASELINE_FORMAT: FormatId = 'eslint-stylish';

// Renderer signature: takes a fixture, returns formatter output.
type FormatRenderer = (fixture: SyntheticFixture) => string;
type RawEslintFormatter = (results: unknown, data?: unknown) => string;

const FORMATTER_DIST = resolve(
  HERE,
  '../../../dist/out-tsc/packages/eslint-formatter/src/index.js',
);

interface InterlaceFormatter {
  (results: unknown, context?: unknown): string;
}

function loadInterlaceFormatter(): InterlaceFormatter {
  // The package compiles to a CJS module that does `module.exports = formatter`.
  return require_(FORMATTER_DIST) as InterlaceFormatter;
}

/**
 * ESLint v9 ships its built-in formatters as plain CJS modules that expect
 * `(results, data)` and return a string synchronously. Loading via
 * `eslint.loadFormatter` wraps them in an instance-bound API that requires
 * results to come from that ESLint instance — which our synthetic fixtures
 * deliberately don't. We bypass the wrapper and require the modules
 * directly via an absolute path; this is the same code ESLint runs
 * internally. The `package.json#exports` table doesn't expose the path, so
 * we resolve it relative to the package root.
 */
const ESLINT_PKG_DIR = dirname(require_.resolve('eslint/package.json'));

function loadEslintBuiltin(name: string): RawEslintFormatter {
  return require_(resolve(ESLINT_PKG_DIR, 'lib/cli-engine/formatters', `${name}.js`)) as RawEslintFormatter;
}

function buildRenderers(): Record<FormatId, FormatRenderer> {
  const interlace = loadInterlaceFormatter();
  const stylish = loadEslintBuiltin('stylish');
  const json = loadEslintBuiltin('json');
  const jsonMeta = loadEslintBuiltin('json-with-metadata');
  const html = loadEslintBuiltin('html');

  function interlaceRenderer(mode: 'human' | 'compact' | 'json' | 'ndjson' | 'xml'): FormatRenderer {
    return (fixture) => {
      const previous = process.env['ESLINT_FORMAT_MODE'];
      process.env['ESLINT_FORMAT_MODE'] = mode;
      try {
        return interlace(fixture.results, { cwd: '/repo', rulesMeta: fixture.rulesMeta });
      } finally {
        if (previous === undefined) delete process.env['ESLINT_FORMAT_MODE'];
        else process.env['ESLINT_FORMAT_MODE'] = previous;
      }
    };
  }

  return {
    'interlace-human': interlaceRenderer('human'),
    'interlace-compact': interlaceRenderer('compact'),
    'interlace-json': interlaceRenderer('json'),
    'interlace-ndjson': interlaceRenderer('ndjson'),
    'interlace-xml': interlaceRenderer('xml'),
    'eslint-stylish': (fixture) => stylish(fixture.results, { cwd: '/repo', rulesMeta: fixture.rulesMeta }),
    'eslint-json': (fixture) => json(fixture.results),
    'eslint-json-with-metadata': (fixture) => jsonMeta(fixture.results, { rulesMeta: fixture.rulesMeta }),
    'eslint-html': (fixture) => html(fixture.results, { cwd: '/repo', rulesMeta: fixture.rulesMeta }),
  };
}

// ---------------------------------------------------------------------------
// SIGNAL-PRESERVATION PROBES
// ---------------------------------------------------------------------------

interface SignalProbe {
  ruleIdRecoverable: boolean;
  severityRecoverable: boolean;
  countRecoverable: boolean;
  fixableFlagRecoverable: boolean;
  /** 0..4 */
  score: number;
}

// Strip ANSI escape codes before text probing so colorised stylish output
// doesn't kill word-boundary regex matches.
const ANSI_RE = /\x1b\[[0-9;]*m/g;

function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, '');
}

function probeRuleIdsInText(output: string, ruleIds: string[]): boolean {
  const clean = stripAnsi(output);
  for (const id of ruleIds) {
    if (!clean.includes(id)) return false;
  }
  return true;
}

function probeSeverityInText(
  output: string,
  severityByRule: Record<string, 'error' | 'warning'>,
): boolean {
  // Each unique severity present in the truth must appear at least once.
  const needed = new Set(Object.values(severityByRule));
  const lower = stripAnsi(output).toLowerCase();
  // Recognise both full words and abbreviations the formatters use.
  if (needed.has('error') && !(/\berror\b|\berr\b/.test(lower))) return false;
  if (needed.has('warning') && !(/\bwarning\b|\bwarn\b/.test(lower))) return false;
  return true;
}

function probeCountInText(
  output: string,
  countsByRule: Record<string, number>,
): boolean {
  const clean = stripAnsi(output);
  // For grouped formats the count appears literally as ×N or "and M more"
  // or "N errors" (summary). For ungrouped formats we accept that the rule
  // appears at least `count` times (line-by-line, one per finding) — count
  // each ruleId occurrence and require ≥ count.
  for (const [ruleId, count] of Object.entries(countsByRule)) {
    if (count <= 1) continue; // single hit — count signal is trivially preserved.
    const occ = countOccurrences(clean, ruleId);
    // grouped: rule appears at least once and the digits of `count` appear nearby
    // ungrouped: rule appears `count` times.
    const groupedHit = occ >= 1 && (
      clean.includes(`×${count}`) ||
      clean.includes(`x${count}`) ||
      clean.includes(`"n":${count}`) ||
      clean.includes(`(${count})`) ||
      clean.includes(`${count} more`) ||
      clean.includes(`${count} occurrences`)
    );
    const ungroupedHit = occ >= count;
    if (!(groupedHit || ungroupedHit)) return false;
  }
  return true;
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    count++;
    idx += needle.length;
  }
  return count;
}

function probeFixableInText(
  output: string,
  fixableByRule: Record<string, boolean>,
): boolean {
  const anyFixable = Object.values(fixableByRule).some(Boolean);
  if (!anyFixable) return true; // nothing to preserve.
  const lower = stripAnsi(output).toLowerCase();
  return /fixable|"fix":\s*true|--fix|fixablecount/.test(lower);
}

function probeJsonSeverity(
  flat: string,
  severityByRule: Record<string, 'error' | 'warning'>,
): boolean {
  // Structured JSON formats encode severity in two places:
  //   1. eslint-json: messages[].severity = 1 | 2 (numeric)
  //   2. eslint-json: results[].errorCount / warningCount (rollup)
  //   3. interlace-json: rules[].sev = "error" | "warning" (string)
  // Any of those satisfies recoverability.
  const needed = new Set(Object.values(severityByRule));
  if (needed.has('error')) {
    const ok =
      /"severity":\s*2/.test(flat) ||
      /"errorCount":\s*[1-9]/.test(flat) ||
      /"sev":\s*"error"/.test(flat) ||
      /"severity":\s*"error"/.test(flat);
    if (!ok) return false;
  }
  if (needed.has('warning')) {
    const ok =
      /"severity":\s*1/.test(flat) ||
      /"warningCount":\s*[1-9]/.test(flat) ||
      /"sev":\s*"warning"/.test(flat) ||
      /"severity":\s*"warning"/.test(flat);
    if (!ok) return false;
  }
  return true;
}

function probeJsonStructured(output: string, fixture: SyntheticFixture): SignalProbe {
  // Try parse — if it parses, walk it; otherwise fall back to text probe.
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    return probeText(output, fixture);
  }

  const truth = fixture.truth;
  const flat = JSON.stringify(parsed);
  const ruleIdRecoverable = truth.ruleIds.every(id => flat.includes(id));
  const severityRecoverable = probeJsonSeverity(flat, truth.severityByRule);

  // For interlace-json: rules[].n is the count; for eslint-json:
  // results[].messages[].ruleId per-line, plus errorCount / warningCount.
  const countRecoverable = probeCountInText(flat, truth.countsByRule);
  const fixableFlagRecoverable = probeFixableInText(flat, truth.fixableByRule);

  const score =
    Number(ruleIdRecoverable) +
    Number(severityRecoverable) +
    Number(countRecoverable) +
    Number(fixableFlagRecoverable);
  return { ruleIdRecoverable, severityRecoverable, countRecoverable, fixableFlagRecoverable, score };
}

function probeText(output: string, fixture: SyntheticFixture): SignalProbe {
  const truth = fixture.truth;
  const ruleIdRecoverable = probeRuleIdsInText(output, truth.ruleIds);
  const severityRecoverable = probeSeverityInText(output, truth.severityByRule);
  const countRecoverable = probeCountInText(output, truth.countsByRule);
  const fixableFlagRecoverable = probeFixableInText(output, truth.fixableByRule);
  const score =
    Number(ruleIdRecoverable) +
    Number(severityRecoverable) +
    Number(countRecoverable) +
    Number(fixableFlagRecoverable);
  return { ruleIdRecoverable, severityRecoverable, countRecoverable, fixableFlagRecoverable, score };
}

function probeNdjsonStructured(output: string, fixture: SyntheticFixture): SignalProbe {
  // NDJSON is line-delimited JSON; parse each line independently and only
  // fall through to the text probe if every line fails to parse. We then
  // run the same key/value checks the monolithic JSON probe runs against
  // a flattened JSON of the parsed lines — same standard, same strictness.
  const lines = output.split('\n').filter(l => l.trim().length > 0);
  const parsedLines: unknown[] = [];
  for (const line of lines) {
    try { parsedLines.push(JSON.parse(line)); }
    catch { /* skip malformed line — text probe will pick up the slack */ }
  }
  if (parsedLines.length === 0) {
    return probeText(output, fixture);
  }
  // Synthesize a flat blob from the parsed objects. JSON.stringify of an
  // array of objects flattens all keys/values into one searchable string,
  // letting probeJsonSeverity / probeCountInText / probeFixableInText use
  // their existing JSON-aware regex set.
  const flat = JSON.stringify(parsedLines);
  const truth = fixture.truth;
  const ruleIdRecoverable = truth.ruleIds.every(id => flat.includes(id));
  const severityRecoverable = probeJsonSeverity(flat, truth.severityByRule);
  const countRecoverable = probeCountInText(flat, truth.countsByRule);
  const fixableFlagRecoverable = probeFixableInText(flat, truth.fixableByRule);
  const score =
    Number(ruleIdRecoverable) +
    Number(severityRecoverable) +
    Number(countRecoverable) +
    Number(fixableFlagRecoverable);
  return { ruleIdRecoverable, severityRecoverable, countRecoverable, fixableFlagRecoverable, score };
}

function probeXmlStructured(output: string, fixture: SyntheticFixture): SignalProbe {
  // XML signals: every truth ruleId must appear inside a <rule> tag's
  // text content. Severity is wrapped in <severity>error|warning</severity>;
  // count in <count>N</count>; fixable in <fixable>true|false</fixable>.
  // We use targeted regex because adding a real XML parser would mean a
  // new runtime dep — and the tag set we generate is fully predictable.
  const truth = fixture.truth;
  const ruleIdRecoverable = truth.ruleIds.every(id => {
    const escaped = id.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return output.includes(`<rule>${escaped}</rule>`);
  });
  const needed = new Set(Object.values(truth.severityByRule));
  let severityRecoverable = true;
  if (needed.has('error') && !output.includes('<severity>error</severity>')) severityRecoverable = false;
  if (needed.has('warning') && !output.includes('<severity>warning</severity>')) severityRecoverable = false;
  let countRecoverable = true;
  for (const [, count] of Object.entries(truth.countsByRule)) {
    if (count <= 1) continue;
    if (!output.includes(`<count>${count}</count>`)) {
      countRecoverable = false;
      break;
    }
  }
  const anyFixable = Object.values(truth.fixableByRule).some(Boolean);
  const fixableFlagRecoverable = !anyFixable || output.includes('<fixable>true</fixable>');
  const score =
    Number(ruleIdRecoverable) +
    Number(severityRecoverable) +
    Number(countRecoverable) +
    Number(fixableFlagRecoverable);
  return { ruleIdRecoverable, severityRecoverable, countRecoverable, fixableFlagRecoverable, score };
}

function probeSignal(format: FormatId, output: string, fixture: SyntheticFixture): SignalProbe {
  if (format === 'interlace-json' || format === 'eslint-json' || format === 'eslint-json-with-metadata') {
    return probeJsonStructured(output, fixture);
  }
  if (format === 'interlace-ndjson') {
    return probeNdjsonStructured(output, fixture);
  }
  if (format === 'interlace-xml') {
    return probeXmlStructured(output, fixture);
  }
  return probeText(output, fixture);
}

// ---------------------------------------------------------------------------
// GROUP-COLLAPSE METRIC
// ---------------------------------------------------------------------------

function groupCollapse(output: string, fixture: SyntheticFixture): number {
  const naiveLines = fixture.truth.totalFindings + fixture.truth.totalFiles;
  if (naiveLines <= 0) return 0;
  const actualLines = output.split('\n').length;
  return Math.max(0, Math.min(1, (naiveLines - actualLines) / naiveLines));
}

// ---------------------------------------------------------------------------
// MEASUREMENT
// ---------------------------------------------------------------------------

interface Measurement {
  shape: Shape;
  scale: Scale;
  format: FormatId;
  chars: number;
  lines: number;
  // Cost (tokens) — see benchmarks/README.md "The three measurement aspects".
  tokensO200k: number;
  tokensCl100k: number;
  // Effectiveness (context).
  signal: SignalProbe;
  groupCollapse: number;
  // Latency (speed) — median of LATENCY_RUNS, after one warm-up render.
  latencyMsP50: number;
  latencyMsP95: number;
  latencyMsMin: number;
  latencyMsMax: number;
}

/** Per-cell latency sampling. Median-of-5 keeps the cost bounded while
 *  still giving us a stable P50 + a P95 ceiling for the fast scales. */
const LATENCY_RUNS = 5;

/**
 * Regression-check tolerances per axis. Generous enough to absorb
 * tokenizer + JIT + small-N latency noise; tight enough to catch a real
 * regression. A baseline refresh (`--update-baseline`) is the only way
 * to legitimately move these numbers — drift without that flag fails
 * the run.
 */
const REGRESSION_TOLERANCE = {
  /** Tokens may grow up to +5 % per cell before failing. */
  tokensRelative: 0.05,
  /**
   * Plus a +10 token absolute floor — so tiny baselines (e.g. 100 tokens)
   * aren't tripped by tokenizer-version drift or one extra padding char,
   * which produce sub-token noise on a relative-only gate. Effective
   * ceiling is `max(baseline × 1.05, baseline + 10)`.
   */
  tokensAbsoluteFloor: 10,
  /** Latency P50 may grow up to +50 % per cell — wall-clock is noisy at sub-millisecond scale. */
  latencyP50Relative: 0.5,
  /**
   * Plus a +0.5 ms absolute floor — so tiny baselines (e.g. 0.02 ms)
   * aren't tripped by a 0.04 ms observation, which is +100 % relative
   * but well within hrtime measurement jitter.
   */
  latencyP50AbsoluteFloorMs: 0.5,
  /** Signal score must stay ≥ baseline (no relaxation). */
  signalScoreFloor: 0,
};

function tokensO200k(s: string): number {
  return o200k.encode(s).length;
}

function tokensCl100k(s: string): number {
  return cl100k.encode(s).length;
}

function measureCell(
  format: FormatId,
  fixture: SyntheticFixture,
  render: FormatRenderer,
): Measurement {
  // Warm-up render — discarded — to defeat first-call JIT cost on the
  // initial cell of each format.
  render(fixture);

  const samplesNs: bigint[] = new Array(LATENCY_RUNS);
  let output = '';
  for (let i = 0; i < LATENCY_RUNS; i++) {
    const start = process.hrtime.bigint();
    output = render(fixture);
    samplesNs[i] = process.hrtime.bigint() - start;
  }
  samplesNs.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const samplesMs = samplesNs.map(n => Number(n) / 1_000_000);
  const p50 = samplesMs[Math.floor(LATENCY_RUNS / 2)]!;
  // For 5 samples: P95 ≈ max — small-N statistics. We expose min/max
  // alongside so a reader can see the spread without recomputing.
  const p95 = samplesMs[Math.min(LATENCY_RUNS - 1, Math.floor(LATENCY_RUNS * 0.95))]!;

  return {
    shape: fixture.shape,
    scale: fixture.scale,
    format,
    chars: output.length,
    lines: output.split('\n').length,
    tokensO200k: tokensO200k(output),
    tokensCl100k: tokensCl100k(output),
    signal: probeSignal(format, output, fixture),
    groupCollapse: groupCollapse(output, fixture),
    latencyMsP50: round3(p50),
    latencyMsP95: round3(p95),
    latencyMsMin: round3(samplesMs[0]!),
    latencyMsMax: round3(samplesMs[samplesMs.length - 1]!),
  };
}

// ---------------------------------------------------------------------------
// AGGREGATION + SCORE
// ---------------------------------------------------------------------------

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

interface Aggregate {
  format: FormatId;
  count: number;
  meanChars: number;
  // Cost.
  meanTokensO200k: number;
  meanTokensCl100k: number;
  // Effectiveness.
  meanSignalScore: number;
  meanGroupCollapse: number;
  // Latency.
  meanLatencyMs: number;
  medianLatencyMsP50: number;
  worstLatencyMsP95: number;
}

function aggregate(measurements: Measurement[]): Aggregate[] {
  const buckets = new Map<FormatId, Measurement[]>();
  for (const m of measurements) {
    if (!buckets.has(m.format)) buckets.set(m.format, []);
    buckets.get(m.format)!.push(m);
  }
  const out: Aggregate[] = [];
  for (const [format, arr] of buckets) {
    const n = arr.length;
    const sortedP50s = [...arr].map(m => m.latencyMsP50).sort((a, b) => a - b);
    const sortedP95s = [...arr].map(m => m.latencyMsP95).sort((a, b) => a - b);
    out.push({
      format,
      count: n,
      meanChars: round1(arr.reduce((s, m) => s + m.chars, 0) / n),
      meanTokensO200k: round1(arr.reduce((s, m) => s + m.tokensO200k, 0) / n),
      meanTokensCl100k: round1(arr.reduce((s, m) => s + m.tokensCl100k, 0) / n),
      meanSignalScore: round3(arr.reduce((s, m) => s + m.signal.score, 0) / n),
      meanGroupCollapse: round3(arr.reduce((s, m) => s + m.groupCollapse, 0) / n),
      meanLatencyMs: round3(arr.reduce((s, m) => s + m.latencyMsP50, 0) / n),
      medianLatencyMsP50: round3(sortedP50s[Math.floor(n / 2)]!),
      worstLatencyMsP95: round3(sortedP95s[n - 1]!),
    });
  }
  return out;
}

interface PerShapeAggregate {
  shape: Shape;
  format: FormatId;
  count: number;
  meanTokensO200k: number;
  meanSignalScore: number;
  meanGroupCollapse: number;
  meanLatencyMs: number;
}

function perShapeAggregate(measurements: Measurement[]): PerShapeAggregate[] {
  const buckets = new Map<string, Measurement[]>();
  for (const m of measurements) {
    const key = `${m.shape}::${m.format}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(m);
  }
  const out: PerShapeAggregate[] = [];
  for (const [key, arr] of buckets) {
    const [shape, format] = key.split('::') as [Shape, FormatId];
    const n = arr.length;
    out.push({
      shape,
      format,
      count: n,
      meanTokensO200k: round1(arr.reduce((s, m) => s + m.tokensO200k, 0) / n),
      meanSignalScore: round3(arr.reduce((s, m) => s + m.signal.score, 0) / n),
      meanGroupCollapse: round3(arr.reduce((s, m) => s + m.groupCollapse, 0) / n),
      meanLatencyMs: round3(arr.reduce((s, m) => s + m.latencyMsP50, 0) / n),
    });
  }
  return out;
}

interface PerScaleAggregate {
  scale: Scale;
  format: FormatId;
  count: number;
  meanTokensO200k: number;
  meanSignalScore: number;
  meanLatencyMs: number;
  worstLatencyMsP95: number;
}

function perScaleAggregate(measurements: Measurement[]): PerScaleAggregate[] {
  const buckets = new Map<string, Measurement[]>();
  for (const m of measurements) {
    const key = `${m.scale}::${m.format}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(m);
  }
  const out: PerScaleAggregate[] = [];
  for (const [key, arr] of buckets) {
    const [scale, format] = key.split('::') as [Scale, FormatId];
    const n = arr.length;
    const sortedP95 = [...arr].map(m => m.latencyMsP95).sort((a, b) => a - b);
    out.push({
      scale,
      format,
      count: n,
      meanTokensO200k: round1(arr.reduce((s, m) => s + m.tokensO200k, 0) / n),
      meanSignalScore: round3(arr.reduce((s, m) => s + m.signal.score, 0) / n),
      meanLatencyMs: round3(arr.reduce((s, m) => s + m.latencyMsP50, 0) / n),
      worstLatencyMsP95: round3(sortedP95[n - 1]!),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// REGRESSION CHECK
// ---------------------------------------------------------------------------

interface BaselineCell {
  shape: Shape;
  scale: Scale;
  format: FormatId;
  tokensO200k: number;
  latencyMsP50: number;
  signalScore: number;
}

interface RegressionFailure {
  shape: Shape;
  scale: Scale;
  format: FormatId;
  axis: 'tokens' | 'latencyP50' | 'signalScore';
  baseline: number;
  observed: number;
  delta: number;
  reason: string;
}

interface BaselineFile {
  schemaVersion: number;
  methodologyVersion: string;
  measurements: Array<{
    shape: Shape;
    scale: Scale;
    format: FormatId;
    tokensO200k: number;
    latencyMsP50: number;
    signal: { score: number };
  }>;
}

const BASELINE_PATH = resolve(HERE, '../../results/ilb-formatter/baseline.json');

function loadBaseline(): Map<string, BaselineCell> | null {
  if (!existsSync(BASELINE_PATH)) return null;
  const raw = readFileSync(BASELINE_PATH, 'utf8');
  const parsed = JSON.parse(raw) as BaselineFile;
  const map = new Map<string, BaselineCell>();
  for (const m of parsed.measurements) {
    const key = `${m.shape}::${m.scale}::${m.format}`;
    map.set(key, {
      shape: m.shape,
      scale: m.scale,
      format: m.format,
      tokensO200k: m.tokensO200k,
      latencyMsP50: m.latencyMsP50,
      signalScore: m.signal.score,
    });
  }
  return map;
}

function isSubjectUnderTest(format: FormatId): boolean {
  return format.startsWith('interlace-');
}

function regressionCheck(measurements: Measurement[], baseline: Map<string, BaselineCell> | null): {
  baselinePath: string;
  baselinePresent: boolean;
  baselineCellCount: number;
  comparedCells: number;
  newCells: number;
  /** Failures on `interlace-*` (subjects under test) — fail the gate. */
  subjectFailures: RegressionFailure[];
  /** Drift on `eslint-*` (comparators) — informational; don't fail the gate.
   *  Wall-clock noise on third-party formatters isn't a regression in our code. */
  comparatorDrift: RegressionFailure[];
  passing: boolean;
} {
  if (!baseline) {
    return {
      baselinePath: BASELINE_PATH,
      baselinePresent: false,
      baselineCellCount: 0,
      comparedCells: 0,
      newCells: measurements.length,
      subjectFailures: [],
      comparatorDrift: [],
      passing: true,
    };
  }
  const subjectFailures: RegressionFailure[] = [];
  const comparatorDrift: RegressionFailure[] = [];
  let compared = 0;
  let added = 0;
  for (const m of measurements) {
    const key = `${m.shape}::${m.scale}::${m.format}`;
    const b = baseline.get(key);
    if (!b) { added++; continue; }
    compared++;
    const sink = isSubjectUnderTest(m.format) ? subjectFailures : comparatorDrift;

    // Tokens: max(relative, absolute) ceiling. The absolute floor
    // protects tiny baselines (≈100 tokens) from being tripped by
    // sub-token noise that's still large in % terms.
    const tokenRelCeiling = b.tokensO200k * (1 + REGRESSION_TOLERANCE.tokensRelative);
    const tokenAbsCeiling = b.tokensO200k + REGRESSION_TOLERANCE.tokensAbsoluteFloor;
    const tokenCeiling = Math.max(tokenRelCeiling, tokenAbsCeiling);
    if (m.tokensO200k > tokenCeiling) {
      sink.push({
        shape: m.shape,
        scale: m.scale,
        format: m.format,
        axis: 'tokens',
        baseline: b.tokensO200k,
        observed: m.tokensO200k,
        delta: round3((m.tokensO200k - b.tokensO200k) / b.tokensO200k),
        reason: `${m.tokensO200k} tok vs baseline ${b.tokensO200k} tok (ceiling ${round3(tokenCeiling)} tok; tolerance max(+${REGRESSION_TOLERANCE.tokensRelative * 100}%, +${REGRESSION_TOLERANCE.tokensAbsoluteFloor} tok abs))`,
      });
    }

    // Latency: relative + absolute floor.
    const relCeiling = b.latencyMsP50 * (1 + REGRESSION_TOLERANCE.latencyP50Relative);
    const absCeiling = b.latencyMsP50 + REGRESSION_TOLERANCE.latencyP50AbsoluteFloorMs;
    const latCeiling = Math.max(relCeiling, absCeiling);
    if (m.latencyMsP50 > latCeiling) {
      sink.push({
        shape: m.shape,
        scale: m.scale,
        format: m.format,
        axis: 'latencyP50',
        baseline: b.latencyMsP50,
        observed: m.latencyMsP50,
        delta: round3(m.latencyMsP50 - b.latencyMsP50),
        reason: `${m.latencyMsP50}ms vs baseline ${b.latencyMsP50}ms (ceiling ${round3(latCeiling)}ms; tolerance max(+${REGRESSION_TOLERANCE.latencyP50Relative * 100}%, +${REGRESSION_TOLERANCE.latencyP50AbsoluteFloorMs}ms abs))`,
      });
    }

    // Signal score: must stay ≥ baseline.
    if (m.signal.score < b.signalScore - REGRESSION_TOLERANCE.signalScoreFloor) {
      sink.push({
        shape: m.shape,
        scale: m.scale,
        format: m.format,
        axis: 'signalScore',
        baseline: b.signalScore,
        observed: m.signal.score,
        delta: m.signal.score - b.signalScore,
        reason: `signal ${m.signal.score}/4 dropped from baseline ${b.signalScore}/4`,
      });
    }
  }
  return {
    baselinePath: BASELINE_PATH,
    baselinePresent: true,
    baselineCellCount: baseline.size,
    comparedCells: compared,
    newCells: added,
    subjectFailures,
    comparatorDrift,
    passing: subjectFailures.length === 0,
  };
}

type HeadlineScore = Partial<Record<Exclude<FormatId, typeof BASELINE_FORMAT>, number | null>>;

function headlineScore(measurements: Measurement[]): HeadlineScore {
  // For each fixture (shape × scale), compute baseline tokens, then for
  // every non-baseline format compute (tokens − baseline) / baseline.
  const baselineMap = new Map<string, number>();
  for (const m of measurements) {
    if (m.format === BASELINE_FORMAT) {
      baselineMap.set(`${m.shape}::${m.scale}`, m.tokensO200k);
    }
  }
  const deltas: Partial<Record<FormatId, number[]>> = {};
  for (const m of measurements) {
    if (m.format === BASELINE_FORMAT) continue;
    const baseline = baselineMap.get(`${m.shape}::${m.scale}`);
    if (baseline === undefined || baseline === 0) continue;
    if (!deltas[m.format]) deltas[m.format] = [];
    deltas[m.format]!.push((m.tokensO200k - baseline) / baseline);
  }
  const out: HeadlineScore = {};
  for (const [format, ds] of Object.entries(deltas) as [FormatId, number[]][]) {
    if (ds.length === 0) {
      out[format as Exclude<FormatId, typeof BASELINE_FORMAT>] = null;
      continue;
    }
    const mean = ds.reduce((s, d) => s + d, 0) / ds.length;
    out[format as Exclude<FormatId, typeof BASELINE_FORMAT>] = round1(mean * 100);
  }
  return out;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function parseList<T extends string>(env: string | undefined, allowed: readonly T[]): T[] {
  if (!env) return [...allowed];
  const out = env
    .split(',')
    .map(s => s.trim())
    .filter((s): s is T => (allowed as readonly string[]).includes(s));
  return out.length > 0 ? out : [...allowed];
}

async function main(): Promise<void> {
  const shapes = parseList(process.env['ILB_SHAPES'], SHAPES);
  const allScalesArr = Object.keys(SCALES) as Scale[];
  const scales = parseList(process.env['ILB_SCALES'], allScalesArr);
  const formats = parseList(process.env['ILB_FORMATS'], ALL_FORMATS);

  // Filter fixtures.
  const fixtures = allFixtures().filter(
    f => shapes.includes(f.shape) && scales.includes(f.scale),
  );

  const renderers = buildRenderers();
  const measurements: Measurement[] = [];

  for (const fixture of fixtures) {
    for (const format of formats) {
      const m = measureCell(format, fixture, renderers[format]);
      measurements.push(m);
    }
  }

  const summary = aggregate(measurements);
  const perShape = perShapeAggregate(measurements);
  const perScale = perScaleAggregate(measurements);
  const headline = headlineScore(measurements);

  // Per-cell regression check vs baseline.json.
  const baseline = loadBaseline();
  const regression = regressionCheck(measurements, baseline);

  // Latency SLO contract — see methodology v1.0.
  const LATENCY_SLO_MS: Record<Scale, number> = {
    tiny: 5,
    small: 10,
    medium: 25,
    large: 50,
    extreme: 250,
  };
  const latencyContractFailures = measurements
    .filter(m => m.format === 'interlace-compact' || m.format === 'interlace-human' || m.format === 'interlace-json' || m.format === 'interlace-ndjson' || m.format === 'interlace-xml')
    .filter(m => m.latencyMsP50 > LATENCY_SLO_MS[m.scale])
    .map(m => ({
      shape: m.shape,
      scale: m.scale,
      format: m.format,
      sloMs: LATENCY_SLO_MS[m.scale],
      observedP50: m.latencyMsP50,
      observedP95: m.latencyMsP95,
    }));

  // Signal-preservation contract: every structured format must score 4.0
  // on every fixture. NDJSON joined the list at v1.1 once its probe became
  // first-class (parses each line, applies the same JSON-aware regex set
  // as monolithic JSON).
  const STRUCTURED_FORMATS: FormatId[] = ['interlace-json', 'interlace-ndjson', 'interlace-xml', 'eslint-json', 'eslint-json-with-metadata'];
  const signalContractFailures = measurements.filter(
    m => STRUCTURED_FORMATS.includes(m.format) && m.signal.score < 4,
  );

  const tokenizerPkg = require_('gpt-tokenizer/package.json') as { version: string };
  const formatterPkg = require_(
    resolve(HERE, '../../../packages/eslint-formatter/package.json'),
  ) as { version: string };
  const eslintPkg = require_('eslint/package.json') as { version: string };

  // Vocabulary-contract toolchain block — see benchmarks/lib/toolchain.mjs.
  // Inlined here (instead of importing the .mjs) because the suite is .ts
  // and crossing the .mjs boundary requires extra dynamic-import plumbing.
  function safeVersion(pkg: string): string | null {
    try { return (require_(`${pkg}/package.json`) as { version: string }).version; }
    catch { return null; }
  }
  const tsVersion = safeVersion('typescript');
  const toolchain = {
    node: process.version.replace(/^v/, ''),
    eslint: eslintPkg.version,
    typescript: tsVersion,
    tsCompiler: tsVersion && Number.parseInt(tsVersion.split('.')[0]!, 10) >= 6 ? 'tsc-go' : 'tsc-classic',
    typescriptEslint: safeVersion('@typescript-eslint/parser'),
    platform: `${process.platform}-${process.arch}`,
  };

  // Top-level headline metrics — populate the standard cost / effectiveness
  // / latency blocks from the interlace-compact aggregate (the SLO-targeted
  // format). These satisfy the result-schema vocabulary contract and are
  // what the scorecard reads.
  const compact = summary.find(s => s.format === 'interlace-compact');
  const subjectMeasurements = measurements.filter(m => m.format === 'interlace-compact');
  const meanSignalScore = subjectMeasurements.length > 0
    ? subjectMeasurements.reduce((s, m) => s + m.signal.score, 0) / subjectMeasurements.length
    : null;
  const sortedP50 = subjectMeasurements.map(m => m.latencyMsP50).sort((a, b) => a - b);
  const sortedP95 = subjectMeasurements.map(m => m.latencyMsP95).sort((a, b) => a - b);
  const cost = {
    tokensO200k: compact?.meanTokensO200k ?? null,
    tokensCl100k: compact?.meanTokensCl100k ?? null,
    meanTokensO200k: compact?.meanTokensO200k ?? null,
  };
  const effectiveness = {
    signalScore: meanSignalScore !== null ? round3(meanSignalScore) : null,
  };
  const latency = {
    meanLatencyMs: compact?.meanLatencyMs ?? null,
    latencyMsP50: sortedP50.length > 0 ? sortedP50[Math.floor(sortedP50.length / 2)]! : null,
    latencyMsP95: sortedP95.length > 0 ? sortedP95[sortedP95.length - 1]! : null,
  };

  // Provenance — see benchmarks/README.md "The provenance contract".
  // Every result JSON must answer: which model, which tools, in what role.
  const subjectsUnderTest = formats.filter(f => f.startsWith('interlace-'));
  const comparators = formats.filter(f => !f.startsWith('interlace-'));
  const provenanceTools = [
    {
      name: '@interlace/eslint-formatter',
      version: formatterPkg.version,
      role: `subject under test — three modes (human, compact, json) loaded from compiled dist (${subjectsUnderTest.length} mode(s) active this run)`,
    },
    {
      name: 'eslint',
      version: eslintPkg.version,
      role: `industry baseline + comparators — built-in formatters loaded directly via require: ${comparators.join(', ') || '(none)'}`,
    },
    {
      name: 'gpt-tokenizer',
      version: tokenizerPkg.version,
      role: 'cost-axis tokenizer — o200k_base (headline, GPT-4o/Claude proxy) + cl100k_base (sanity, GPT-3.5/4 proxy)',
    },
    {
      name: 'node:process.hrtime.bigint',
      version: process.version,
      role: `latency-axis measurement — median-of-${LATENCY_RUNS} samples per cell after one warm-up render`,
    },
    {
      name: 'tsx',
      version: (require_('tsx/package.json') as { version: string }).version,
      role: 'TypeScript runtime — runs the suite without a separate transpile step',
    },
  ];
  const provenance = {
    model: {
      kind: 'tokenizer-proxy' as const,
      name: 'o200k_base + cl100k_base (gpt-tokenizer)',
      role: 'No LLM is called by this bench. The tokenizer stands in for the consumer model on the cost axis. For LLM-call benches, see ilb-llm-fix and ilb-ai.',
    },
    tools: {
      count: provenanceTools.length,
      items: provenanceTools,
    },
    subjectsUnderTest,
    comparators,
    baselineFormat: BASELINE_FORMAT,
  };
  if (provenance.tools.count !== provenance.tools.items.length) {
    throw new Error('Provenance contract violation: tools.count !== tools.items.length');
  }

  const result = {
    // Vocabulary-contract fields (required by benchmarks/lib/result-schema.json).
    bench: 'ILB-Formatter',
    benchVersion: METHODOLOGY_VERSION.replace(/^v/, ''),
    timestamp: new Date().toISOString(),
    toolchain,
    cost,
    effectiveness,
    latency,
    // Suite-specific extension fields below — additionalProperties is allowed.
    schemaVersion: 1,
    benchmark: SUITE_NAME,
    benchmarkType: 'whole-run-formatter-cost',
    scoringMode: 'composite-mean-delta-vs-baseline',
    methodologyVersion: METHODOLOGY_VERSION,
    methodology: {
      file: 'eslint/benchmarks/suites/ilb-formatter/methodology.md',
      version: METHODOLOGY_VERSION,
      tokenizer: 'gpt-tokenizer',
      tokenizerEncoding: 'o200k_base (headline) + cl100k_base (sanity)',
      score: 'mean across (shape × scale × format) of (tokens(format)/tokens(eslint-stylish) − 1), as percent',
      baselineFormat: BASELINE_FORMAT,
      // Per benchmarks/README.md "The three measurement aspects" — every
      // result JSON in this repo reports cost / effectiveness / latency
      // with the same field names. Keep this aligned.
      aspects: {
        cost: { fields: ['tokensO200k', 'tokensCl100k', 'meanTokensO200k'], slo: 'interlace-compact ≤ eslint-stylish (mean delta ≤ 0%)' },
        effectiveness: { fields: ['signal.score', 'meanSignalScore', 'groupCollapse', 'meanGroupCollapse'], slo: 'structured formats (interlace-json, eslint-json, eslint-json-with-metadata) score 4.0/4 on every fixture' },
        latency: { fields: ['latencyMsP50', 'latencyMsP95', 'meanLatencyMs', 'worstLatencyMsP95'], slo: 'interlace-* P50 ≤ {tiny:5, small:10, medium:25, large:50, extreme:250} ms' },
      },
      sloHeadline: 'interlace-compact ≤ eslint-stylish on token cost; structured formats signalScore = 4.0 on every fixture; interlace-* P50 latency under per-scale ceiling.',
    },
    versions: {
      tokenizer: `gpt-tokenizer@${tokenizerPkg.version}`,
      eslintFormatter: `@interlace/eslint-formatter@${formatterPkg.version}`,
      eslint: `eslint@${eslintPkg.version}`,
      fixtures: FIXTURES_VERSION,
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    provenance,
    headlineScore: headline,
    signalContract: {
      strictFormats: STRUCTURED_FORMATS,
      requiredScore: 4,
      failures: signalContractFailures.map(m => ({
        shape: m.shape,
        scale: m.scale,
        format: m.format,
        score: m.signal.score,
        breakdown: m.signal,
      })),
      passing: signalContractFailures.length === 0,
    },
    latencyContract: {
      strictFormats: ['interlace-human', 'interlace-compact', 'interlace-json', 'interlace-ndjson', 'interlace-xml'],
      perScaleCeilingMs: LATENCY_SLO_MS,
      failures: latencyContractFailures,
      passing: latencyContractFailures.length === 0,
    },
    regressionCheck: regression,
    summary,
    perShape,
    perScale,
    measurements,
  };

  const label = process.env['ILB_LABEL'] ?? `formatter-${formatterPkg.version}`;
  const date = new Date().toISOString().slice(0, 10);
  const defaultOut = resolve(
    HERE,
    `../../results/ilb-formatter/${date}-${label}.json`,
  );
  const outPath = process.env['ILB_OUT'] ? resolve(process.env['ILB_OUT']) : defaultOut;
  const latestPath = resolve(HERE, '../../results/ilb-formatter/latest.json');

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  mkdirSync(dirname(latestPath), { recursive: true });
  writeFileSync(latestPath, JSON.stringify(result, null, 2), 'utf8');

  // Pretty console summary — laid out by the Cost / Effectiveness /
  // Latency triad documented in benchmarks/README.md.
  console.log(`ilb-formatter ${METHODOLOGY_VERSION} — ${measurements.length} measurements (${shapes.length} shapes × ${scales.length} scales × ${formats.length} formats × ${LATENCY_RUNS} latency samples + 1 warm-up)`);
  console.log('');
  console.log(`Provenance — model: ${provenance.model.kind} (${provenance.model.name})`);
  console.log(`            tools: ${provenance.tools.count} involved`);
  for (const t of provenance.tools.items) {
    console.log(`              - ${t.name}@${t.version}`);
  }
  console.log(`            subjects under test (${subjectsUnderTest.length}): ${subjectsUnderTest.join(', ') || '(none)'}`);
  console.log(`            comparators (${comparators.length}): ${comparators.join(', ') || '(none)'}`);
  console.log('');
  console.log(`Cost — mean tokens (o200k) and delta vs ${BASELINE_FORMAT} (negative is cheaper):`);
  for (const a of summary) {
    const pct = headline[a.format as Exclude<FormatId, typeof BASELINE_FORMAT>];
    const pctStr = pct === null || pct === undefined
      ? 'baseline'
      : `${pct >= 0 ? '+' : ''}${pct}%`;
    console.log(`  ${a.format.padEnd(28)} ${a.meanTokensO200k.toString().padStart(10)} tok   ${pctStr}`);
  }
  console.log('');
  console.log('Effectiveness — signal score 0..4 (4 = ruleId+severity+count+fixable all recoverable) and group-collapse:');
  for (const a of summary) {
    console.log(`  ${a.format.padEnd(28)} signal=${a.meanSignalScore.toFixed(2)}/4   groupCollapse=${a.meanGroupCollapse.toFixed(2)}`);
  }
  console.log('');
  console.log('Latency — P50 / P95 ms per render, median-of-5 after warm-up:');
  for (const a of summary) {
    console.log(`  ${a.format.padEnd(28)} P50=${a.medianLatencyMsP50.toFixed(2).padStart(7)} ms   P95=${a.worstLatencyMsP95.toFixed(2).padStart(7)} ms   mean=${a.meanLatencyMs.toFixed(2)} ms`);
  }
  console.log('');
  if (!result.signalContract.passing) {
    console.log(`SIGNAL CONTRACT VIOLATION — ${signalContractFailures.length} cell(s) failed:`);
    for (const f of signalContractFailures.slice(0, 10)) {
      console.log(`  ${f.format} ${f.shape}/${f.scale}: score=${f.signal.score}/4 ${JSON.stringify(f.signal)}`);
    }
    if (signalContractFailures.length > 10) {
      console.log(`  ... and ${signalContractFailures.length - 10} more`);
    }
  } else {
    console.log('Signal contract: PASS — every structured format preserves all 4 axes on every fixture.');
  }
  if (!result.latencyContract.passing) {
    console.log(`LATENCY CONTRACT VIOLATION — ${latencyContractFailures.length} interlace cell(s) over per-scale SLO:`);
    for (const f of latencyContractFailures.slice(0, 10)) {
      console.log(`  ${f.format} ${f.shape}/${f.scale}: P50=${f.observedP50}ms (SLO ${f.sloMs}ms), P95=${f.observedP95}ms`);
    }
    if (latencyContractFailures.length > 10) {
      console.log(`  ... and ${latencyContractFailures.length - 10} more`);
    }
  } else {
    console.log('Latency contract: PASS — every interlace-* cell P50 under its per-scale SLO.');
  }

  // Per-cell regression check vs baseline.json — the most stringent gate.
  // Only `interlace-*` failures fail the build; `eslint-*` drift is
  // observational (we don't control upstream formatter performance).
  if (!regression.baselinePresent) {
    console.log('Regression check: SKIPPED — no baseline.json found at benchmarks/results/ilb-formatter/baseline.json. Run with --update-baseline to seed one from this run.');
  } else if (!regression.passing) {
    console.log(`REGRESSION DETECTED on subject(s)-under-test — ${regression.subjectFailures.length} interlace-* cell(s) drifted beyond tolerance (${regression.comparedCells} compared, ${regression.newCells} new):`);
    for (const f of regression.subjectFailures.slice(0, 20)) {
      console.log(`  ${f.format} ${f.shape}/${f.scale} [${f.axis}]: ${f.reason}`);
    }
    if (regression.subjectFailures.length > 20) {
      console.log(`  ... and ${regression.subjectFailures.length - 20} more (full list in result JSON)`);
    }
    console.log('');
    console.log('To accept the new numbers as the baseline, re-run with --update-baseline.');
  } else {
    console.log(`Regression check: PASS — ${regression.comparedCells} cell(s) within tolerance vs baseline (${regression.subjectFailures.length} subject failures · ${regression.comparatorDrift.length} comparator drift, informational); ${regression.newCells} new cell(s) added.`);
  }
  if (regression.baselinePresent && regression.comparatorDrift.length > 0) {
    console.log(`Comparator drift (informational, doesn't fail the gate — we don't own these formatters):`);
    for (const f of regression.comparatorDrift.slice(0, 5)) {
      console.log(`  ${f.format} ${f.shape}/${f.scale} [${f.axis}]: ${f.reason}`);
    }
    if (regression.comparatorDrift.length > 5) {
      console.log(`  ... and ${regression.comparatorDrift.length - 5} more (full list in result JSON)`);
    }
  }

  console.log('');
  console.log(`Wrote ${outPath}`);
  console.log(`Wrote ${latestPath}`);

  // Optional: update the baseline file from this run.
  if (process.argv.includes('--update-baseline')) {
    copyFileSync(latestPath, BASELINE_PATH);
    console.log(`Wrote ${BASELINE_PATH} (--update-baseline)`);
  }

  // Exit non-zero on any contract or regression failure so CI can gate.
  const anyFail = !result.signalContract.passing
    || !result.latencyContract.passing
    || (regression.baselinePresent && !regression.passing);
  if (anyFail) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
