/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * Security Utilities - Shared helpers for reducing false positives in security rules
 *
 * This module provides common detection for:
 * 1. Sanitization/validation function calls
 * 2. Safe patterns (ORMs, parameterized queries)
 * 3. JSDoc annotations (@safe, @validated, @sanitized)
 *
 * @example
 * ```typescript
 * import {
 *   isSanitizedInput,
 *   hasSafeAnnotation,
 *   isOrmMethodCall
 * } from '../../utils/security-utils';
 *
 * // Skip reporting if input is sanitized
 * if (isSanitizedInput(node, context)) {
 *   return; // Not a vulnerability - input was sanitized
 * }
 * ```
 */
import type { TSESTree, TSESLint } from '@typescript-eslint/utils';
/**
 * Common sanitization function names
 * These functions are typically used to sanitize/escape user input
 */
export declare const SANITIZATION_FUNCTIONS: string[];
/**
 * Common validation library method patterns
 * Format: objectName.methodName
 */
export declare const VALIDATION_PATTERNS: string[];
/**
 * Safe JSDoc annotations that indicate the value has been validated/sanitized
 */
export declare const SAFE_ANNOTATIONS: string[];
/**
 * ORM method patterns that are considered safe (use parameterized queries internally)
 */
export declare const SAFE_ORM_PATTERNS: string[];
/**
 * Check if a node represents a call to a sanitization function
 *
 * @example
 * ```typescript
 * // Returns true for:
 * sanitize(userInput)
 * escape(userInput)
 * DOMPurify.sanitize(html)
 * validator.escape(input)
 * ```
 */
export declare function isSanitizationCall(node: TSESTree.Node, customFunctions?: string[]): boolean;
/**
 * Check if a variable was assigned from a sanitization call
 * Traces back through variable assignments to find sanitization
 *
 * @example
 * ```typescript
 * const clean = sanitize(userInput);
 * db.query(`SELECT * FROM users WHERE name = '${clean}'`);
 * // ^ This should NOT be flagged - clean was sanitized
 * ```
 */
export declare function isSanitizedInput(node: TSESTree.Node, context: TSESLint.RuleContext<string, unknown[]>, customFunctions?: string[]): boolean;
/**
 * Check if a node or its parent function has a safe JSDoc annotation
 *
 * @example
 * ```typescript
 * /** @safe - Input validated by middleware *\/
 * function processInput(input) {
 *   db.query(`SELECT * FROM users WHERE name = '${input}'`);
 * }
 * ```
 */
export declare function hasSafeAnnotation(node: TSESTree.Node, context: TSESLint.RuleContext<string, unknown[]>, customAnnotations?: string[]): boolean;
/**
 * Check if a call expression is using an ORM's safe methods
 *
 * @example
 * ```typescript
 * // Returns true - ORM handles parameterization
 * prisma.user.findMany({ where: { name: userInput } });
 * userRepository.createQueryBuilder().where('name = :name', { name: userInput });
 * ```
 */
export declare function isOrmMethodCall(node: TSESTree.Node, context: TSESLint.RuleContext<string, unknown[]>, customPatterns?: string[]): boolean;
/**
 * Check if a query uses parameterized placeholders
 *
 * @example
 * ```typescript
 * // Returns true - parameterized
 * db.query('SELECT * FROM users WHERE id = ?', [userId]);
 * db.query('SELECT * FROM users WHERE id = $1', [userId]);
 * db.query('SELECT * FROM users WHERE id = :id', { id: userId });
 * ```
 */
export declare function isParameterizedQuery(queryText: string): boolean;
/**
 * Combined check: is the input safe from injection?
 *
 * This function combines all safety checks:
 * 1. Sanitization function calls
 * 2. Safe JSDoc annotations
 * 3. ORM method calls
 * 4. Type-constrained values (when available)
 *
 * @example
 * ```typescript
 * if (isInputSafe(node, context)) {
 *   return; // Don't report - input is safe
 * }
 * ```
 */
export declare function isInputSafe(node: TSESTree.Node, context: TSESLint.RuleContext<string, unknown[]>, options?: {
    customSanitizers?: string[];
    customAnnotations?: string[];
    customOrmPatterns?: string[];
}): boolean;
/**
 * Options interface for security rules that want to use these utilities
 */
/**
 * Compliance framework identifiers
 */
export type ComplianceFramework = 'SOC2' | 'HIPAA' | 'PCI-DSS' | 'GDPR' | 'ISO27001' | 'NIST-CSF' | 'OWASP-ASVS' | 'FEDRAMP' | string;
/**
 * Severity level override options
 */
