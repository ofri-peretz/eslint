/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Compact renderer — token-optimized prose for context-sensitive environments.
 *
 * Targets ~40% fewer tokens than human mode by:
 * - One line per rule (no multi-line blocks)
 * - Abbreviated severity
 * - File locations as compact paths
 * - No decorative separators
 *
 * Includes the ESLint message text (the most actionable single field for
 * an LLM-fix consumer) and a CWE prefix when meta declares one — both
 * are cheap on tokens and disproportionately valuable for downstream
 * consumers.
 */

import type { GroupedRule, LintSummary } from '../types';

const SEV_SHORT: Record<string, string> = {
  error: 'ERR',
  warning: 'WARN',
};

/**
 * Renders grouped results as compact, token-lean output.
 */
export function renderCompact(
  grouped: GroupedRule[],
  summary: LintSummary,
): string {
  if (grouped.length === 0) {
    return 'No issues.\n';
  }

  const lines: string[] = [];

  for (const rule of grouped) {
    const sev = SEV_SHORT[rule.severity];
    const fixTag = rule.fixable
      ? ' [fixable]'
      : rule.hasSuggestions ? ' [has suggestions]' : '';
    const cwe = rule.cwe ? ` [${rule.cwe}]` : '';
    // Prefer the per-message text (more specific) over the rule's
    // generic description; fall back to description when message absent.
    const detail = rule.message ?? rule.description ?? '';
    const detailTail = detail ? ` — ${detail}` : '';
    const locs = rule.locations
      .map((l: { file: string; line: number }) => `${l.file}:${l.line}`)
      .join(', ');
    const overflow = rule.count > rule.locations.length
      ? ` +${rule.count - rule.locations.length} more`
      : '';

    lines.push(`${sev} ${rule.ruleId} ×${rule.count}${fixTag}${cwe}${detailTail} @ ${locs}${overflow}`);
  }

  // One-line summary.
  lines.push(`${summary.errorCount}E ${summary.warningCount}W ${summary.filesWithIssues} files ${summary.uniqueRules} rules${summary.fixableCount > 0 ? ` ${summary.fixableCount} fixable` : ''}`);

  return lines.join('\n') + '\n';
}
