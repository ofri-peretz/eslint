/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * V2 Message Formatter Types
 *
 * Category-specific message option interfaces for security, code quality,
 * and performance rules. Each type exposes purpose-specific fields
 * (e.g., `vulnerable`/`safe` for security, `cycle` for code quality).
 */
import type { Severity, OWASPCategory, ComplianceFramework } from './types';
/**
 * Base fields shared by all v2 message categories.
 *
 * Key additions over v1 `LLMMessageOptions`:
 * - `why` — architectural rationale (industry best practice for LLM teaching)
 * - `vulnerable` / `safe` — before/after code examples for reliable auto-fix
 */
export interface BaseMessageOptionsV2 {
    /** Severity level */
    severity: Severity;
    /** Concise description of the issue */
    description: string;
    /**
     * Architectural rationale explaining *why* this pattern is dangerous.
     * Transforms the message from "detection" into a "teaching prompt".
     */
    why?: string;
    /** Specific, actionable fix instruction */
    fix: string;
    /** Documentation link */
    docs?: string;
    /** Estimated remediation effort */
    effort?: 'trivial' | 'low' | 'medium' | 'high';
}
/**
 * Options for security-focused rules (CWE-mapped).
 *
 * Evolution of v1 `LLMMessageOptions` with:
 * - `vulnerable` / `safe` code examples for before/after comparison
 * - `why` rationale for LLM teaching
 * - Auto-enrichment from CWE (OWASP, CVSS, compliance)
 */
export interface SecurityMessageOptions extends BaseMessageOptionsV2 {
    /** CWE reference (e.g., 'CWE-89') — triggers auto-enrichment */
    cwe?: string;
    /** OWASP Top 10 category (auto-detected from CWE if omitted) */
    owasp?: OWASPCategory;
    /** CVSS 3.1 score 0.0–10.0 (auto-calculated from severity if omitted) */
    cvss?: number;
    /** Affected compliance frameworks (auto-detected from CWE if omitted) */
    compliance?: ComplianceFramework[];
    /**
     * Vulnerable code example (the "before").
     * Shown as `✗` in human mode, `bad` in agent JSON.
     */
    vulnerable?: string;
    /**
     * Safe code example (the "after").
     * Shown as `✓` in human mode, `good` in agent JSON.
     */
    safe?: string;
}
/** Well-known code quality categories */
export type CodeQualityCategory = 'circular-dependency' | 'unused-import' | 'barrel-file' | 'dependency-boundary' | 'import-order' | 'naming-convention' | 'dead-code';
/**
 * Options for code quality / structural rules.
 * No CWE/OWASP/CVSS — these are architecture concerns, not vulnerabilities.
 */
export interface CodeQualityMessageOptions extends BaseMessageOptionsV2 {
    /** Well-known category for grouping and routing */
    category: CodeQualityCategory | string;
    /**
     * Import cycle path (for circular dependency rules).
     * Rendered as `A → B → C → A` in human mode.
     */
    cycle?: string[];
    /**
     * Vulnerable code example (the "before").
     */
    vulnerable?: string;
    /**
     * Safe code example (the "after").
     */
    safe?: string;
}
/**
 * Options for performance-focused rules.
 * Uses complexity metrics instead of security metadata.
 */
export interface PerformanceMessageOptions extends BaseMessageOptionsV2 {
    /**
     * Vulnerable code example (the "before").
     */
    vulnerable?: string;
    /**
     * Safe code example (the "after").
     */
    safe?: string;
    /**
     * Performance impact metrics.
     * Displayed as "Impact: O(n) queries → O(1) query" in human mode.
     */
    impact?: {
        /** Current (bad) complexity or behavior */
        current: string;
        /** Optimized (good) complexity or behavior */
        optimized: string;
    };
}
