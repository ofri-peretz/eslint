/**
 * Unit tests for the gap-closure scripts that landed with the 2026-05-13
 * EVALUATION_METRICS.md sweep. Each script exposes pure functions that
 * are the logical core; main() spawns subprocesses or shells out and is
 * exercised by the integration-style runs in CI, not here.
 *
 * Run from the repo root:
 *   npx vitest run scripts/__tests__/
 */

import { describe, it, expect } from 'vitest';

import {
  recomputeSummary as cveRecomputeSummary,
  findPolicyViolations as cveFindPolicyViolations,
} from '../audit-cve-rule-latency.js';

import {
  auditManifest,
  recomputeSummary as apiRecomputeSummary,
} from '../audit-api-surface.js';

import {
  extractMeasurements,
  evaluateBudget,
  findLatestFlagshipResult,
} from '../check-per-rule-budget.js';

import { checkArtifact } from '../check-audit-freshness.js';

import {
  readOxlintRules,
  bareSlug,
  computeOverlap,
  diffAgainstPrevious,
} from '../audit-stock-corpus-overlap.js';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// =========================================
// audit-cve-rule-latency.ts
// =========================================

describe('audit-cve-rule-latency: recomputeSummary', () => {
  const log = (entries: Array<{ latencyDays: number; rescinded?: boolean; discoveryMode: string }>) => ({
    description: '',
    fieldDefinitions: {},
    entries: entries.map((e, i) => ({
      cveId: `CVE-TEST-${i}`,
      cwe: 'CWE-1',
      disclosed: '2020-01-01',
      library: 'x',
      rulePackage: 'p',
      ruleName: 'r',
      ruleFirstShipped: '2020-01-01',
      ...e,
    })) as any[],
    summary: { asOf: 'old', entryCount: 0, medianLatencyDays: 0, targetLatencyDays: 14, note: '' },
    process: {},
  });

  it('computes median over active entries only', () => {
    const r = cveRecomputeSummary(
      log([
        { latencyDays: 10, discoveryMode: 'cve-feed' },
        { latencyDays: 20, discoveryMode: 'cve-feed' },
        { latencyDays: 30, discoveryMode: 'cve-feed' },
        { latencyDays: 9999, discoveryMode: 'cve-feed', rescinded: true },
      ]),
    );
    expect(r.medianLatencyDays).toBe(20);
    expect(r.entryCount).toBe(3);
  });

  it('returns zeros for empty entries', () => {
    const r = cveRecomputeSummary(log([]));
    expect(r.medianLatencyDays).toBe(0);
    expect(r.entryCount).toBe(0);
  });

  it('preserves targetLatencyDays from the input', () => {
    const l = log([{ latencyDays: 5, discoveryMode: 'cve-feed' }]);
    l.summary.targetLatencyDays = 30;
    const r = cveRecomputeSummary(l);
    expect(r.targetLatencyDays).toBe(30);
  });
});

describe('audit-cve-rule-latency: findPolicyViolations', () => {
  const logShape = (entries: Array<{ latencyDays: number; discoveryMode: string; rescinded?: boolean }>) => ({
    description: '',
    fieldDefinitions: {},
    entries: entries.map((e, i) => ({
      cveId: `CVE-${i}`,
      cwe: 'X',
      disclosed: '2020-01-01',
      library: 'x',
      rulePackage: 'p',
      ruleName: 'r',
      ruleFirstShipped: '2020-01-01',
      notes: '',
      ...e,
    })) as any[],
    summary: { asOf: '', entryCount: 0, medianLatencyDays: 0, targetLatencyDays: 14, note: '' },
    process: {},
  });

  it('flags cve-feed entries over target', () => {
    const v = cveFindPolicyViolations(
      logShape([
        { latencyDays: 100, discoveryMode: 'cve-feed' },
        { latencyDays: 5, discoveryMode: 'cve-feed' },
      ]),
    );
    expect(v).toHaveLength(1);
    expect(v[0].latencyDays).toBe(100);
  });

  it('exempts historical (non-cve-feed) entries from policy', () => {
    const v = cveFindPolicyViolations(
      logShape([
        { latencyDays: 9999, discoveryMode: 'audit' },
        { latencyDays: 9999, discoveryMode: 'community' },
        { latencyDays: 9999, discoveryMode: 'proactive' },
      ]),
    );
    expect(v).toHaveLength(0);
  });

  it('exempts rescinded entries', () => {
    const v = cveFindPolicyViolations(
      logShape([
        { latencyDays: 9999, discoveryMode: 'cve-feed', rescinded: true },
      ]),
    );
    expect(v).toHaveLength(0);
  });
});

