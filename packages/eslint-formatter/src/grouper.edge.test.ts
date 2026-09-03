/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Edge-branch tests for the grouper and the compact/json/ndjson
 * renderers — the residual branches the mainline suite doesn't hit:
 * path-relativization guards, severity upgrades, deferred message
 * capture, metadata chains with partial docs, and optional-field
 * omission in each renderer.
 */

import { describe, it, expect } from 'vitest';
import { groupByRule, computeSummary } from './grouper';
import { renderCompact } from './renderers/compact';
import { renderJSON } from './renderers/json';
import { renderNDJSON } from './renderers/ndjson';
import type { LintResult, FormatterContext, GroupedRule, LintSummary } from './types';

function result(filePath: string, messages: LintResult['messages'], counts?: Partial<LintResult>): LintResult {
  return {
    filePath,
    messages,
    errorCount: messages.filter(m => m.severity === 2).length,
    warningCount: messages.filter(m => m.severity === 1).length,
    fixableErrorCount: 0,
    fixableWarningCount: 0,
    ...counts,
  };
}

function msg(overrides: Partial<LintResult['messages'][number]>): LintResult['messages'][number] {
  return { ruleId: 'r', severity: 2, message: 'boom', line: 1, column: 1, nodeType: null, ...overrides };
}

describe('groupByRule — path relativization guards', () => {
  it('keeps the absolute path when the file lives outside cwd', () => {
    const grouped = groupByRule(
      [result('/elsewhere/lib/x.ts', [msg({})])],
      { cwd: '/project' },
    );
    expect(grouped[0]!.locations[0]!.file).toBe('/elsewhere/lib/x.ts');
  });

  it('falls back to the raw filePath when path.relative throws (non-string filePath)', () => {
    // ESLint always passes strings, but a hand-rolled integration can feed
    // anything — the guard must return the input untouched instead of crashing.
    const bogusPath = 123 as unknown as string;
    const grouped = groupByRule([result(bogusPath, [msg({})])], { cwd: '/project' });
    expect(grouped[0]!.locations[0]!.file).toBe(bogusPath);
  });
});

describe('groupByRule — aggregation upgrades on repeat occurrences', () => {
  it('upgrades severity to error when a later occurrence is more severe', () => {
    const grouped = groupByRule([result('/p/a.ts', [
      msg({ severity: 1, message: 'first (warning)' }),
      msg({ severity: 2, message: 'second (error)' }),
    ])], { cwd: '/p' });
    expect(grouped[0]!.severity).toBe('error');
    expect(grouped[0]!.count).toBe(2);
  });

  it('captures the first non-empty message even when earlier occurrences were empty', () => {
    const grouped = groupByRule([result('/p/a.ts', [
      msg({ message: '' }),
      msg({ message: '' }),
      msg({ message: 'finally, some text' }),
    ])], { cwd: '/p' });
    expect(grouped[0]!.message).toBe('finally, some text');
  });

  it('marks the group fixable when only a later occurrence carries a fix', () => {
    const grouped = groupByRule([result('/p/a.ts', [
      msg({}),
      msg({ line: 2, fix: { range: [0, 1], text: '' } }),
    ])], { cwd: '/p' });
    expect(grouped[0]!.fixable).toBe(true);
  });

  it('marks hasSuggestions when only a later occurrence carries suggestions', () => {
    const grouped = groupByRule([result('/p/a.ts', [
      msg({}),
      msg({ line: 2, suggestions: [{ desc: 'try this', fix: { range: [0, 1], text: 'x' } }] }),
    ])], { cwd: '/p' });
    expect(grouped[0]!.hasSuggestions).toBe(true);
  });
});

describe('groupByRule — partial rule metadata', () => {
  it('skips enrichment when the rule meta exists but has no docs block', () => {
    const context: FormatterContext = { cwd: '/p', rulesMeta: { r: { type: 'problem' } } };
    const grouped = groupByRule([result('/p/a.ts', [msg({})])], context);
    expect(grouped[0]!.description).toBeUndefined();
    expect(grouped[0]!.docsUrl).toBeUndefined();
    expect(grouped[0]!.cwe).toBeUndefined();
    expect(grouped[0]!.cvss).toBeUndefined();
  });

  it('skips enrichment when docs exists but is empty', () => {
    const context: FormatterContext = { cwd: '/p', rulesMeta: { r: { docs: {} } } };
    const grouped = groupByRule([result('/p/a.ts', [msg({})])], context);
    expect(grouped[0]!.description).toBeUndefined();
    expect(grouped[0]!.docsUrl).toBeUndefined();
  });

  it('surfaces cwe without cvss when only cwe is declared', () => {
    const context: FormatterContext = { cwd: '/p', rulesMeta: { r: { docs: { cwe: 'CWE-79' } } } };
    const grouped = groupByRule([result('/p/a.ts', [msg({})])], context);
    expect(grouped[0]!.cwe).toBe('CWE-79');
    expect(grouped[0]!.cvss).toBeUndefined();
  });
});

