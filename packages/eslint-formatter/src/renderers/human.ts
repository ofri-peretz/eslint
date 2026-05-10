/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Human renderer — rich terminal output with icons and colors.
 *
 * Designed for developer terminals and CI logs. Groups violations
 * by rule and shows representative file locations. ANSI color is
 * auto-disabled when stdout is not a TTY or NO_COLOR is set.
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

// ANSI escape helpers. Hand-rolled to keep the package zero-dep.
//
// Two palettes: the default (dark-terminal-friendly: bright primary
// colors + 8-bit gray) and a light-theme variant activated by
// `LIGHT_THEME=1` or `COLORFGBG="<fg>;<bg>"` where the parsed bg is
// light (high RGB component). Light terminals render gray foreground
// (color 90) as near-invisible washed-out text, so the light palette
// substitutes black + dim, plus a darker yellow (33→33 stays fine, but
// red→31 is universally readable).
const ANSI_DARK = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const ANSI_LIGHT = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  // Darker gray foreground (256-color 240) reads cleanly on light bg.
  gray: '\x1b[38;5;240m',
};

function isLightTheme(): boolean {
  if (process.env['LIGHT_THEME']) return process.env['LIGHT_THEME'] !== '0';
  // COLORFGBG="<fg>;<bg>" — common on xterm-family terminals. Light bg
  // is a high color number (7, 15, 254, 255). Heuristic but harmless
  // when the var is absent.
  const fgbg = process.env['COLORFGBG'];
  if (!fgbg) return false;
  const parts = fgbg.split(';');
  const bg = Number.parseInt(parts[parts.length - 1] ?? '', 10);
  return Number.isFinite(bg) && bg >= 7 && bg !== 8;
}

const ANSI = isLightTheme() ? ANSI_LIGHT : ANSI_DARK;

function colorEnabled(): boolean {
  if (process.env['NO_COLOR']) return false;
  if (process.env['FORCE_COLOR']) return true;
  return !!process.stdout.isTTY;
}

function paint(s: string, code: string): string {
  if (!colorEnabled()) return s;
  return `${code}${s}${ANSI.reset}`;
}

/**
 * Renders grouped results as rich terminal output.
 */
export function renderHuman(
  grouped: GroupedRule[],
  summary: LintSummary,
): string {
  if (grouped.length === 0) {
    return paint('✅ No lint issues found.', ANSI.cyan) + '\n';
  }

  const lines: string[] = [];
  lines.push('');

  for (const rule of grouped) {
    const sevColor = rule.severity === 'error' ? ANSI.red : ANSI.yellow;
    const icon = paint(SEVERITY_ICON[rule.severity]!, sevColor);
    const sev = paint(SEVERITY_LABEL[rule.severity]!, sevColor);
    const fixTag = rule.fixable ? paint(' (fixable)', ANSI.dim) : '';
    const suggestTag = rule.hasSuggestions && !rule.fixable
      ? paint(' (has suggestions)', ANSI.dim)
      : '';
    const countTag = rule.count > 1 ? paint(` ×${rule.count}`, ANSI.bold) : '';
    const cweTag = rule.cwe ? paint(` [${rule.cwe}${rule.cvss !== undefined ? ` · CVSS ${rule.cvss.toFixed(1)}` : ''}]`, ANSI.cyan) : '';

    lines.push(`  ${icon} ${paint(rule.ruleId, ANSI.bold)}${countTag} — ${sev}${fixTag}${suggestTag}${cweTag}`);

    // Representative ESLint message (the first non-empty one). The grouper
    // captured this so an LLM/dev can act without opening docs first.
    if (rule.message) {
      lines.push(`    ${paint(rule.message, ANSI.dim)}`);
    } else if (rule.description) {
      // Fall back to rule description if no per-message text.
      lines.push(`    ${paint(rule.description, ANSI.dim)}`);
    }

    // Representative locations.
    for (const loc of rule.locations) {
      const where = `${loc.file}:${loc.line}:${loc.column}`;
      const node = loc.nodeType ? paint(`  (${loc.nodeType})`, ANSI.gray) : '';
      lines.push(`    ${paint(where, ANSI.gray)}${node}`);
    }
    if (rule.count > rule.locations.length) {
      lines.push(`    ${paint(`... and ${rule.count - rule.locations.length} more`, ANSI.gray)}`);
    }

    // Surface ESLint manual-fix suggestions when present (max one per rule
    // to keep the human view scannable; full set is in JSON).
    if (rule.hasSuggestions) {
      const firstWithSuggestions = rule.locations.find(l => l.suggestions && l.suggestions.length > 0);
      if (firstWithSuggestions?.suggestions?.[0]) {
        lines.push(`    ${paint('💡 ' + firstWithSuggestions.suggestions[0].desc, ANSI.cyan)}`);
      }
    }

    if (rule.docsUrl) {
      lines.push(`    ${paint(rule.docsUrl, ANSI.gray)}`);
    }

    lines.push('');
  }

  // Summary
  lines.push(paint('─'.repeat(60), ANSI.gray));
  const parts: string[] = [];
  if (summary.errorCount > 0) parts.push(paint(`${summary.errorCount} error${summary.errorCount !== 1 ? 's' : ''}`, ANSI.red));
  if (summary.warningCount > 0) parts.push(paint(`${summary.warningCount} warning${summary.warningCount !== 1 ? 's' : ''}`, ANSI.yellow));
  lines.push(`  ${parts.join(', ')} across ${summary.filesWithIssues} file${summary.filesWithIssues !== 1 ? 's' : ''} (${summary.uniqueRules} rule${summary.uniqueRules !== 1 ? 's' : ''})`);

  if (summary.fixableCount > 0) {
    lines.push(`  ${paint(`${summary.fixableCount} fixable with --fix`, ANSI.cyan)}`);
  }
  lines.push('');

  return lines.join('\n');
}
