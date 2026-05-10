/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Type definitions for @interlace/eslint-formatter
 *
 * These types mirror ESLint's internal types so the package has
 * zero runtime dependencies — only eslint as a peer.
 */

// ============================================================================
// ESLint Result Types (mirrored to avoid import dependency)
// ============================================================================

/**
 * ESLint lint message (from a single rule violation)
 */
export interface LintMessage {
  ruleId: string | null;
  severity: 1 | 2; // 1 = warning, 2 = error
  message: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  nodeType: string | null;
  fix?: {
    range: [number, number];
    text: string;
  };
  suggestions?: Array<{
    desc: string;
    fix: { range: [number, number]; text: string };
  }>;
}

/**
 * ESLint lint result (for a single file)
 */
export interface LintResult {
  filePath: string;
  messages: LintMessage[];
  errorCount: number;
  warningCount: number;
  fixableErrorCount: number;
  fixableWarningCount: number;
  source?: string;
}

/**
 * ESLint formatter context.
 *
 * `rulesMeta.docs.cwe` and `rulesMeta.docs.cvss` are non-standard but
 * Interlace plugins populate them. We surface them when present and
 * silently skip otherwise — works fine with any ESLint plugin.
 */
export interface FormatterContext {
  cwd: string;
  rulesMeta?: Record<string, {
    type?: string;
    docs?: {
      description?: string;
      url?: string;
      /** Interlace extension: CWE identifier (e.g. "CWE-089"). */
      cwe?: string;
      /** Interlace extension: CVSS 3.1 score (0.0–10.0). */
      cvss?: number;
    };
  }>;
}

// ============================================================================
// Formatter-Specific Types
// ============================================================================

/** Output mode for the formatter */
export type OutputMode = 'human' | 'compact' | 'json' | 'ndjson' | 'xml';

/**
 * A grouped rule result — all violations for a single ruleId
 */
export interface GroupedRule {
  /** ESLint ruleId */
  ruleId: string;
  /** Severity: 'error' or 'warning' */
  severity: 'error' | 'warning';
  /** Rule description from meta, if available */
  description?: string;
  /** Rule docs URL from meta, if available */
  docsUrl?: string;
  /** CWE identifier (e.g. "CWE-089") if rule meta declares it. */
  cwe?: string;
  /** CVSS 3.1 score (0.0–10.0) if rule meta declares it. */
  cvss?: number;
  /**
   * Representative ESLint message text — usually identical across
   * occurrences of the same ruleId, so we capture the first one. This
   * is the single most actionable field for an LLM-fix consumer; we
   * used to drop it which inflated FP perception.
   */
  message?: string;
  /** Total number of violations */
  count: number;
  /** Whether violations are auto-fixable */
  fixable: boolean;
  /** Whether at least one occurrence carries an ESLint suggestion[] entry. */
  hasSuggestions: boolean;
  /** Representative file locations (capped to avoid flooding) */
  locations: Array<{
    file: string;
    line: number;
    column: number;
    /** AST node type from ESLint (e.g. "CallExpression"). Cheap LLM disambiguator. */
    nodeType?: string;
    /** ESLint suggestions[] descriptions (manual fixes), if any. */
    suggestions?: Array<{ desc: string }>;
  }>;
}

/**
 * Summary statistics for the entire lint run
 */
export interface LintSummary {
  /** Total files linted */
  totalFiles: number;
  /** Files with violations */
  filesWithIssues: number;
  /** Total errors */
  errorCount: number;
  /** Total warnings */
  warningCount: number;
  /** Total fixable issues */
  fixableCount: number;
  /** Unique rules violated */
  uniqueRules: number;
  /** Top offending rules (sorted by count descending) */
  topRules: Array<{ ruleId: string; count: number }>;
}