// =========================================
// audit-api-surface.ts
// =========================================

describe('audit-api-surface: auditManifest', () => {
  const make = (overrides: Partial<any> = {}) => ({
    description: '',
    method: '',
    generatedAt: '2026-01-01',
    target_floor_pct: 60,
    summary: { aggregateCoverage_pct: 0, pluginsAtOrAboveFloor: 0, pluginsBelowFloor: 0, criticalGaps: [], note: '' },
    plugins: [
      {
        plugin: 'eslint-plugin-test',
        surface: 'x',
        surfaceVersion: '1',
        callableApis_total: 10,
        callableApis_covered: 7,
        coverage_pct: 70,
        ruleCount: 5,
        uncovered_examples: [],
        notes: '',
      },
    ],
    ...overrides,
  });

  it('flags covered > total as an error', () => {
    const m = make({
      plugins: [
        {
          plugin: 'bad',
          surface: 'x',
          surfaceVersion: '1',
          callableApis_total: 10,
          callableApis_covered: 11,
          coverage_pct: 110,
          ruleCount: 1,
          uncovered_examples: [],
          notes: '',
        },
      ],
    });
    const f = auditManifest(m as any);
    const errs = f.filter((x) => x.severity === 'error');
    expect(errs.length).toBeGreaterThanOrEqual(1);
    expect(errs[0].message).toMatch(/covered.*>.*total/);
  });

  it('flags coverage_pct disagreeing with computed', () => {
    const m = make({
      plugins: [
        {
          plugin: 'mismatch',
          surface: 'x',
          surfaceVersion: '1',
          callableApis_total: 10,
          callableApis_covered: 5,
          coverage_pct: 80,
          ruleCount: 1,
          uncovered_examples: [],
          notes: '',
        },
      ],
    });
    const f = auditManifest(m as any);
    expect(f.some((x) => x.severity === 'error' && /disagrees/.test(x.message))).toBe(true);
  });

  it('warns when below floor but does not error', () => {
    const m = make({
      plugins: [
        {
          plugin: 'low',
          surface: 'x',
          surfaceVersion: '1',
          callableApis_total: 10,
          callableApis_covered: 3,
          coverage_pct: 30,
          ruleCount: 1,
          uncovered_examples: [],
          notes: '',
        },
      ],
    });
    const f = auditManifest(m as any);
    expect(f.some((x) => x.severity === 'warn' && /below.*floor/i.test(x.message))).toBe(true);
    expect(f.some((x) => x.severity === 'error')).toBe(false);
  });

  it('passes silently when everything is consistent and at floor', () => {
    const f = auditManifest(make() as any);
    expect(f).toEqual([]);
  });
});

