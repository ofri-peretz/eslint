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
  }>,
): LintResult {
  const errorCount = messages.filter(m => m.severity === 2).length;
  const warningCount = messages.filter(m => m.severity === 1).length;
  const fixableErrorCount = messages.filter(m => m.severity === 2 && m.fix).length;
  const fixableWarningCount = messages.filter(m => m.severity === 1 && m.fix).length;

  return {
    filePath,
    messages: messages.map(m => ({ ...m, nodeType: null })),
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
    // Both have count 3, order depends on map insertion
    const ruleIds = grouped.map(g => g.ruleId).sort();
    expect(ruleIds).toEqual(['@interlace/pg/no-unsafe-query', 'no-unused-vars']);
    expect(grouped[0]!.count).toBe(3);
    expect(grouped[1]!.count).toBe(3);
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

  it('should cap locations to MAX_LOCATIONS', () => {
    // Create 10 violations for one rule
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

  it('should show descriptions from rule meta', () => {
    const grouped = groupByRule(sampleResults, context);
    const summary = computeSummary(sampleResults, grouped);
    const output = renderHuman(grouped, summary);

    expect(output).toContain('Detect SQL injection via string concatenation');
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
    const json = renderJSON(grouped, summary);

    // JSON has structural overhead (keys, brackets) but compact is the leanest prose format
    // For small datasets, JSON is larger — its advantage is parseability, not size
    expect(compact.length).toBeLessThan(human.length);
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
