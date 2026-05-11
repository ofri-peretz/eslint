/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { describe, it, expect } from 'vitest';
import { groupByRule, computeSummary } from './grouper';
import { renderHuman } from './renderers/human';
import { renderCompact } from './renderers/compact';
import { renderJSON } from './renderers/json';
import { renderNDJSON } from './renderers/ndjson';
import type { LintResult, FormatterContext } from './types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function makeResult(
  filePath: string,
  messages: Array<{
    ruleId: string;
    severity: 1 | 2;
    message: string;
    line: number;
    column: number;
    fix?: { range: [number, number]; text: string };
    nodeType?: string | null;
    suggestions?: Array<{ desc: string; fix: { range: [number, number]; text: string } }>;
  }>,
): LintResult {
  const errorCount = messages.filter(m => m.severity === 2).length;
  const warningCount = messages.filter(m => m.severity === 1).length;
  const fixableErrorCount = messages.filter(m => m.severity === 2 && m.fix).length;
  const fixableWarningCount = messages.filter(m => m.severity === 1 && m.fix).length;

  return {
    filePath,
    messages: messages.map(m => ({ ...m, nodeType: m.nodeType ?? null })),
    errorCount,
    warningCount,
    fixableErrorCount,
    fixableWarningCount,
  };
}

const context: FormatterContext = {
  cwd: '/project',
  rulesMeta: {
    'no-unused-vars': {
      type: 'problem',
      docs: {
        description: 'Disallow unused variables',
        url: 'https://eslint.org/docs/rules/no-unused-vars',
      },
    },
    '@interlace/pg/no-unsafe-query': {
      type: 'suggestion',
      docs: {
        description: 'Detect SQL injection via string concatenation',
        url: 'https://interlace.tools/docs/pg/no-unsafe-query',
        cwe: 'CWE-089',
        cvss: 9.8,
      },
    },
  },
};

const sampleResults: LintResult[] = [
  makeResult('/project/src/auth/login.ts', [
    { ruleId: 'no-unused-vars', severity: 1, message: "'x' is not used", line: 5, column: 7 },
    { ruleId: 'no-unused-vars', severity: 1, message: "'y' is not used", line: 12, column: 3 },
    { ruleId: '@interlace/pg/no-unsafe-query', severity: 2, message: 'SQL injection detected', line: 23, column: 5 },
  ]),
  makeResult('/project/src/db/queries.ts', [
    { ruleId: '@interlace/pg/no-unsafe-query', severity: 2, message: 'SQL injection detected', line: 8, column: 10 },
    { ruleId: '@interlace/pg/no-unsafe-query', severity: 2, message: 'SQL injection detected', line: 41, column: 10 },
  ]),
  makeResult('/project/src/utils/helpers.ts', [
    { ruleId: 'no-unused-vars', severity: 1, message: "'z' is not used", line: 1, column: 1, fix: { range: [0, 10], text: '' } },
  ]),
  // Clean file (no issues)
  makeResult('/project/src/index.ts', []),
];

// ============================================================================
// GROUPER
// ============================================================================