describe('audit-api-surface: recomputeSummary', () => {
  it('averages coverage across plugins', () => {
    const m = {
      description: '',
      method: '',
      generatedAt: '',
      target_floor_pct: 60,
      summary: { aggregateCoverage_pct: 0, pluginsAtOrAboveFloor: 0, pluginsBelowFloor: 0, criticalGaps: [], note: '' },
      plugins: [
        { plugin: 'a', surface: '', surfaceVersion: '', callableApis_total: 10, callableApis_covered: 8, coverage_pct: 80, ruleCount: 1, uncovered_examples: [], notes: '' },
        { plugin: 'b', surface: '', surfaceVersion: '', callableApis_total: 10, callableApis_covered: 6, coverage_pct: 60, ruleCount: 1, uncovered_examples: [], notes: '' },
        { plugin: 'c', surface: '', surfaceVersion: '', callableApis_total: 10, callableApis_covered: 4, coverage_pct: 40, ruleCount: 1, uncovered_examples: [], notes: '' },
      ],
    };
    const s = apiRecomputeSummary(m as any);
    expect(s.aggregateCoverage_pct).toBe(60); // (80+60+40)/3
    expect(s.pluginsAtOrAboveFloor).toBe(2);
    expect(s.pluginsBelowFloor).toBe(1);
  });
});

// =========================================
// check-per-rule-budget.ts
// =========================================

describe('check-per-rule-budget: extractMeasurements', () => {
  it('flattens a nested JSON and extracts ruleId + p50/p95', () => {
    const out = extractMeasurements({
      runs: [
        { ruleId: 'foo/a', p50_ms: 30, p95_ms: 120 },
        { id: 'foo/b', p50: 50, p95: 200 },
        { rule: 'foo/c', median_ms: 25 },
        { irrelevant: true },
      ],
    });
    expect(out).toHaveLength(3);
    expect(out.find((x) => x.ruleId === 'foo/a')).toEqual({ ruleId: 'foo/a', p50_ms: 30, p95_ms: 120 });
    expect(out.find((x) => x.ruleId === 'foo/b')).toEqual({ ruleId: 'foo/b', p50_ms: 50, p95_ms: 200 });
    expect(out.find((x) => x.ruleId === 'foo/c')).toEqual({ ruleId: 'foo/c', p50_ms: 25, p95_ms: undefined });
  });

  it('deduplicates rule ids across the tree', () => {
    const out = extractMeasurements({
      branch1: { ruleId: 'dup', p50_ms: 10 },
      branch2: { ruleId: 'dup', p50_ms: 20 },
    });
    expect(out).toHaveLength(1);
    expect(out[0].p50_ms).toBe(10);
  });
});

describe('check-per-rule-budget: evaluateBudget', () => {
  const budget = {
    policy: { p50_default_ms: 50, p95_default_ms: 250, p95_hard_ceiling_ms: 1000, tolerance_pct: 10 },
    rules: {
      'foo/a': { p50_ms: 50, p95_ms: 200 },
    },
    lastValidated: '',
    source: '',
  };

  it('returns ok when measurement is within budget', () => {
    const r = evaluateBudget(budget as any, [{ ruleId: 'foo/a', p50_ms: 40, p95_ms: 180 }]);
    expect(r[0].status).toBe('ok');
  });

  it('returns ok when measurement is within tolerance', () => {
    // budget=200, tolerance 10% → ≤ 220 still ok
    const r = evaluateBudget(budget as any, [{ ruleId: 'foo/a', p50_ms: 40, p95_ms: 219 }]);
    expect(r[0].status).toBe('ok');
  });

  it('flags p95 over budget+tolerance', () => {
    const r = evaluateBudget(budget as any, [{ ruleId: 'foo/a', p50_ms: 40, p95_ms: 300 }]);
    expect(r[0].status).toBe('over_p95');
  });

  it('flags p95 over hard ceiling regardless of per-rule budget', () => {
    const wide = {
      policy: { p50_default_ms: 50, p95_default_ms: 250, p95_hard_ceiling_ms: 1000, tolerance_pct: 10 },
      rules: { 'foo/a': { p50_ms: 50, p95_ms: 5000 } },
      lastValidated: '',
      source: '',
    };
    const r = evaluateBudget(wide as any, [{ ruleId: 'foo/a', p50_ms: 40, p95_ms: 2000 }]);
    expect(r[0].status).toBe('over_hard_ceiling');
  });

  it('flags p50 over budget', () => {
    const r = evaluateBudget(budget as any, [{ ruleId: 'foo/a', p50_ms: 100, p95_ms: 180 }]);
    expect(r[0].status).toBe('over_p50');
  });

  it('marks rules with no measurement', () => {
    const r = evaluateBudget(budget as any, []);
    expect(r[0].status).toBe('no_measurement');
  });
});

