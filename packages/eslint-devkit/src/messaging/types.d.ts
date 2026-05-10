/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * Type definitions for LLM message formatting
 *
 * Contains all interfaces, type unions, and type guards
 */
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type OWASP2025Category = 'A01:2025' | 'A02:2025' | 'A03:2025' | 'A04:2025' | 'A05:2025' | 'A06:2025' | 'A07:2025' | 'A08:2025' | 'A09:2025' | 'A10:2025';
export type OWASP2021Category = 'A01:2021' | 'A02:2021' | 'A03:2021' | 'A04:2021' | 'A05:2021' | 'A06:2021' | 'A07:2021' | 'A08:2021' | 'A09:2021' | 'A10:2021';
/**
 * OWASP Serverless Top 10 (SAS) Categories
 * @see https://owasp.org/www-project-serverless-top-10/
 */
export type OWASPServerlessCategory = 'SAS-1' | 'SAS-2' | 'SAS-3' | 'SAS-4' | 'SAS-5' | 'SAS-6' | 'SAS-7' | 'SAS-8' | 'SAS-9' | 'SAS-10';
export type OWASPCategory = OWASP2025Category | OWASP2021Category | OWASPServerlessCategory;
export type ComplianceFramework = 'SOC2' | 'HIPAA' | 'PCI-DSS' | 'GDPR' | 'ISO27001' | 'NIST-CSF' | 'FedRAMP' | 'CCPA';
/**
 * Basic message options (backward compatible)
 */
export interface LLMMessageOptions {
    /** Icon emoji (e.g., '🔒', '⚠️', '📦', '🔧') */
    icon: string;
    /** Issue name (e.g., 'SQL Injection') - kept for backwards compatibility */
    issueName: string;
    /** CWE reference (optional, e.g., 'CWE-89', 'CWE-915') */
    cwe?: string;
    /** Description of the issue */
    description: string;
    /** Severity level (can be a template variable like '{{riskLevel}}') */
    severity: Severity | string;
    /** Specific fix instruction */
    fix: string;
    /** Documentation link */
    documentationLink: string;
}
/**
 * Enterprise message options with full security benchmark support
 */
export interface EnterpriseMessageOptions extends LLMMessageOptions {
    /** OWASP Top 10 2021 category (auto-detected from CWE if not provided) */
    owasp?: OWASPCategory;
    /** CVSS 3.1 score 0.0-10.0 (auto-calculated from severity if not provided) */
    cvss?: number;
    /** Affected compliance frameworks (auto-detected from CWE if not provided) */
    compliance?: ComplianceFramework[];
    /** Estimated remediation effort */
    effort?: 'trivial' | 'low' | 'medium' | 'high';
    /** Unique rule identifier for tracking */
    ruleId?: string;
}
/**
 * Template configuration for organization-specific message formats
 */
export interface MessageTemplateConfig {
    /**
     * Custom format template for the first line
     * Available placeholders: {{icon}}, {{cwe}}, {{owasp}}, {{cvss}}, {{severity}}, {{description}}, {{compliance}}
     * @default '{{icon}} {{cwe}} {{owasp}} {{cvss}} | {{description}} | {{severity}} {{compliance}}'
     */
    line1Format?: string;
    /**
     * Custom format template for the second line
     * Available placeholders: {{fix}}, {{documentation}}, {{jira}}, {{confluence}}, {{custom}}
     * @default '   Fix: {{fix}} | {{documentation}}'
     */
    line2Format?: string;
    /**
     * Jira integration template
     * Available placeholders: {{summary}}, {{description}}, {{priority}}, {{labels}}, {{project}}
     * @example 'https://jira.company.com/secure/CreateIssue.jspa?summary={{summary}}&priority={{priority}}'
     */
    jiraTemplate?: string;
    /**
     * Confluence documentation link template
     * @example 'https://confluence.company.com/wiki/security/{{cwe}}'
     */
    confluenceTemplate?: string;
    /**
     * Custom metadata to include in messages
     */
    customMetadata?: Record<string, string>;
    /**
     * Organization name for branding
     */
    organizationName?: string;
    /**
     * Custom compliance frameworks beyond standard ones
     * @example ['COMPANY-SEC-001', 'TEAM-POLICY-A']
     */
    customCompliance?: string[];
}
/**
 * Extended message options with template support
 */
export interface TemplatedMessageOptions extends EnterpriseMessageOptions {
    /** Name of the registered template to use */
    templateName?: string;
    /** Inline template configuration (overrides registered template) */
    templateConfig?: MessageTemplateConfig;
    /** Jira-specific data for template */
    jiraData?: {
        summary?: string;
        priority?: 'Critical' | 'High' | 'Medium' | 'Low';
        labels?: string[];
        project?: string;
    };
    /** Custom placeholder values */
    customPlaceholders?: Record<string, string>;
}
/**
 * SARIF result interface for security tool integration
 * @see https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
 */
export interface SARIFResult {
    ruleId: string;
    level: 'error' | 'warning' | 'note' | 'none';
    message: {
        text: string;
    };
    properties: {
        'security-severity'?: string;
        cwe?: string;
        owasp?: string;
        cvss?: number;
        compliance?: ComplianceFramework[];
        fix?: string;
    };
}
/**
 * Execution environment for message formatting
 * Used to determine the output format (Human vs Agent)
 */
export type MessagingEnvironment = 'CLI' | 'CI' | 'IDE_CURSOR' | 'AGENT_JSON';
/**
 * Options for AI-Native messaging
 * Extends enterprise options with agent-specific fields
 */
export interface AgentMessageOptions extends EnterpriseMessageOptions {
    /**
     * Precise AST selector for the issue
     * Guides the agent to the exact code construct to fix
     * @example "CallExpression[callee.name='eval']"
     */
    astSelector?: string;
    /**
     * Hidden reasoning hints for the agent
     * Embedded as comments or metadata
     */
    aiHints?: string[];
    /**
     * Difficulty level for the AI to fix
     * 'trivial': Simple search/replace or defined fix
     * 'reasoning_required': Needs context/logic analysis
     */
    aiDifficulty?: 'trivial' | 'reasoning_required';
}
