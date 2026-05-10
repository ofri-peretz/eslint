/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import type { SecurityMessageOptions, CodeQualityMessageOptions, PerformanceMessageOptions } from './types-v2';
/**
 * Output mode for v2 formatters.
 * - `'human'`: Rich multi-line output for CLI/IDE (default)
 * - `'compact'`: Condensed single/two-line for token-sensitive contexts
 * - `'agent'`: Minified JSON for programmatic agent consumption
 */
export type V2OutputMode = 'human' | 'compact' | 'agent';
/**
 * Formats a security-focused rule message.
 *
 * Supports three output modes:
 * - `'human'` (default): Rich multi-line with OWASP, compliance, examples
 * - `'compact'`: Token-optimized two-line (CWE+CVSS, inline examples)
 * - `'agent'`: Minified JSON with self-describing keys
 *
 * Tokens measured with `tiktoken` o200k_base on the example below:
 * human=120, compact=65, agent=72. (V1 baseline for the same content
 * minus `why`/`vulnerable`/`safe`: 69 tokens.)
 *
 * @example
 * ```typescript
 * // Human mode (~120 tokens)
 * formatSecurityMessage({
 *   cwe: 'CWE-89', severity: 'CRITICAL',
 *   description: 'SQL injection via string concatenation',
 *   why: 'Attackers can modify the query structure',
 *   vulnerable: "db.query('SELECT...' + userId)",
 *   safe: "db.query('SELECT...$1', [userId])",
 *   fix: 'Use parameterized queries ($1, $2)',
 *   docs: 'https://node-postgres.com/...',
 * });
 *
 * // Compact mode (~65 tokens — actually cheaper than V1)
 * formatSecurityMessage({ ...same... }, 'compact');
 *
 * // Agent mode (~72 tokens)
 * formatSecurityMessage({ ...same... }, 'agent');
 * ```
 */
export declare function formatSecurityMessage(options: SecurityMessageOptions, mode?: V2OutputMode): string;
/**
 * Formats a code quality / structural rule message.
 *
 * No CWE/OWASP/CVSS — these are architecture concerns, not vulnerabilities.
 * Supports cycle path rendering for circular dependency rules.
 *
 * @example
 * ```typescript
 * formatCodeQualityMessage({
 *   category: 'circular-dependency',
 *   severity: 'WARNING',
 *   description: 'Circular import detected: A → B → C → A',
 *   why: 'Circular imports cause undefined values at import time',
 *   cycle: ['src/A.ts', 'src/B.ts', 'src/C.ts', 'src/A.ts'],
 *   fix: 'Extract shared types to a separate module',
 * });
 * ```
 */
export declare function formatCodeQualityMessage(options: CodeQualityMessageOptions, mode?: V2OutputMode): string;
/**
 * Formats a performance-focused rule message.
 *
 * Uses complexity metrics instead of security metadata.
 *
 * @example
 * ```typescript
 * formatPerformanceMessage({
 *   severity: 'MEDIUM',
 *   description: 'Loop-based INSERT detected — O(n) database calls',
 *   why: 'Each iteration opens a new round-trip, causing N×latency',
 *   vulnerable: 'for (const row of rows) { await db.query("INSERT...", row); }',
 *   safe: 'await db.query("INSERT INTO t VALUES " + values.join(","), flat)',
 *   impact: { current: 'O(n) queries', optimized: 'O(1) query' },
 *   fix: 'Use bulk INSERT with a single VALUES clause',
 * });
 * ```
 */
export declare function formatPerformanceMessage(options: PerformanceMessageOptions, mode?: V2OutputMode): string;