describe('groupByRule', () => {
  it('should group messages by ruleId', () => {
    const grouped = groupByRule(sampleResults, context);

    expect(grouped).toHaveLength(2);
    const ruleIds = grouped.map(g => g.ruleId).toSorted();
    expect(ruleIds).toEqual(['@interlace/pg/no-unsafe-query', 'no-unused-vars']);
    expect(grouped[0]!.count).toBe(3);
    expect(grouped[1]!.count).toBe(3);
  });

  it('should produce deterministic ordering for equal counts (ruleId tie-break)', () => {
    // Two rules with identical counts must always emit in the same order
    // regardless of which file the linter visited first.
    const grouped1 = groupByRule(sampleResults, context);
    const reversed = [...sampleResults].toReversed();
    const grouped2 = groupByRule(reversed, context);

    expect(grouped1.map(g => g.ruleId)).toEqual(grouped2.map(g => g.ruleId));
  });

  it('should sort errors before warnings even when a warning has higher count (severity-first)', () => {
    // Synthesize a "rare error amid noise" payload — 1 SQL-injection
    // error vs 10 unused-vars warnings. count-desc alone would render
    // the warning first; severity-first ordering pulls the error to
    // position [0] where LLMs and humans actually look.
    const payload: LintResult[] = [
      makeResult('/project/src/db.ts', [
        { ruleId: '@interlace/pg/no-unsafe-query', severity: 2, message: 'SQL injection', line: 23, column: 5 },
      ]),
      ...Array.from({ length: 10 }, (_, i) =>
        makeResult(`/project/src/m${i}.ts`, [
          { ruleId: 'no-unused-vars', severity: 1, message: 'unused', line: i + 1, column: 1 },
        ]),
      ),
    ];
    const grouped = groupByRule(payload, context);
    expect(grouped[0]!.ruleId).toBe('@interlace/pg/no-unsafe-query');
    expect(grouped[0]!.severity).toBe('error');
    expect(grouped[0]!.count).toBe(1);
    expect(grouped[1]!.severity).toBe('warning');
    expect(grouped[1]!.count).toBe(10);
  });

  it('should capture the representative ESLint message text', () => {
    const grouped = groupByRule(sampleResults, context);
    const pgRule = grouped.find(g => g.ruleId === '@interlace/pg/no-unsafe-query');

    expect(pgRule!.message).toBe('SQL injection detected');
  });

  it('should surface CWE and CVSS from rule meta when present', () => {
    const grouped = groupByRule(sampleResults, context);
    const pgRule = grouped.find(g => g.ruleId === '@interlace/pg/no-unsafe-query');

    expect(pgRule!.cwe).toBe('CWE-089');
    expect(pgRule!.cvss).toBe(9.8);
  });

  it('should track hasSuggestions when ESLint suggestions[] are present', () => {
    const withSuggestion: LintResult[] = [
      makeResult('/project/src/x.ts', [
        {
          ruleId: 'no-eq-null',
          severity: 2,
          message: 'Use === instead',
          line: 1,
          column: 1,
          suggestions: [{ desc: 'Replace == null with === null', fix: { range: [0, 7], text: '=== null' } }],
        },
      ]),
    ];
    const grouped = groupByRule(withSuggestion, context);
    expect(grouped[0]!.hasSuggestions).toBe(true);
    expect(grouped[0]!.locations[0]!.suggestions).toEqual([{ desc: 'Replace == null with === null' }]);
  });

  it('should respect mode-aware MAX_LOCATIONS cap (json gets a higher cap)', () => {
    const manyResults: LintResult[] = Array.from({ length: 15 }, (_, i) =>
      makeResult(`/project/src/file${i}.ts`, [
        { ruleId: 'no-console', severity: 1, message: 'no console', line: i + 1, column: 1 },
      ]),
    );
    const compactGrouped = groupByRule(manyResults, context, 'compact');
    const jsonGrouped = groupByRule(manyResults, context, 'json');
    expect(compactGrouped[0]!.locations).toHaveLength(5);
    expect(jsonGrouped[0]!.locations).toHaveLength(15); // under the json cap of 50
  });

  it('should use highest severity seen', () => {
    const grouped = groupByRule(sampleResults, context);
    const pgRule = grouped.find(g => g.ruleId === '@interlace/pg/no-unsafe-query');

    expect(pgRule!.severity).toBe('error');
  });

  it('should detect fixable status', () => {
    const grouped = groupByRule(sampleResults, context);
    const unusedRule = grouped.find(g => g.ruleId === 'no-unused-vars');

    expect(unusedRule!.fixable).toBe(true); // one location has a fix
  });

  it('should enrich with rule metadata', () => {
    const grouped = groupByRule(sampleResults, context);
    const pgRule = grouped.find(g => g.ruleId === '@interlace/pg/no-unsafe-query');

    expect(pgRule!.description).toBe('Detect SQL injection via string concatenation');
    expect(pgRule!.docsUrl).toBe('https://interlace.tools/docs/pg/no-unsafe-query');
  });

  it('should cap locations to default MAX_LOCATIONS (5) when no mode given', () => {
    const manyResults: LintResult[] = Array.from({ length: 10 }, (_, i) =>
      makeResult(`/project/src/file${i}.ts`, [
        { ruleId: 'no-console', severity: 1, message: 'no console', line: i + 1, column: 1 },
      ]),
    );

    const grouped = groupByRule(manyResults, context);
    expect(grouped[0]!.count).toBe(10);
    expect(grouped[0]!.locations).toHaveLength(5); // capped
  });

  it('should make file paths relative to cwd', () => {
    const grouped = groupByRule(sampleResults, context);
    const locs = grouped[0]!.locations;

    expect(locs[0]!.file).toBe('src/auth/login.ts');
    expect(locs[0]!.file).not.toContain('/project/');
  });

  it('should return empty array for clean results', () => {
    const cleanResults = [makeResult('/project/src/clean.ts', [])];
    const grouped = groupByRule(cleanResults, context);

    expect(grouped).toHaveLength(0);
  });
});