describe('check-per-rule-budget: findLatestFlagshipResult', () => {
  it('returns null for missing directories', () => {
    expect(findLatestFlagshipResult('/nonexistent/path/that/never/exists')).toBeNull();
  });
});

// =========================================
// check-audit-freshness.ts
// =========================================

describe('check-audit-freshness: checkArtifact', () => {
  const mkTmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'audit-fresh-'));
  const NOW = new Date('2026-05-20T00:00:00Z').getTime();
  const day = 24 * 60 * 60 * 1000;

  it('returns missing for a path that does not exist', () => {
    const root = mkTmp();
    const r = checkArtifact(
      { label: 'X', path: 'no-such-file.json', anchorKey: 'asOf', ttlDays: 30, refreshCmd: 'x' },
      root,
      NOW,
    );
    expect(r.status).toBe('missing');
    expect(r.ageDays).toBeNull();
  });

  it('returns fresh when anchor is within TTL', () => {
    const root = mkTmp();
    fs.writeFileSync(path.join(root, 'a.json'), JSON.stringify({ asOf: '2026-05-15' }));
    const r = checkArtifact(
      { label: 'X', path: 'a.json', anchorKey: 'asOf', ttlDays: 30, refreshCmd: 'x' },
      root,
      NOW,
    );
    expect(r.status).toBe('fresh');
    expect(r.ageDays).toBe(5);
  });

  it('returns stale when anchor is past TTL', () => {
    const root = mkTmp();
    fs.writeFileSync(path.join(root, 'a.json'), JSON.stringify({ asOf: '2025-01-01' }));
    const r = checkArtifact(
      { label: 'X', path: 'a.json', anchorKey: 'asOf', ttlDays: 30, refreshCmd: 'x' },
      root,
      NOW,
    );
    expect(r.status).toBe('stale');
    expect(r.ageDays).toBeGreaterThan(30);
  });

  it('walks dotted anchorKey paths', () => {
    const root = mkTmp();
    fs.writeFileSync(
      path.join(root, 'a.json'),
      JSON.stringify({ summary: { asOf: '2026-05-15' } }),
    );
    const r = checkArtifact(
      { label: 'X', path: 'a.json', anchorKey: 'summary.asOf', ttlDays: 30, refreshCmd: 'x' },
      root,
      NOW,
    );
    expect(r.status).toBe('fresh');
    expect(r.anchor).toBe('2026-05-15');
  });

  it('falls back to mtime when JSON has no anchor', () => {
    const root = mkTmp();
    fs.writeFileSync(path.join(root, 'a.json'), JSON.stringify({}));
    // Backdate the file by setting mtime to 5 days ago.
    const fiveAgo = new Date(NOW - 5 * day);
    fs.utimesSync(path.join(root, 'a.json'), fiveAgo, fiveAgo);
    const r = checkArtifact(
      { label: 'X', path: 'a.json', anchorKey: 'asOf', ttlDays: 30, refreshCmd: 'x' },
      root,
      NOW,
    );
    expect(r.status).toBe('fresh');
    expect(r.anchor).toMatch(/mtime:/);
  });

  it('flags invalid anchor strings as no-anchor', () => {
    const root = mkTmp();
    fs.writeFileSync(path.join(root, 'a.json'), JSON.stringify({ asOf: 'not-a-date' }));
    const r = checkArtifact(
      { label: 'X', path: 'a.json', anchorKey: 'asOf', ttlDays: 30, refreshCmd: 'x' },
      root,
      NOW,
    );
    expect(r.status).toBe('no-anchor');
  });
});

// =========================================
// audit-stock-corpus-overlap.ts
// =========================================