export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
/**
 * Severity override configuration
 */
export interface SeverityOverride {
    /**
     * Override the default severity level for this rule
     * @example 'CRITICAL'
     */
    level?: SeverityLevel;
    /**
     * Override based on pattern matching
     * @example { 'user-input': 'CRITICAL', 'internal-api': 'MEDIUM' }
     */
    patterns?: Record<string, SeverityLevel>;
    /**
     * Minimum severity to report (filters out lower severity issues)
     * @example 'MEDIUM' - only report MEDIUM, HIGH, CRITICAL
     */
    minSeverity?: SeverityLevel;
}
/**
 * Compliance context for security rules
 */
export interface ComplianceContext {
    /**
     * Additional compliance frameworks this rule applies to
     * These are added to the auto-detected frameworks
     * @example ['COMPANY-SEC-001', 'TEAM-POLICY-A']
     */
    frameworks?: ComplianceFramework[];
    /**
     * Ticket/issue tracking integration
     * When violations are found, include link to create ticket
     */
    ticketTemplate?: {
        /** Template URL with placeholders */
        url: string;
        /** Template for ticket summary */
        summary?: string;
        /** Default priority for tickets */
        priority?: 'Critical' | 'High' | 'Medium' | 'Low';
        /** Additional labels to apply */
        labels?: string[];
    };
    /**
     * Documentation link override for organization-specific docs
     */
    documentationUrl?: string;
    /**
     * Risk owner or team responsible for this category
     */
    riskOwner?: string;
    /**
     * Custom metadata for enterprise integration
     */
    metadata?: Record<string, string>;
}
export interface SecurityRuleOptions {
    /** Additional function names to consider as sanitizers */
    trustedSanitizers?: string[];
    /** Additional JSDoc annotations to consider as safe markers */
    trustedAnnotations?: string[];
    /** Additional ORM patterns to consider safe */
    trustedOrmPatterns?: string[];
    /** Disable all false positive detection (strict mode) */
    strictMode?: boolean;
    /**
     * Override the default severity for this rule
     *
     * @example
     * ```javascript
     * // Simple override
     * { severity: { level: 'CRITICAL' } }
     *
     * // Pattern-based override
     * { severity: { patterns: { 'user-input': 'CRITICAL', 'admin-api': 'HIGH' } } }
     *
     * // Filter low severity
     * { severity: { minSeverity: 'MEDIUM' } }
     * ```
     */
    severity?: SeverityOverride;
    /**
     * Compliance context for enterprise security reporting
     *
     * @example
     * ```javascript
     * {
     *   compliance: {
     *     frameworks: ['HIPAA', 'SOC2', 'COMPANY-SEC-001'],
     *     ticketTemplate: {
     *       url: 'https://jira.company.com/create?summary={{summary}}&priority={{priority}}',
     *       priority: 'Critical',
     *       labels: ['security', 'automated'],
     *     },
     *     documentationUrl: 'https://wiki.company.com/security/sql-injection',
     *     riskOwner: 'security-team@company.com',
     *   }
     * }
     * ```
     */
    compliance?: ComplianceContext;
}
/**
 * Apply security rule options to configure safety checking
 */
export declare function createSafetyChecker(options?: SecurityRuleOptions): {
    /**
     * Check if input should be considered safe (skip reporting)
     */
    isSafe(node: TSESTree.Node, context: TSESLint.RuleContext<string, unknown[]>): boolean;
    /**
     * Check specifically for sanitization
     */
    isSanitized(node: TSESTree.Node, context: TSESLint.RuleContext<string, unknown[]>): boolean;
    /**
     * Check specifically for safe annotations
     */
    hasAnnotation(node: TSESTree.Node, context: TSESLint.RuleContext<string, unknown[]>): boolean;
};
/**
 * Type for the safety checker object returned by createSafetyChecker
 */
export type SafetyChecker = ReturnType<typeof createSafetyChecker>;
/**
 * Wrapper function to check if a node should be skipped due to safety checks.
 * This consolidates the common pattern used across 75+ locations in security rules:
 *
 * ```typescript
 * // Instead of this (3-5 lines each, 75+ occurrences):
 * /* c8 ignore start -- safetyChecker requires JSDoc annotations not testable via RuleTester *\/
 * if (safetyChecker.isSafe(node, context)) {
 *   return;
 * }
 * /* c8 ignore stop *\/
 *
 * // Use this (1 line):
 * if (shouldSkipForSafety(safetyChecker, node, context)) return;
 * ```
 *
 * @example
 * ```typescript
 * const safetyChecker = createSafetyChecker(options);
 *
 * CallExpression(node) {
 *   // Early return if the node is safe
 *   if (shouldSkipForSafety(safetyChecker, node, context)) return;
 *
 *   // Continue with detection logic...
 * }
 * ```
 */