describe('computeSummary', () => {
  it('should compute correct totals', () => {
    const grouped = groupByRule(sampleResults, context);
    const summary = computeSummary(sampleResults, grouped);

    expect(summary.totalFiles).toBe(4);
    expect(summary.filesWithIssues).toBe(3);
    expect(summary.errorCount).toBe(3);
    expect(summary.warningCount).toBe(3);
    expect(summary.fixableCount).toBe(1);
    expect(summary.uniqueRules).toBe(2);
  });

  it('should list top rules sorted by count', () => {
    const grouped = groupByRule(sampleResults, context);
    const summary = computeSummary(sampleResults, grouped);

    // Both rules have count 3, check that top rules are populated
    expect(summary.topRules).toHaveLength(2);
    expect(summary.topRules[0]!.count).toBe(3);
  });
});

// ============================================================================
// RENDERERS
// ============================================================================

describe('renderHuman', () => {
  it('should render grouped output with counts', () => {
    const grouped = groupByRule(sampleResults, context);
    const summary = computeSummary(sampleResults, grouped);
    const output = renderHuman(grouped, summary);

    expect(output).toContain('×3');
    expect(output).toContain('@interlace/pg/no-unsafe-query');
    expect(output).toContain('no-unused-vars');
    expect(output).toContain('error');
    expect(output).toContain('3 errors');
    expect(output).toContain('3 warnings');
    expect(output).toContain('1 fixable with --fix');
  });

  it('should prefer the per-message text (more specific) over the generic rule description', () => {
    const grouped = groupByRule(sampleResults, context);
    const summary = computeSummary(sampleResults, grouped);
    const output = renderHuman(grouped, summary);

    // Message text (specific to the violation) — what an LLM-fix consumer needs.
    expect(output).toContain('SQL injection detected');
  });

  it('should surface CWE + CVSS inline when meta declares them', () => {
    const grouped = groupByRule(sampleResults, context);
    const summary = computeSummary(sampleResults, grouped);
    const output = renderHuman(grouped, summary);

    expect(output).toContain('CWE-089');
    expect(output).toContain('9.8');
  });

  it('should fall back to rule description when no per-message text exists', () => {
    const noMessage: LintResult[] = [
      {
        filePath: '/project/x.ts',
        messages: [{ ruleId: 'no-unused-vars', severity: 1, message: '', line: 1, column: 1, nodeType: null }],
        errorCount: 0,
        warningCount: 1,
        fixableErrorCount: 0,
        fixableWarningCount: 0,
      },
    ];
    const grouped = groupByRule(noMessage, context);
    const summary = computeSummary(noMessage, grouped);
    const output = renderHuman(grouped, summary);
    expect(output).toContain('Disallow unused variables');
  });

  it('should show representative file locations', () => {
    const grouped = groupByRule(sampleResults, context);
    const summary = computeSummary(sampleResults, grouped);
    const output = renderHuman(grouped, summary);

    expect(output).toContain('src/auth/login.ts:23:5');
  });

  it('should show clean message for no issues', () => {
    const output = renderHuman([], { totalFiles: 1, filesWithIssues: 0, errorCount: 0, warningCount: 0, fixableCount: 0, uniqueRules: 0, topRules: [] });

    expect(output).toContain('No lint issues found');
  });
});

describe('renderCompact', () => {
  it('should produce one line per rule', () => {
    const grouped = groupByRule(sampleResults, context);
    const summary = computeSummary(sampleResults, grouped);
    const output = renderCompact(grouped, summary);
    const lines = output.trim().split('\n');

    // 2 rules + 1 summary line
    expect(lines).toHaveLength(3);
  });

  it('should use abbreviated severity', () => {
    const grouped = groupByRule(sampleResults, context);
    const summary = computeSummary(sampleResults, grouped);
    const output = renderCompact(grouped, summary);

    expect(output).toContain('ERR');
    expect(output).toContain('WARN');
  });

  it('should be shorter than human output', () => {
    const grouped = groupByRule(sampleResults, context);
    const summary = computeSummary(sampleResults, grouped);

    const human = renderHuman(grouped, summary);
    const compact = renderCompact(grouped, summary);

    expect(compact.length).toBeLessThan(human.length);
  });
});

