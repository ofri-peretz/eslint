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
 * Schema:
 * {
 *   rules: [{ id, sev, n, fix, desc?, docs?, locs }],
 *   summary: { errors, warnings, files, fixable, rules }
 * }
 */

import type { GroupedRule, LintSummary } from '../types';

interface JSONRule {
  /** Rule ID */
  id: string;
  /** Severity: 'error' | 'warning' */
  sev: string;
  /** Violation count */
  n: number;
  /** Is fixable */
  fix: boolean;
  /** Description (from rule meta) */
  desc?: string;
  /** Docs URL */
  docs?: string;
  /** Representative locations */
  locs: Array<{ f: string; l: number; c: number }>;
}

interface JSONOutput {
  rules: JSONRule[];
  summary: {
    errors: number;
    warnings: number;
    files: number;
    fixable: number;
    rules: number;
  };
}

/**
 * Renders grouped results as minified JSON.
 */
export function renderJSON(
  grouped: GroupedRule[],
  summary: LintSummary,
): string {
  const output: JSONOutput = {
    rules: grouped.map(rule => {
      const r: JSONRule = {
        id: rule.ruleId,
        sev: rule.severity,
        n: rule.count,
        fix: rule.fixable,
        locs: rule.locations.map((l: { file: string; line: number; column: number }) => ({ f: l.file, l: l.line, c: l.column })),
      };
      if (rule.description) r.desc = rule.description;
      if (rule.docsUrl) r.docs = rule.docsUrl;
      return r;
    }),
    summary: {
      errors: summary.errorCount,
      warnings: summary.warningCount,
      files: summary.filesWithIssues,
      fixable: summary.fixableCount,
      rules: summary.uniqueRules,
    },
  };

  return JSON.stringify(output);
}