export declare function shouldSkipForSafety(safetyChecker: SafetyChecker, node: TSESTree.Node, context: TSESLint.RuleContext<string, unknown[]>): boolean;
/**
 * Find an ancestor node matching a predicate, with bounded traversal depth.
 * This prevents infinite loops and ensures O(1) bounded performance.
 *
 * @example
 * ```typescript
 * // Find the containing function
 * const containingFn = findAncestor(node, n => FUNCTION_NODE_TYPES.has(n.type));
 *
 * // Find if inside a loop
 * const loopAncestor = findAncestor(node, n => LOOP_NODE_TYPES.has(n.type));
 * if (loopAncestor) {
 *   // Node is inside a loop
 * }
 * ```
 */
export declare function findAncestor(node: TSESTree.Node, predicate: (n: TSESTree.Node) => boolean, maxDepth?: number): TSESTree.Node | null;
/**
 * Check if a node is inside a loop (for, while, do-while, for-in, for-of).
 *
 * @example
 * ```typescript
 * if (isInsideLoop(node)) {
 *   context.report({
 *     node,
 *     messageId: 'resourceAllocationInLoop',
 *   });
 * }
 * ```
 */
export declare function isInsideLoop(node: TSESTree.Node): boolean;
/**
 * Check if a node is inside a function (for scope analysis).
 */
export declare function isInsideFunction(node: TSESTree.Node): boolean;
/**
 * Get the containing function node, or null if not inside a function.
 */
export declare function getContainingFunction(node: TSESTree.Node): TSESTree.Node | null;
/**
 * Default user input variable patterns
 */
export declare const DEFAULT_USER_INPUT_PATTERNS: string[];
/**
 * Check if a variable name suggests user input
 *
 * @example
 * ```typescript
 * if (isUserInputIdentifier('reqBody', DEFAULT_USER_INPUT_PATTERNS)) {
 *   // This variable name suggests user input
 * }
 * ```
 */
export declare function isUserInputIdentifier(name: string, patterns?: string[]): boolean;
/**
 * Check if an expression contains user input references
 *
 * @example
 * ```typescript
 * if (isUserInputExpression(node, sourceCode, ['req', 'userInput'])) {
 *   context.report({ node, messageId: 'userControlledInput' });
 * }
 * ```
 */
export declare function isUserInputExpression(expression: TSESTree.Expression, sourceCode: TSESLint.SourceCode, patterns?: string[]): boolean;
/**
 * Check if a severity level meets or exceeds a minimum threshold
 */
export declare function meetsSeverityThreshold(severity: SeverityLevel, minSeverity: SeverityLevel): boolean;
/**
 * Get the effective severity level based on options and context
 *
 * @example
 * ```typescript
 * const effectiveSeverity = getEffectiveSeverity('HIGH', options.severity, {
 *   pattern: 'user-input', // optional context for pattern matching
 * });
 * ```
 */
export declare function getEffectiveSeverity(defaultSeverity: SeverityLevel, override?: SeverityOverride, context?: {
    pattern?: string;
}): SeverityLevel;
/**
 * Check if an issue should be reported based on severity threshold
 */
export declare function shouldReportSeverity(severity: SeverityLevel, override?: SeverityOverride): boolean;
/**
 * Build compliance tags string for error messages
 */
export declare function formatComplianceTags(defaultFrameworks: ComplianceFramework[], complianceContext?: ComplianceContext): string;
/**
 * Build ticket URL from template
 */
export declare function buildTicketUrl(template: ComplianceContext['ticketTemplate'], data: {
    summary: string;
    description?: string;
    cwe?: string;
    file?: string;
    line?: number;
}): string | undefined;
/**
 * Get documentation URL with fallback to organization-specific docs
 */
export declare function getDocumentationUrl(defaultUrl: string, complianceContext?: ComplianceContext): string;
/**
 * Create enhanced message data with compliance context
 */
export declare function enhanceMessageData(baseData: Record<string, unknown>, options: SecurityRuleOptions, context: {
    defaultFrameworks?: ComplianceFramework[];
    summary?: string;
    description?: string;
    cwe?: string;
    file?: string;
    line?: number;
}): Record<string, unknown>;