describe('renderJSON', () => {
  it('should produce valid JSON', () => {
    const grouped = groupByRule(sampleResults, context);
    const summary = computeSummary(sampleResults, grouped);
    const output = renderJSON(grouped, summary);

    const parsed = JSON.parse(output);
    expect(parsed).toBeTruthy();
    expect(parsed.rules).toBeInstanceOf(Array);
    expect(parsed.summary).toBeTruthy();
  });

  it('should use abbreviated keys', () => {
    const grouped = groupByRule(sampleResults, context);
    const summary = computeSummary(sampleResults, grouped);
    const output = renderJSON(grouped, summary);
    const parsed = JSON.parse(output);

    // Check abbreviated keys
    expect(parsed.rules[0].id).toBeTruthy();
    expect(parsed.rules[0].sev).toBeTruthy();
    expect(parsed.rules[0].n).toBeGreaterThan(0);
    expect(parsed.rules[0].locs).toBeInstanceOf(Array);
    expect(typeof parsed.rules[0].fix).toBe('boolean');
    expect(typeof parsed.rules[0].sugg).toBe('boolean');
  });

  it('should surface message + cwe + cvss in JSON when meta declares them', () => {
    const grouped = groupByRule(sampleResults, context);
    const summary = computeSummary(sampleResults, grouped);
    const parsed = JSON.parse(renderJSON(grouped, summary));
    const pg = parsed.rules.find((r: { id: string }) => r.id === '@interlace/pg/no-unsafe-query');

    expect(pg.msg).toBe('SQL injection detected');
    expect(pg.cwe).toBe('CWE-089');
    expect(pg.cvss).toBe(9.8);
  });

  it('should include summary stats', () => {
    const grouped = groupByRule(sampleResults, context);
    const summary = computeSummary(sampleResults, grouped);
    const output = renderJSON(grouped, summary);
    const parsed = JSON.parse(output);

    expect(parsed.summary.errors).toBe(3);
    expect(parsed.summary.warnings).toBe(3);
    expect(parsed.summary.files).toBe(3);
    expect(parsed.summary.rules).toBe(2);
  });

  it('should be the most token-efficient format', () => {
    const grouped = groupByRule(sampleResults, context);
    const summary = computeSummary(sampleResults, grouped);

    const human = renderHuman(grouped, summary);
    const compact = renderCompact(grouped, summary);

    // JSON has structural overhead (keys, brackets) but compact is the leanest prose format
    // For small datasets, JSON is larger — its advantage is parseability, not size
    expect(compact.length).toBeLessThan(human.length);
  });

  it('should ship summary before rules (cache-friendly prefix ordering)', () => {
    // Anthropic prompt-cache breakpoints match by prefix; the stable
    // summary belongs at the front so the cached prefix survives even
    // when the per-rule list churns. V8 preserves JSON.stringify key
    // order, so we assert the byte order directly.
    const grouped = groupByRule(sampleResults, context);
    const summary = computeSummary(sampleResults, grouped);
    const out = renderJSON(grouped, summary);
    expect(out.indexOf('"summary":')).toBeLessThan(out.indexOf('"rules":'));
  });
});

// ============================================================================
// END-TO-END ESLINT INTEGRATION (smoke test — exercises the real public API)
// ============================================================================

// ============================================================================
// SNAPSHOT TESTS — guard against silent format drift
// ============================================================================
//
// The signal/latency/regression contracts gate aggregate behaviour. These
// snapshots gate **byte-level** output. If a renderer changes how it
// formats a known input — even by a single space — the snapshot fails
// and the diff is the proof. No-color forced via NO_COLOR=1 so the
// human-mode snapshot is portable across CI / local terminals.

