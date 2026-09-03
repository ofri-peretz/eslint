/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * JSON renderer — structured output for programmatic consumption.
 *
 * Produces deterministic, parseable JSON that agents and tools
 * can consume without regex parsing. Uses abbreviated keys to
 * minimize token cost.
 *
 * Schema (note: `summary` ships first by design — Claude / GPT prompt
 * caching matches by prefix, so the most stable, most reusable fragment
 * of the payload should be at the front so it survives cache breakpoints
 * even when the per-rule list churns):
 *
 * {
 *   summary: { errors, warnings, files, fixable, rules },
 *   rules: [{
 *     id, sev, n, fix, sugg, desc?, msg?, docs?, cwe?, cvss?,
 *     locs: [{ f, l, c, t?, sugg? }]
 *   }]
 * }
 *
 * Reference: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
 */

import type { GroupedRule, LintSummary } from '../types';

interface JSONLocation {
  /** File path (relative to cwd) */
  f: string;
  /** Line */
  l: number;
  /** Column */
  c: number;
  /** AST nodeType (cheap LLM disambiguator) */
  t?: string;
  /** Per-occurrence ESLint suggestions[] descriptions, if any */
  sugg?: Array<{ desc: string }>;
}

interface JSONRule {
  /** Rule ID */
  id: string;
  /** Severity: 'error' | 'warning' */
  sev: string;
  /** Violation count */
  n: number;
  /** Is autofixable */
  fix: boolean;
  /** Has at least one ESLint suggestion (manual fix) */
  sugg: boolean;
  /** Description (from rule meta) */
  desc?: string;
  /** Representative ESLint message text */
  msg?: string;
  /** Docs URL */
  docs?: string;
  /** CWE identifier */
  cwe?: string;
  /** CVSS 3.1 score */
  cvss?: number;
  /** Representative locations */
  locs: JSONLocation[];
}

interface JSONOutput {
  // `summary` first — see file-level comment above for why.
  summary: {
    errors: number;
    warnings: number;
    files: number;
    fixable: number;
    rules: number;
  };
  rules: JSONRule[];
}

/**
 * Renders grouped results as minified JSON.
 */
export function renderJSON(
  grouped: GroupedRule[],
  summary: LintSummary,
): string {
  const output: JSONOutput = {
    summary: {
      errors: summary.errorCount,
      warnings: summary.warningCount,
      files: summary.filesWithIssues,
      fixable: summary.fixableCount,
      rules: summary.uniqueRules,
    },
    rules: grouped.map(rule => {
      const r: JSONRule = {
        id: rule.ruleId,
        sev: rule.severity,
        n: rule.count,
        fix: rule.fixable,
        sugg: rule.hasSuggestions,
        locs: rule.locations.map((l): JSONLocation => {
          const loc: JSONLocation = { f: l.file, l: l.line, c: l.column };
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
      return r;
    }),
  };

  return JSON.stringify(output);
}
