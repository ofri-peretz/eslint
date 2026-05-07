/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Result grouper — collapses per-file ESLint results into per-rule groups.
 *
 * Instead of repeating the same rule message 50 times across files,
 * the grouper emits each rule once with a count and representative
 * file locations. This is the core token-saving mechanism.
 */

import type {
  LintResult,
  LintMessage,
  FormatterContext,
  GroupedRule,
  LintSummary,
} from './types';

/** Maximum representative locations per grouped rule */
const MAX_LOCATIONS = 5;

/**
 * Groups ESLint results by ruleId.
 *
 * @param results - ESLint LintResult array (one per file)
 * @param context - ESLint formatter context (for rule metadata)
 * @returns Array of GroupedRule, sorted by count descending
 */
export function groupByRule(
  results: LintResult[],
  context?: FormatterContext,
): GroupedRule[] {
  const ruleMap = new Map<string, {
    severity: 1 | 2;
    count: number;
    fixable: boolean;
    locations: Array<{ file: string; line: number; column: number }>;
  }>();

  for (const result of results) {
    const relativePath = context?.cwd
      ? result.filePath.replace(context.cwd + '/', '')
      : result.filePath;

    for (const msg of result.messages) {
      const ruleId = msg.ruleId || 'unknown';
      const existing = ruleMap.get(ruleId);

      if (existing) {
        existing.count++;
        existing.fixable = existing.fixable || !!msg.fix;
        // Keep severity as the highest seen
        if (msg.severity > existing.severity) {
          existing.severity = msg.severity;
        }
        // Cap locations to avoid flooding
        if (existing.locations.length < MAX_LOCATIONS) {
          existing.locations.push({
            file: relativePath,
            line: msg.line,
            column: msg.column,
          });
        }
      } else {
        ruleMap.set(ruleId, {
          severity: msg.severity,
          count: 1,
          fixable: !!msg.fix,
          locations: [{
            file: relativePath,
            line: msg.line,
            column: msg.column,
          }],
        });
      }
    }
  }

  // Build grouped results with metadata enrichment
  const grouped: GroupedRule[] = [];
  for (const [ruleId, data] of ruleMap) {
    const meta = context?.rulesMeta?.[ruleId];

    grouped.push({
      ruleId,
      severity: data.severity === 2 ? 'error' : 'warning',
      description: meta?.docs?.description,
      docsUrl: meta?.docs?.url,
      count: data.count,
      fixable: data.fixable,
      locations: data.locations,
    });
  }

  // Sort by count descending (most frequent violations first)
  grouped.sort((a, b) => b.count - a.count);

  return grouped;
}

/**
 * Computes summary statistics for the lint run.
 */
export function computeSummary(
  results: LintResult[],
  grouped: GroupedRule[],
): LintSummary {
  let errorCount = 0;
  let warningCount = 0;
  let fixableCount = 0;
  let filesWithIssues = 0;

  for (const result of results) {
    errorCount += result.errorCount;
    warningCount += result.warningCount;
    fixableCount += result.fixableErrorCount + result.fixableWarningCount;
    if (result.errorCount > 0 || result.warningCount > 0) {
      filesWithIssues++;
    }
  }

  return {
    totalFiles: results.length,
    filesWithIssues,
    errorCount,
    warningCount,
    fixableCount,
    uniqueRules: grouped.length,
    topRules: grouped.slice(0, 10).map(g => ({
      ruleId: g.ruleId,
      count: g.count,
    })),
  };
}