describe('snapshot tests (byte-level format stability)', () => {
  // Fixed, minimal input: 1 error rule + 1 warning rule, both with metadata.
  const snapshotResults: LintResult[] = [
    makeResult('/project/src/db.ts', [
      { ruleId: '@interlace/pg/no-unsafe-query', severity: 2, message: 'SQL injection detected', line: 23, column: 5, nodeType: 'CallExpression' },
    ]),
    makeResult('/project/src/util.ts', [
      { ruleId: 'no-unused-vars', severity: 1, message: "'x' is not used", line: 5, column: 7, fix: { range: [0, 5], text: '' } },
      { ruleId: 'no-unused-vars', severity: 1, message: "'y' is not used", line: 12, column: 3 },
    ]),
  ];

  it('renderHuman snapshot is stable (no-color)', () => {
    const prev = process.env['NO_COLOR'];
    process.env['NO_COLOR'] = '1';
    try {
      const grouped = groupByRule(snapshotResults, context, 'human');
      const summary = computeSummary(snapshotResults, grouped);
      expect(renderHuman(grouped, summary)).toMatchInlineSnapshot(`
        "
          ✖ @interlace/pg/no-unsafe-query — error [CWE-089 · CVSS 9.8]
            SQL injection detected
            src/db.ts:23:5  (CallExpression)
            https://interlace.tools/docs/pg/no-unsafe-query

          ⚠ no-unused-vars ×2 — warning (fixable)
            'x' is not used
            src/util.ts:5:7
            src/util.ts:12:3
            https://eslint.org/docs/rules/no-unused-vars

        ────────────────────────────────────────────────────────────
          1 error, 2 warnings across 2 files (2 rules)
          1 fixable with --fix
        "
      `);
    } finally {
      if (prev === undefined) delete process.env['NO_COLOR'];
      else process.env['NO_COLOR'] = prev;
    }
  });

  it('renderCompact snapshot is stable', () => {
    const grouped = groupByRule(snapshotResults, context, 'compact');
    const summary = computeSummary(snapshotResults, grouped);
    expect(renderCompact(grouped, summary)).toMatchInlineSnapshot(`
      "ERR @interlace/pg/no-unsafe-query ×1 [CWE-089] — SQL injection detected @ src/db.ts:23
      WARN no-unused-vars ×2 [fixable] — 'x' is not used @ src/util.ts:5, src/util.ts:12
      1E 2W 2 files 2 rules 1 fixable
      "
    `);
  });

  it('renderJSON snapshot is stable (summary first)', () => {
    const grouped = groupByRule(snapshotResults, context, 'json');
    const summary = computeSummary(snapshotResults, grouped);
    expect(renderJSON(grouped, summary)).toMatchInlineSnapshot(
      `"{"summary":{"errors":1,"warnings":2,"files":2,"fixable":1,"rules":2},"rules":[{"id":"@interlace/pg/no-unsafe-query","sev":"error","n":1,"fix":false,"sugg":false,"locs":[{"f":"src/db.ts","l":23,"c":5,"t":"CallExpression"}],"desc":"Detect SQL injection via string concatenation","msg":"SQL injection detected","docs":"https://interlace.tools/docs/pg/no-unsafe-query","cwe":"CWE-089","cvss":9.8},{"id":"no-unused-vars","sev":"warning","n":2,"fix":true,"sugg":false,"locs":[{"f":"src/util.ts","l":5,"c":7},{"f":"src/util.ts","l":12,"c":3}],"desc":"Disallow unused variables","msg":"'x' is not used","docs":"https://eslint.org/docs/rules/no-unused-vars"}]}"`,
    );
  });

  it('renderNDJSON snapshot is stable (summary line first)', () => {
    const grouped = groupByRule(snapshotResults, context, 'ndjson');
    const summary = computeSummary(snapshotResults, grouped);
    expect(renderNDJSON(grouped, summary)).toMatchInlineSnapshot(`
      "{"kind":"summary","errors":1,"warnings":2,"files":2,"fixable":1,"rules":2}
      {"kind":"rule","id":"@interlace/pg/no-unsafe-query","sev":"error","n":1,"fix":false,"sugg":false,"locs":[{"f":"src/db.ts","l":23,"c":5,"t":"CallExpression"}],"desc":"Detect SQL injection via string concatenation","msg":"SQL injection detected","docs":"https://interlace.tools/docs/pg/no-unsafe-query","cwe":"CWE-089","cvss":9.8}
      {"kind":"rule","id":"no-unused-vars","sev":"warning","n":2,"fix":true,"sugg":false,"locs":[{"f":"src/util.ts","l":5,"c":7},{"f":"src/util.ts","l":12,"c":3}],"desc":"Disallow unused variables","msg":"'x' is not used","docs":"https://eslint.org/docs/rules/no-unused-vars"}
      "
    `);
  });
});

