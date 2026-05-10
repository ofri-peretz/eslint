/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * Runtime functions for LLM message formatting
 *
 * Contains all formatting functions, template processing, and message generation logic
 */
import type { Severity, OWASPCategory, ComplianceFramework, LLMMessageOptions, EnterpriseMessageOptions, MessageTemplateConfig, TemplatedMessageOptions, SARIFResult } from './types';
/**
 * Creates an LLM-optimized error message with comprehensive security benchmarks.
 *
 * Format (compact, ~2 lines):
 * Line 1: [Icon] [CWE] [OWASP] [CVSS] | [Description] | [SEVERITY] [Compliance]
 * Line 2:    Fix: [instruction] | [doc-link]
 *
 * @param options - Message configuration options
 * @returns Formatted error message string
 *
 * @example
 * ```typescript
 * const message = formatLLMMessage({
 *   icon: '🔒',
 *   issueName: 'SQL Injection',
 *   cwe: 'CWE-89',
 *   description: 'SQL Injection detected',
 *   severity: 'CRITICAL',
 *   fix: 'Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId])',
 *   documentationLink: 'https://owasp.org/www-community/attacks/SQL_Injection'
 * });
 * // Returns:
 * // 🔒 CWE-89 OWASP:A05-Injection CVSS:9.8 | SQL Injection | CRITICAL [SOC2,PCI-DSS,HIPAA]
 * //    Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId]) | https://owasp.org/www-community/attacks/SQL_Injection
 * ```
 */
export declare function formatLLMMessage(options: LLMMessageOptions | EnterpriseMessageOptions): string;
/**
 * Helper function for creating LLM-optimized messages with template variables.
 * @param options - Message configuration options (supports template variables)
 * @returns Formatted error message string with template variables
 */
export declare function formatLLMMessageTemplate(options: LLMMessageOptions | EnterpriseMessageOptions): string;
/**
 * Get enriched security benchmark data for a CWE
 * Useful for programmatic access to OWASP/CVSS data
 *
 * @param cwe - CWE identifier (e.g., 'CWE-89')
 * @returns Security benchmark data or undefined
 */
export declare function getSecurityBenchmarks(cwe: string): {
    owasp: OWASPCategory;
    owaspName: string;
    owaspLink: string;
    cvss: number;
    severity: Severity;
    name: string;
    compliance: ComplianceFramework[];
} | undefined;
/**
 * Register a custom message template for your organization
 *
 * @example
 * ```typescript
 * // In your ESLint plugin setup
 * import { registerMessageTemplate } from '@interlace/eslint-devkit';
 *
 * registerMessageTemplate('my-company', {
 *   organizationName: 'Acme Corp',
 *   line1Format: '{{icon}} [{{severity}}] {{description}} ({{cwe}})',
 *   line2Format: '   Fix: {{fix}} | Docs: {{confluence}} | Jira: {{jira}}',
 *   jiraTemplate: 'https://jira.acme.com/create?summary={{summary}}&project=SEC',
 *   confluenceTemplate: 'https://confluence.acme.com/security/{{cwe}}',
 *   customCompliance: ['ACME-SEC-001', 'ACME-DATA-002'],
 * });
 * ```
 */
export declare function registerMessageTemplate(name: string, config: MessageTemplateConfig): void;
/**
 * Get a registered message template
 */
export declare function getMessageTemplate(name: string): MessageTemplateConfig | undefined;
/**
 * List all registered message templates
 */
export declare function listMessageTemplates(): string[];
/**
 * Clear all registered templates (useful for testing)
 */
export declare function clearMessageTemplates(): void;
/**
 * Format an LLM message using a custom organization template
 *
 * @example
 * ```typescript
 * import { formatWithTemplate, registerMessageTemplate } from '@interlace/eslint-devkit';
 *
 * // Register your template once
 * registerMessageTemplate('my-company', {
 *   jiraTemplate: 'https://jira.company.com/create?summary={{summary}}',
 *   line2Format: '   Fix: {{fix}} | Create ticket: {{jira}}',
 * });
 *
 * // Use in rules
 * const message = formatWithTemplate({
 *   templateName: 'my-company',
 *   icon: MessageIcons.SECURITY,
 *   cwe: 'CWE-89',
 *   description: 'SQL Injection detected',
 *   severity: 'CRITICAL',
 *   fix: 'Use parameterized queries',
 *   documentationLink: 'https://owasp.org/...',
 *   jiraData: {
 *     summary: 'SQL Injection in user query',
 *     priority: 'Critical',
 *   },
 * });
 * ```
 */
export declare function formatWithTemplate(options: TemplatedMessageOptions): string;
/**
 * Converts message options to SARIF format for security tool integration
 * Supports: GitHub Advanced Security, Snyk, SonarQube, Checkmarx
 *
 * @param options - Message options
 * @returns SARIF-compatible result object
 */
export declare function toSARIF(options: EnterpriseMessageOptions): SARIFResult;
