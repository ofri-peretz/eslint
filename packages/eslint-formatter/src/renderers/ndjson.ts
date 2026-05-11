/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * NDJSON renderer — newline-delimited JSON for streaming + agent loops.
 *
 * Why a separate mode from `json`:
 *   - Each line is a complete, self-describing JSON object → parseable
 *     incrementally without buffering the whole payload.
 *   - The summary line ships first so an agent can decide whether to
 *     read the rest at all (zero-cost early exit on clean runs).
 *   - Robust against truncation: a partial output is still valid JSONL
 *     for the lines that completed.
 *
 * Reference patterns:
 *   - rtk-ai (open-source CLI proxy, 90 % token reduction on lint output
 *     via NDJSON streaming) — https://github.com/NotMyself/rtk-ai
 *   - Anthropic prompt-caching guidance: stable summary first, variable
 *     per-rule content after — https://platform.claude.com/docs/en/build-with-claude/prompt-caching
 *
 * Each line schema is identical to a single rule object in the
 * monolithic `json` renderer (same abbreviated keys), with the first
 * line carrying `{ "kind": "summary", ... }`.
 */

import type { GroupedRule, LintSummary } from '../types';

interface NDJSONSummaryLine {
  kind: 'summary';
  errors: number;
  warnings: number;
  files: number;
  fixable: number;
  rules: number;
}

interface NDJSONRuleLine {
  kind: 'rule';
  id: string;
  sev: string;
  n: number;
  fix: boolean;
  sugg: boolean;
  desc?: string;
  msg?: string;
  docs?: string;
  cwe?: string;
  cvss?: number;
  locs: Array<{ f: string; l: number; c: number; t?: string; sugg?: Array<{ desc: string }> }>;
}

export function renderNDJSON(
  grouped: GroupedRule[],
  summary: LintSummary,
): string {
  const lines: string[] = [];

  const summaryLine: NDJSONSummaryLine = {
    kind: 'summary',
    errors: summary.errorCount,
    warnings: summary.warningCount,
    files: summary.filesWithIssues,
    fixable: summary.fixableCount,
    rules: summary.uniqueRules,
  };
  lines.push(JSON.stringify(summaryLine));

  for (const rule of grouped) {
    const r: NDJSONRuleLine = {
      kind: 'rule',
      id: rule.ruleId,
      sev: rule.severity,
      n: rule.count,
      fix: rule.fixable,
      sugg: rule.hasSuggestions,
      locs: rule.locations.map(l => {
        const loc: NDJSONRuleLine['locs'][number] = { f: l.file, l: l.line, c: l.column };
        if (l.nodeType) loc.t = l.nodeType;
        if (l.suggestions && l.suggestions.length > 0) loc.sugg = l.suggestions;
        return loc;
      }),
    };
    if (rule.description) r.desc = rule.description;
    if (rule.message) r.msg = rule.message;
    if (rule.docsUrl) r.docs = rule.docsUrl;
    if (rule.cwe) r.cwe = rule.cwe;
    if (typeof rule.cvss === 'number') r.cvss = rule.cvss;
    lines.push(JSON.stringify(r));
  }

  return lines.join('\n') + '\n';
}