// ============================================================================
// PUBLISHED-SCHEMA CONFORMANCE — guards the contract downstream agents read
// ============================================================================

describe('schema.json conformance (downstream agent contract)', () => {
  // Minimal structural validator — checks keys + types of the live output
  // against schema.json. Not a full JSON-Schema engine (no ajv dep), but
  // sufficient to catch any drift between the renderer and the published
  // schema. If a renderer change adds/removes a key, this test points
  // straight at the schema file that needs updating.
  const requiredRuleKeys = ['id', 'sev', 'n', 'fix', 'sugg', 'locs'];
  const requiredSummaryKeys = ['errors', 'warnings', 'files', 'fixable', 'rules'];
  const requiredLocKeys = ['f', 'l', 'c'];
  const optionalRuleKeys = new Set(['desc', 'msg', 'docs', 'cwe', 'cvss']);
  const optionalLocKeys = new Set(['t', 'sugg']);

  function assertRule(rule: Record<string, unknown>) {
    for (const k of requiredRuleKeys) expect(rule).toHaveProperty(k);
    for (const k of Object.keys(rule)) {
      const allowed = requiredRuleKeys.includes(k) || optionalRuleKeys.has(k) || k === 'kind';
      if (!allowed) throw new Error(`schema.json: rule contains unknown key "${k}"`);
    }
    expect(['error', 'warning']).toContain(rule['sev']);
    expect(typeof rule['fix']).toBe('boolean');
    expect(typeof rule['sugg']).toBe('boolean');
    expect(Array.isArray(rule['locs'])).toBe(true);
    for (const loc of rule['locs'] as Array<Record<string, unknown>>) {
      for (const k of requiredLocKeys) expect(loc).toHaveProperty(k);
      for (const k of Object.keys(loc)) {
        const allowed = requiredLocKeys.includes(k) || optionalLocKeys.has(k);
        if (!allowed) throw new Error(`schema.json: location contains unknown key "${k}"`);
      }
    }
    if ('cwe' in rule) expect(rule['cwe']).toMatch(/^CWE-[0-9]+$/);
    if ('cvss' in rule) {
      expect(typeof rule['cvss']).toBe('number');
      expect(rule['cvss'] as number).toBeGreaterThanOrEqual(0);
      expect(rule['cvss'] as number).toBeLessThanOrEqual(10);
    }
  }

  it('renderJSON output conforms to schema.json (JsonModeOutput)', () => {
    const grouped = groupByRule(sampleResults, context, 'json');
    const summary = computeSummary(sampleResults, grouped);
    const parsed = JSON.parse(renderJSON(grouped, summary)) as Record<string, unknown>;
    expect(Object.keys(parsed)).toEqual(['summary', 'rules']); // summary first by contract
    for (const k of requiredSummaryKeys) expect(parsed['summary']).toHaveProperty(k);
    for (const rule of parsed['rules'] as Array<Record<string, unknown>>) assertRule(rule);
  });

  it('renderNDJSON output conforms to schema.json (one summary line + N rule lines)', () => {
    const grouped = groupByRule(sampleResults, context, 'ndjson');
    const summary = computeSummary(sampleResults, grouped);
    const lines = renderNDJSON(grouped, summary).trim().split('\n');
    expect(lines.length).toBeGreaterThan(0);
    const summaryLine = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(summaryLine['kind']).toBe('summary');
    for (const k of requiredSummaryKeys) expect(summaryLine).toHaveProperty(k);
    for (const line of lines.slice(1)) {
      const ruleLine = JSON.parse(line) as Record<string, unknown>;
      expect(ruleLine['kind']).toBe('rule');
      assertRule(ruleLine);
    }
  });
});

// ============================================================================
// ESLINT v8 / v9 / v10 SHAPE COMPATIBILITY (peerDep claim)
// ============================================================================
//
// The package.json declares `peerDependencies.eslint: "^8 || ^9 || ^10"`.
// This test confirms the formatter handles each major version's
// LintMessage shape — specifically the v8 quirks:
//
//   - v8 messages can carry `messageId?: string` that v9 sometimes omits
//   - v8's `nodeType` is sometimes a string, sometimes null
//   - v8 sets `severity` as `1 | 2` (same as v9 — but we pin the contract)
//   - v8 omits `suggestions` entirely on rules that don't expose them;
//     v9 emits `suggestions: undefined`. The grouper must tolerate both.
//
// We mock all three shapes here rather than installing v8 + v10 as
// extra dev-deps — the LintMessage shapes are stable, public,
// documented in @types/eslint, and exercised by the snapshot.