describe('computeSummary — filesWithIssues counting', () => {
  it('counts an errors-only file via the errorCount side of the OR', () => {
    const results = [result('/p/a.ts', [msg({})])];
    const summary = computeSummary(results, groupByRule(results, { cwd: '/p' }));
    expect(summary.filesWithIssues).toBe(1);
    expect(summary.errorCount).toBe(1);
    expect(summary.warningCount).toBe(0);
  });

  it('caps topRules at 10', () => {
    const results = Array.from({ length: 12 }, (_, i) =>
      result(`/p/f${i}.ts`, [msg({ ruleId: `rule-${String(i).padStart(2, '0')}` })]),
    );
    const grouped = groupByRule(results, { cwd: '/p' });
    const summary = computeSummary(results, grouped);
    expect(summary.uniqueRules).toBe(12);
    expect(summary.topRules).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// Renderer residual branches
// ---------------------------------------------------------------------------

const cleanSummary: LintSummary = {
  totalFiles: 1, filesWithIssues: 0, errorCount: 0, warningCount: 0,
  fixableCount: 0, uniqueRules: 0, topRules: [],
};

function bareRule(overrides: Partial<GroupedRule>): GroupedRule {
  return {
    ruleId: 'bare-rule',
    severity: 'warning',
    count: 1,
    fixable: false,
    hasSuggestions: false,
    locations: [{ file: 'src/a.ts', line: 1, column: 1 }],
    ...overrides,
  };
}

const oneWarnSummary: LintSummary = { ...cleanSummary, filesWithIssues: 1, warningCount: 1, uniqueRules: 1 };

describe('renderCompact — residual branches', () => {
  it('prints the clean message for an empty run', () => {
    expect(renderCompact([], cleanSummary)).toBe('No issues.\n');
  });

  it('tags suggestions-only rules with [has suggestions]', () => {
    const out = renderCompact([bareRule({ hasSuggestions: true })], oneWarnSummary);
    expect(out).toContain('[has suggestions]');
    expect(out).not.toContain('[fixable]');
  });

  it('falls back to the rule description when no message was captured', () => {
    const out = renderCompact([bareRule({ description: 'generic description' })], oneWarnSummary);
    expect(out).toContain(' — generic description @ ');
  });

  it('omits the detail tail entirely when neither message nor description exists', () => {
    const out = renderCompact([bareRule({})], oneWarnSummary);
    expect(out).toContain('WARN bare-rule ×1 @ src/a.ts:1');
    expect(out).not.toContain(' — ');
  });

  it('omits the overflow marker when every occurrence is listed', () => {
    const out = renderCompact([bareRule({})], oneWarnSummary);
    expect(out).not.toContain('more');
  });
});

describe('renderJSON / renderNDJSON — optional-field omission', () => {
  it('renderJSON omits desc/msg/docs/cwe/cvss/t/sugg when absent, and drops empty suggestion arrays', () => {
    const grouped = [bareRule({ locations: [{ file: 'src/a.ts', line: 1, column: 1, suggestions: [] }] })];
    const parsed = JSON.parse(renderJSON(grouped, oneWarnSummary)) as { rules: Array<Record<string, unknown>> };
    const r = parsed.rules[0]!;
    expect(Object.keys(r).toSorted()).toEqual(['fix', 'id', 'locs', 'n', 'sev', 'sugg']);
    expect(Object.keys((r['locs'] as Array<Record<string, unknown>>)[0]!).toSorted()).toEqual(['c', 'f', 'l']);
  });

  it('renderNDJSON omits the same optional fields and drops empty suggestion arrays', () => {
    const grouped = [bareRule({ locations: [{ file: 'src/a.ts', line: 1, column: 1, suggestions: [] }] })];
    const lines = renderNDJSON(grouped, oneWarnSummary).trim().split('\n');
    const r = JSON.parse(lines[1]!) as Record<string, unknown>;
    expect(Object.keys(r).toSorted()).toEqual(['fix', 'id', 'kind', 'locs', 'n', 'sev', 'sugg']);
    expect(Object.keys((r['locs'] as Array<Record<string, unknown>>)[0]!).toSorted()).toEqual(['c', 'f', 'l']);
  });

  it('renderNDJSON carries cwe + cvss + docs + desc + nodeType when present', () => {
    const grouped = [bareRule({
      severity: 'error',
      description: 'desc here',
      docsUrl: 'https://docs.example/rule',
      cwe: 'CWE-89',
      cvss: 9.8,
      message: 'msg here',
      locations: [{ file: 'src/a.ts', line: 1, column: 1, nodeType: 'CallExpression', suggestions: [{ desc: 'fix it' }] }],
    })];
    const summary: LintSummary = { ...cleanSummary, filesWithIssues: 1, errorCount: 1, uniqueRules: 1 };
    const lines = renderNDJSON(grouped, summary).trim().split('\n');
    const r = JSON.parse(lines[1]!) as {
      desc: string; docs: string; cwe: string; cvss: number; msg: string;
      locs: Array<{ t: string; sugg: Array<{ desc: string }> }>;
    };
    expect(r.desc).toBe('desc here');
    expect(r.docs).toBe('https://docs.example/rule');
    expect(r.cwe).toBe('CWE-89');
    expect(r.cvss).toBe(9.8);
    expect(r.msg).toBe('msg here');
    expect(r.locs[0]!.t).toBe('CallExpression');
    expect(r.locs[0]!.sugg).toEqual([{ desc: 'fix it' }]);
  });
});
