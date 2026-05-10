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

import { relative } from 'node:path';
import type {
  LintResult,
  FormatterContext,
  GroupedRule,
  LintSummary,
  OutputMode,
} from './types';

/**
 * Maximum representative locations per grouped rule — mode-aware.
 * `compact` and `human` are token-budget-sensitive (one line per location);
 * `json` is for downstream tooling that may want the full set, so we
 * raise the cap there.
 */
const LOCATIONS_CAP_BY_MODE: Record<OutputMode, number> = {
  human: 5,
  compact: 5,
  json: 50,
  ndjson: 50,
  // XML is structured + agent-targeted (same use-case as JSON), but the
  // tag overhead means each location is more expensive per byte. Cap
  // mid-way between compact and json to balance cost vs completeness.
  xml: 25,
};
const DEFAULT_LOCATIONS_CAP = 5;

/**
 * Groups ESLint results by ruleId.
 *
 * @param results - ESLint LintResult array (one per file)
 * @param context - ESLint formatter context (for rule metadata)
 * @param mode    - Output mode; controls the per-rule location cap.
 * @returns Array of GroupedRule, sorted by count descending (ruleId tie-break)
 */
export function groupByRule(
  results: LintResult[],
  context?: FormatterContext,
  mode?: OutputMode,
): GroupedRule[] {
  const cap = mode ? LOCATIONS_CAP_BY_MODE[mode] : DEFAULT_LOCATIONS_CAP;

  const ruleMap = new Map<string, {
    severity: 1 | 2;
    count: number;
    fixable: boolean;
    hasSuggestions: boolean;
    message?: string;
    locations: GroupedRule['locations'];
  }>();

  for (const result of results) {
    const relativePath = makeRelative(result.filePath, context?.cwd);

    for (const msg of result.messages) {
      const ruleId = msg.ruleId || 'unknown';
      const existing = ruleMap.get(ruleId);
      const hasSuggestions = !!(msg.suggestions && msg.suggestions.length > 0);

      if (existing) {
        existing.count++;
        existing.fixable = existing.fixable || !!msg.fix;
        existing.hasSuggestions = existing.hasSuggestions || hasSuggestions;
        if (msg.severity > existing.severity) {
          existing.severity = msg.severity;
        }
        // Capture first non-empty message we see — they're usually identical
        // across occurrences but defensively prefer the first non-empty one.
        if (!existing.message && msg.message) existing.message = msg.message;
        if (existing.locations.length < cap) {
          existing.locations.push(buildLocation(relativePath, msg, hasSuggestions));
        }
      } else {
        ruleMap.set(ruleId, {
          severity: msg.severity,
          count: 1,
          fixable: !!msg.fix,
          hasSuggestions,
          message: msg.message,
          locations: [buildLocation(relativePath, msg, hasSuggestions)],
        });
      }
    }
  }

  // Build grouped results with metadata enrichment
  const grouped: GroupedRule[] = [];
  for (const [ruleId, data] of ruleMap) {
    const meta = context?.rulesMeta?.[ruleId];

    const out: GroupedRule = {
      ruleId,
      severity: data.severity === 2 ? 'error' : 'warning',
      count: data.count,
      fixable: data.fixable,
      hasSuggestions: data.hasSuggestions,
      locations: data.locations,
    };
    if (meta?.docs?.description) out.description = meta.docs.description;
    if (meta?.docs?.url) out.docsUrl = meta.docs.url;
    if (meta?.docs?.cwe) out.cwe = meta.docs.cwe;
    if (typeof meta?.docs?.cvss === 'number') out.cvss = meta.docs.cvss;
    if (data.message) out.message = data.message;
    grouped.push(out);
  }

  // Sort: severity first (error before warning), then count desc, then
  // ruleId asc as a deterministic tie-break.
  //
  // Why severity-first: count-desc alone buries a rare critical error
  // under a noisy warning. A single SQL-injection finding amid 6,000
  // `no-console` warnings would render last — exactly the position
  // LLMs and humans skim past ("lost in the middle"). Severity-first
  // guarantees the most attention-worthy class of finding is at the
  // top of every render.
  //
  // The ruleId tie-break preserves hash-stable output across runs
  // regardless of the file-traversal order the linter used.
  grouped.sort((a, b) => {
    const sa = a.severity === 'error' ? 0 : 1;
    const sb = b.severity === 'error' ? 0 : 1;
    if (sa !== sb) return sa - sb;
    if (b.count !== a.count) return b.count - a.count;
    return a.ruleId.localeCompare(b.ruleId);
  });

  return grouped;
}

function makeRelative(filePath: string, cwd?: string): string {
  if (!cwd) return filePath;
  try {
    const rel = relative(cwd, filePath);
    // Guard against `..` results (file outside cwd) — return absolute.
    return rel.startsWith('..') ? filePath : rel;
  } catch {
    return filePath;
  }
}

function buildLocation(
  file: string,
  msg: LintResult['messages'][number],
  hasSuggestions: boolean,
): GroupedRule['locations'][number] {
  const loc: GroupedRule['locations'][number] = {
    file,
    line: msg.line,
    column: msg.column,
  };
  if (msg.nodeType) loc.nodeType = msg.nodeType;
  if (hasSuggestions && msg.suggestions) {
    loc.suggestions = msg.suggestions.map(s => ({ desc: s.desc }));
  }
  return loc;
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