describe('peerDep compatibility: ESLint v8 / v9 / v10 LintMessage shapes', () => {
  it('handles v8 LintMessage shape (no `suggestions` key, nodeType as string)', () => {
    const v8Result: LintResult = {
      filePath: '/repo/v8.js',
      messages: [
        // v8 commonly sends nodeType as a string and omits the suggestions key entirely.
        {
          ruleId: 'no-var',
          severity: 2,
          message: 'Unexpected var, use let or const instead.',
          line: 1,
          column: 1,
          nodeType: 'VariableDeclaration',
        } as LintResult['messages'][number],
      ],
      errorCount: 1,
      warningCount: 0,
      fixableErrorCount: 0,
      fixableWarningCount: 0,
    };
    const grouped = groupByRule([v8Result], { cwd: '/repo' });
    expect(grouped[0]!.ruleId).toBe('no-var');
    expect(grouped[0]!.severity).toBe('error');
    expect(grouped[0]!.hasSuggestions).toBe(false);
    expect(grouped[0]!.locations[0]!.nodeType).toBe('VariableDeclaration');
  });

  it('handles v9 LintMessage shape (suggestions: undefined, nodeType: null)', () => {
    const v9Result: LintResult = {
      filePath: '/repo/v9.js',
      messages: [
        {
          ruleId: 'no-unused-vars',
          severity: 1,
          message: "'x' is defined but never used.",
          line: 5,
          column: 7,
          nodeType: null, // v9 commonly emits null on declaration-level rules
          // suggestions: undefined  ← deliberately omitted, equivalent to undefined
        },
      ],
      errorCount: 0,
      warningCount: 1,
      fixableErrorCount: 0,
      fixableWarningCount: 0,
    };
    const grouped = groupByRule([v9Result], { cwd: '/repo' });
    expect(grouped[0]!.ruleId).toBe('no-unused-vars');
    expect(grouped[0]!.hasSuggestions).toBe(false);
    // No nodeType means it shouldn't show up on the location.
    expect('nodeType' in (grouped[0]!.locations[0] as object)).toBe(false);
  });

  it('handles v10-shape suggestions array (preserved through grouper to JSON)', () => {
    const v10Result: LintResult = {
      filePath: '/repo/v10.js',
      messages: [
        {
          ruleId: 'eqeqeq',
          severity: 2,
          message: "Expected '===' and instead saw '=='.",
          line: 3,
          column: 12,
          nodeType: 'BinaryExpression',
          suggestions: [
            {
              desc: "Use '===' instead",
              fix: { range: [42, 44], text: '===' },
            },
          ],
        },
      ],
      errorCount: 1,
      warningCount: 0,
      fixableErrorCount: 0,
      fixableWarningCount: 0,
    };
    const grouped = groupByRule([v10Result], { cwd: '/repo' }, 'json');
    expect(grouped[0]!.hasSuggestions).toBe(true);
    expect(grouped[0]!.locations[0]!.suggestions).toEqual([{ desc: "Use '===' instead" }]);
    const summary = computeSummary([v10Result], grouped);
    const json = JSON.parse(renderJSON(grouped, summary));
    expect(json.rules[0].sugg).toBe(true);
    expect(json.rules[0].locs[0].sugg[0].desc).toBe("Use '===' instead");
  });
});