describe('audit-stock-corpus-overlap', () => {
  /**
   * Build a fixture oxc-checkout tree:
   *   <root>/crates/oxc_linter/src/rules/<ns>/<rule>.rs
   * with a `mod.rs` we expect the walker to ignore.
   */
  function mkOxcFixture(spec: Record<string, string[]>): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'oxc-fixture-'));
    const base = path.join(root, 'crates', 'oxc_linter', 'src', 'rules');
    fs.mkdirSync(base, { recursive: true });
    for (const [ns, rules] of Object.entries(spec)) {
      const nsDir = path.join(base, ns);
      fs.mkdirSync(nsDir, { recursive: true });
      fs.writeFileSync(path.join(nsDir, 'mod.rs'), '// fixture mod');
      for (const r of rules) {
        fs.writeFileSync(path.join(nsDir, `${r}.rs`), '// fixture rule');
      }
    }
    return root;
  }

  describe('readOxlintRules', () => {
    it('walks the rules tree and excludes mod.rs', () => {
      const root = mkOxcFixture({
        eslint: ['no_eval', 'no_debugger'],
        unicorn: ['filename_case'],
      });
      const ns = readOxlintRules(root);
      expect(ns).toHaveLength(2);
      const eslint = ns.find((n) => n.namespace === 'eslint')!;
      expect(eslint.ruleCount).toBe(2);
      // Filenames `no_eval.rs` are converted to slug `no-eval`.
      expect(eslint.rules).toEqual(['no-debugger', 'no-eval']);
      const unicorn = ns.find((n) => n.namespace === 'unicorn')!;
      expect(unicorn.rules).toEqual(['filename-case']);
    });

    it('returns namespaces sorted', () => {
      const root = mkOxcFixture({ zebra: ['a'], alpha: ['b'] });
      const ns = readOxlintRules(root);
      expect(ns.map((n) => n.namespace)).toEqual(['alpha', 'zebra']);
    });

    it('throws a clear error when rules dir is missing', () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'no-oxc-'));
      expect(() => readOxlintRules(root)).toThrow(/rules dir not found/);
    });
  });

  describe('bareSlug', () => {
    it('strips a leading scope prefix', () => {
      expect(bareSlug('conventions/filename-case')).toBe('filename-case');
    });
    it('passes through bare slugs', () => {
      expect(bareSlug('no-eval')).toBe('no-eval');
    });
    it('only strips the first slash', () => {
      // The manifest uses single-slash scopes; defensive against future malformed entries.
      expect(bareSlug('a/b/c')).toBe('b/c');
    });
  });

  describe('computeOverlap', () => {
    const ourManifest = {
      plugins: [
        {
          package: 'eslint-plugin-security',
          short: 'security',
          ruleCount: 2,
          rules: [{ name: 'no-eval' }, { name: 'security/custom-rule' }],
        },
        {
          package: 'eslint-plugin-react-a11y',
          short: 'react-a11y',
          ruleCount: 2,
          rules: [{ name: 'alt-text' }, { name: 'aria-role' }],
        },
      ],
    };
    const oxlintNs = [
      { namespace: 'eslint', ruleCount: 2, rules: ['no-eval', 'no-debugger'] },
      { namespace: 'jsx_a11y', ruleCount: 1, rules: ['alt-text'] },
      { namespace: 'unicorn', ruleCount: 1, rules: ['filename-case'] },
    ];

    it('counts the exact-slug intersection', () => {
      const r = computeOverlap(oxlintNs, ourManifest as any);
      expect(r.slugCount).toBe(2);
      expect(r.slugs).toEqual(['alt-text', 'no-eval']);
    });

    it('groups overlap by our plugin', () => {
      const r = computeOverlap(oxlintNs, ourManifest as any);
      expect(r.byOurPlugin).toEqual([
        { plugin: 'eslint-plugin-react-a11y', overlappingSlugs: ['alt-text'] },
        { plugin: 'eslint-plugin-security', overlappingSlugs: ['no-eval'] },
      ]);
    });

    it('groups overlap by Oxlint namespace', () => {
      const r = computeOverlap(oxlintNs, ourManifest as any);
      expect(r.byOxlintNamespace).toEqual([
        { namespace: 'eslint', overlappingSlugs: ['no-eval'] },
        { namespace: 'jsx_a11y', overlappingSlugs: ['alt-text'] },
      ]);
    });

    it('reports our unique slug count after scope-stripping', () => {
      // Manifest rules: no-eval, security/custom-rule, alt-text, aria-role
      // → slugs after bareSlug: no-eval, custom-rule, alt-text, aria-role → 4 unique.
      const r = computeOverlap(oxlintNs, ourManifest as any);
      expect(r.ourUniqueSlugs).toBe(4);
    });

    it('treats no overlap correctly', () => {
      const r = computeOverlap(
        [{ namespace: 'eslint', ruleCount: 1, rules: ['no-debugger'] }],
        ourManifest as any,
      );
      expect(r.slugCount).toBe(0);
      expect(r.byOurPlugin).toEqual([]);
      expect(r.byOxlintNamespace).toEqual([]);
    });
  });

  describe('diffAgainstPrevious', () => {
    const base = {
      generatedAt: '',
      oxc: { path: '', commit: '', namespaceCount: 2, totalRuleFiles: 5, uniqueSlugs: 5, namespaces: [
        { namespace: 'eslint', ruleCount: 3, rules: ['a', 'b', 'c'] },
        { namespace: 'unicorn', ruleCount: 2, rules: ['x', 'y'] },
      ] },
      ours: { manifestPath: '', pluginCount: 1, totalRules: 0, uniqueSlugs: 0 },
      overlap: { slugCount: 1, slugs: ['a'], byOurPlugin: [], byOxlintNamespace: [] },
    } as any;

    it('returns null when no previous snapshot', () => {
      expect(diffAgainstPrevious(base, null)).toBeNull();
    });

    it('detects added overlap slugs (the duplicate-growth signal)', () => {
      const fresh = JSON.parse(JSON.stringify(base));
      fresh.overlap.slugs = ['a', 'new-dup'];
      fresh.overlap.slugCount = 2;
      const d = diffAgainstPrevious(fresh, base)!;
      expect(d.newSlugs).toEqual(['new-dup']);
      expect(d.removedSlugs).toEqual([]);
    });

    it('detects removed overlap slugs', () => {
      const fresh = JSON.parse(JSON.stringify(base));
      fresh.overlap.slugs = [];
      fresh.overlap.slugCount = 0;
      const d = diffAgainstPrevious(fresh, base)!;
      expect(d.removedSlugs).toEqual(['a']);
      expect(d.newSlugs).toEqual([]);
    });

    it('detects per-namespace rule-count deltas', () => {
      const fresh = JSON.parse(JSON.stringify(base));
      fresh.oxc.namespaces[0].ruleCount = 5; // eslint grew from 3 → 5
      fresh.oxc.totalRuleFiles = 7;
      const d = diffAgainstPrevious(fresh, base)!;
      expect(d.ruleCountChange).toBe(2);
      expect(d.perNamespaceChanges).toEqual([
        { namespace: 'eslint', before: 3, after: 5, delta: 2 },
      ]);
    });

    it('detects new and removed namespaces (delta from 0)', () => {
      const fresh = JSON.parse(JSON.stringify(base));
      fresh.oxc.namespaces.push({ namespace: 'vue', ruleCount: 4, rules: [] });
      fresh.oxc.namespaceCount = 3;
      const d = diffAgainstPrevious(fresh, base)!;
      expect(d.namespaceCountChange).toBe(1);
      expect(d.perNamespaceChanges.find((p) => p.namespace === 'vue')).toEqual({
        namespace: 'vue',
        before: 0,
        after: 4,
        delta: 4,
      });
    });
  });
});
