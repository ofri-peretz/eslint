/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Human renderer — rich terminal output with icons and colors.
 *
 * Designed for developer terminals and CI logs. Groups violations
 * by rule and shows representative file locations.
 */

import type { GroupedRule, LintSummary } from '../types';

const SEVERITY_ICON: Record<string, string> = {
  error: '✖',
  warning: '⚠',
};

const SEVERITY_LABEL: Record<string, string> = {
  error: 'error',
  warning: 'warning',
};

/**
 * Renders grouped results as rich terminal output.
 */
export function renderHuman(
  grouped: GroupedRule[],
  summary: LintSummary,
): string {
  if (grouped.length === 0) {
    return '✅ No lint issues found.\n';
  }

  const lines: string[] = [];

  // Header
  lines.push('');

  // Grouped rules
  for (const rule of grouped) {
    const icon = SEVERITY_ICON[rule.severity];
    const sev = SEVERITY_LABEL[rule.severity];
    const fixTag = rule.fixable ? ' (fixable)' : '';
    const countTag = rule.count > 1 ? ` ×${rule.count}` : '';

    lines.push(`  ${icon} ${rule.ruleId}${countTag} — ${sev}${fixTag}`);

    // Description from rule meta
    if (rule.description) {
      lines.push(`    ${rule.description}`);
    }

    // Representative locations
    for (const loc of rule.locations) {
      lines.push(`    ${loc.file}:${loc.line}:${loc.column}`);
    }
    if (rule.count > rule.locations.length) {
      lines.push(`    ... and ${rule.count - rule.locations.length} more`);
    }

    lines.push('');
  }

  // Summary
  lines.push('─'.repeat(60));
  const parts: string[] = [];
  if (summary.errorCount > 0) parts.push(`${summary.errorCount} error${summary.errorCount !== 1 ? 's' : ''}`);
  if (summary.warningCount > 0) parts.push(`${summary.warningCount} warning${summary.warningCount !== 1 ? 's' : ''}`);
  lines.push(`  ${parts.join(', ')} across ${summary.filesWithIssues} file${summary.filesWithIssues !== 1 ? 's' : ''} (${summary.uniqueRules} rule${summary.uniqueRules !== 1 ? 's' : ''})`);

  if (summary.fixableCount > 0) {
    lines.push(`  ${summary.fixableCount} fixable with --fix`);
  }
  lines.push('');

  return lines.join('\n');
}