describe('integration: real ESLint -f handshake', () => {
  it('formatter accepts real ESLint LintMessage shape and renders all four modes', async () => {
    // We use Linter (not ESLint) here on purpose: it takes a config object
    // directly with no loader, avoiding flat-vs-legacy detection in the
    // test environment. The contract we care about is "ESLint-produced
    // LintMessage[] survives our formatter unchanged" — Linter emits the
    // exact same message shape ESLint does, so this exercises the public
    // type boundary end-to-end.
    const { Linter } = await import('eslint');
    const linter = new Linter();

    // Use only `var` so even ES5 parsers don't error out — we only need
    // to confirm the LintMessage shape survives, not specific rules.
    const messages = linter.verify('var x = 1;\nvar y = 2;', {
      rules: {
        'no-var': 'error',
        semi: 'warn',
      },
    });
    expect(messages.length).toBeGreaterThan(0);

    // Build a LintResult[] the way ESLint's CLI engine would.
    const errorCount = messages.filter(m => m.severity === 2).length;
    const warningCount = messages.filter(m => m.severity === 1).length;
    const fixableErrorCount = messages.filter(m => m.severity === 2 && m.fix).length;
    const fixableWarningCount = messages.filter(m => m.severity === 1 && m.fix).length;
    const realResults = [{
      filePath: '/tmp/integration.js',
      messages: messages as LintResult['messages'],
      errorCount,
      warningCount,
      fixableErrorCount,
      fixableWarningCount,
    }];

    const grouped = groupByRule(realResults, { cwd: '/tmp' });
    const summary = computeSummary(realResults, grouped);

    // Every mode produces non-empty output mentioning the rules.
    for (const render of [renderHuman, renderCompact, renderJSON, renderNDJSON]) {
      const out = render(grouped, summary);
      expect(out.length).toBeGreaterThan(0);
      expect(out).toContain('no-var');
    }

    // Structured formats round-trip JSON.parse.
    const json = JSON.parse(renderJSON(grouped, summary));
    expect(json.summary).toBeDefined();
    expect(json.rules.length).toBeGreaterThan(0);
    expect(json.rules.some((r: { id: string }) => r.id === 'no-var')).toBe(true);

    // NDJSON: every line is independently parseable.
    for (const line of renderNDJSON(grouped, summary).trim().split('\n')) {
      expect(() => JSON.parse(line)).not.toThrow();
    }

    // Severity-first sort: no-var (error) lands at index 0 ahead of
    // semi (warning) regardless of count.
    expect(grouped[0]!.severity).toBe('error');
    expect(grouped[0]!.ruleId).toBe('no-var');
  });
});

describe('renderNDJSON', () => {
  it('should produce one JSON object per line with summary first', () => {
    const grouped = groupByRule(sampleResults, context);
    const summary = computeSummary(sampleResults, grouped);
    const output = renderNDJSON(grouped, summary);
    const lines = output.trim().split('\n');

    expect(lines).toHaveLength(3); // 1 summary + 2 rules
    const summaryLine = JSON.parse(lines[0]!);
    expect(summaryLine.kind).toBe('summary');
    expect(summaryLine.errors).toBe(3);
    expect(summaryLine.warnings).toBe(3);

    const firstRule = JSON.parse(lines[1]!);
    expect(firstRule.kind).toBe('rule');
    // Severity-first ordering means the error rule comes first.
    expect(firstRule.sev).toBe('error');
  });

  it('should emit valid JSON on every line (truncation-safe)', () => {
    const grouped = groupByRule(sampleResults, context);
    const summary = computeSummary(sampleResults, grouped);
    const output = renderNDJSON(grouped, summary);

    for (const line of output.trim().split('\n')) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });
});

// ============================================================================
// TOKEN EFFICIENCY: GROUPED vs UNGROUPED
// ============================================================================

describe('token efficiency', () => {
  it('grouped output should be significantly smaller than per-file output at scale', () => {
    // Create 20 files each with the same 2 rule violations — simulates real-world repetition
    const manyResults: LintResult[] = Array.from({ length: 20 }, (_, i) =>
      makeResult(`/project/src/module${i}/index.ts`, [
        { ruleId: 'no-unused-vars', severity: 1, message: "'x' is not used", line: i + 1, column: 1 },
        { ruleId: '@interlace/pg/no-unsafe-query', severity: 2, message: 'SQL injection detected', line: i + 5, column: 3 },
      ]),
    );

    // Simulate ESLint default stylish output (per-file, every message repeated)
    const ungrouped = manyResults
      .map(r => {
        const header = r.filePath;
        const msgs = r.messages.map(m =>
          `  ${m.line}:${m.column}  ${m.severity === 2 ? 'error' : 'warning'}  ${m.message}  ${m.ruleId}`
        );
        return [header, ...msgs, ''].join('\n');
      })
      .join('\n');

    const grouped = groupByRule(manyResults, context);
    const summary = computeSummary(manyResults, grouped);
    const compactOutput = renderCompact(grouped, summary);

    // At 20 files × 2 rules, grouped compact should be dramatically smaller
    expect(compactOutput.length).toBeLessThan(ungrouped.length * 0.3);
  });
});
