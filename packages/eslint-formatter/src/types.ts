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
 * ESLint formatter context
 */
export interface FormatterContext {
  cwd: string;
  rulesMeta?: Record<string, { type?: string; docs?: { description?: string; url?: string } }>;
}

// ============================================================================
// Formatter-Specific Types
// ============================================================================

/** Output mode for the formatter */
export type OutputMode = 'human' | 'compact' | 'json';

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
  /** Total number of violations */
  count: number;
  /** Whether violations are auto-fixable */
  fixable: boolean;
  /** Representative file locations (capped to avoid flooding) */
  locations: Array<{
    file: string;
    line: number;
    column: number;
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
