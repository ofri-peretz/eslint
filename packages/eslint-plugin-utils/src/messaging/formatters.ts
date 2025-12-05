/**
 * Runtime functions for LLM message formatting
 * 
 * Contains all formatting functions, template processing, and message generation logic
 */

import type {
  Severity,
  OWASPCategory,
  ComplianceFramework,
  LLMMessageOptions,
  EnterpriseMessageOptions,
  MessageTemplateConfig,
  TemplatedMessageOptions,
  SARIFResult,
} from './types';
import {
  CWE_MAPPING,
  CWE_COMPLIANCE_MAPPING,
  OWASP_DETAILS,
  severityToCVSS,
} from './constants';

// ============================================================================
// CORE FORMATTING FUNCTIONS
// ============================================================================

/**
 * Auto-enriches options with security benchmark data based on CWE
 */
function enrichFromCWE(options: EnterpriseMessageOptions): EnterpriseMessageOptions {
  if (!options.cwe) return options;

  const cweData = CWE_MAPPING[options.cwe];
  if (!cweData) return options;

  return {
    ...options,
    owasp: options.owasp ?? cweData.owasp,
    cvss: options.cvss ?? cweData.cvss,
    compliance: options.compliance ?? CWE_COMPLIANCE_MAPPING[options.cwe],
  };
}

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
export function formatLLMMessage(options: LLMMessageOptions | EnterpriseMessageOptions): string {
  // Enrich with security benchmark data from CWE
  const enriched = enrichFromCWE(options as EnterpriseMessageOptions);
  const { icon, cwe, description, severity, fix, documentationLink } = enriched;
  const owasp = (enriched as EnterpriseMessageOptions).owasp;
  const cvss = (enriched as EnterpriseMessageOptions).cvss;
  const compliance = (enriched as EnterpriseMessageOptions).compliance;

  // Build standards reference string (labeled for LLM + human clarity)
  const standards: string[] = [];
  if (cwe) standards.push(cwe);
  if (owasp) {
    // Format: "OWASP:A05-Injection" - includes category name for clarity across years
    const owaspCode = owasp.split(':')[0]; // "A05" from "A05:2025"
    const owaspDetails = OWASP_DETAILS[owasp];
    const owaspName = owaspDetails?.name?.split(' ')[0] || ''; // First word: "Injection", "Broken", etc.
    standards.push(`OWASP:${owaspCode}-${owaspName}`);
  }
  if (cvss !== undefined) standards.push(`CVSS:${cvss}`);

  const standardsPart = standards.length > 0 ? `${standards.join(' ')} | ` : '';

  // Build compliance tags (compact)
  const compliancePart =
    compliance && compliance.length > 0 ? ` [${compliance.slice(0, 4).join(',')}]` : '';

  // Line 1: Icon + Standards + Description + Severity + Compliance
  const firstLine = `${icon} ${standardsPart}${description} | ${severity}${compliancePart}`;

  // Line 2: Fix instruction + documentation link
  const secondLine = `   Fix: ${fix} | ${documentationLink}`;

  return `${firstLine}\n${secondLine}`;
}

/**
 * Helper function for creating LLM-optimized messages with template variables.
 * @param options - Message configuration options (supports template variables)
 * @returns Formatted error message string with template variables
 */
export function formatLLMMessageTemplate(
  options: LLMMessageOptions | EnterpriseMessageOptions
): string {
  return formatLLMMessage(options);
}

/**
 * Get enriched security benchmark data for a CWE
 * Useful for programmatic access to OWASP/CVSS data
 *
 * @param cwe - CWE identifier (e.g., 'CWE-89')
 * @returns Security benchmark data or undefined
 */
export function getSecurityBenchmarks(cwe: string): {
  owasp: OWASPCategory;
  owaspName: string;
  owaspLink: string;
  cvss: number;
  severity: Severity;
  name: string;
  compliance: ComplianceFramework[];
} | undefined {
  const cweData = CWE_MAPPING[cwe];
  if (!cweData) return undefined;

  const owaspDetails = OWASP_DETAILS[cweData.owasp];

  return {
    owasp: cweData.owasp,
    owaspName: owaspDetails.name,
    owaspLink: owaspDetails.link,
    cvss: cweData.cvss,
    severity: cweData.severity,
    name: cweData.name,
    compliance: CWE_COMPLIANCE_MAPPING[cwe] ?? [],
  };
}

// ============================================================================
// CUSTOM MESSAGE TEMPLATES FOR ORGANIZATIONS
// ============================================================================

/**
 * Global message template registry
 * Organizations can register their custom templates here
 */
const templateRegistry = new Map<string, MessageTemplateConfig>();

/**
 * Register a custom message template for your organization
 *
 * @example
 * ```typescript
 * // In your ESLint plugin setup
 * import { registerMessageTemplate } from '@forge-js/eslint-plugin-utils';
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
export function registerMessageTemplate(name: string, config: MessageTemplateConfig): void {
  templateRegistry.set(name, config);
}

/**
 * Get a registered message template
 */
export function getMessageTemplate(name: string): MessageTemplateConfig | undefined {
  return templateRegistry.get(name);
}

/**
 * List all registered message templates
 */
export function listMessageTemplates(): string[] {
  return Array.from(templateRegistry.keys());
}

/**
 * Clear all registered templates (useful for testing)
 */
export function clearMessageTemplates(): void {
  templateRegistry.clear();
}

/**
 * Replace template placeholders with actual values
 */
function replacePlaceholders(
  template: string,
  values: Record<string, string | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return values[key] ?? match;
  });
}

/**
 * Format an LLM message using a custom organization template
 *
 * @example
 * ```typescript
 * import { formatWithTemplate, registerMessageTemplate } from '@forge-js/eslint-plugin-utils';
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
export function formatWithTemplate(options: TemplatedMessageOptions): string {
  // Get template configuration
  const templateConfig =
    options.templateConfig ??
    (options.templateName ? getMessageTemplate(options.templateName) : undefined);

  // If no template, use default formatting
  if (!templateConfig) {
    return formatLLMMessage(options);
  }

  // Enrich with security benchmark data
  const enriched = enrichFromCWE(options);
  const owasp = (enriched as EnterpriseMessageOptions).owasp;
  const cvss = (enriched as EnterpriseMessageOptions).cvss ?? severityToCVSS(enriched.severity as Severity);
  const compliance = (enriched as EnterpriseMessageOptions).compliance ?? [];

  // Build Jira URL if template provided
  let jiraUrl = '';
  if (templateConfig.jiraTemplate && options.jiraData) {
    jiraUrl = replacePlaceholders(templateConfig.jiraTemplate, {
      summary: encodeURIComponent(options.jiraData.summary ?? options.description),
      priority: options.jiraData.priority ?? 'Medium',
      labels: options.jiraData.labels?.join(',') ?? '',
      project: options.jiraData.project ?? 'SEC',
      description: encodeURIComponent(options.description),
    });
  }

  // Build Confluence URL if template provided
  let confluenceUrl = '';
  if (templateConfig.confluenceTemplate) {
    confluenceUrl = replacePlaceholders(templateConfig.confluenceTemplate, {
      cwe: options.cwe ?? '',
      owasp: owasp ?? '',
    });
  }

  // Build OWASP display string
  const owaspDisplay = owasp
    ? `OWASP:${owasp.split(':')[0]}`
    : '';

  // Build compliance display string (including custom compliance)
  const allCompliance = [...compliance, ...(templateConfig.customCompliance ?? [])];
  const complianceDisplay =
    allCompliance.length > 0 ? `[${allCompliance.slice(0, 4).join(',')}]` : '';

  // Prepare all placeholder values
  const placeholderValues: Record<string, string | undefined> = {
    icon: enriched.icon,
    cwe: enriched.cwe,
    owasp: owaspDisplay,
    cvss: `CVSS:${cvss}`,
    severity: enriched.severity,
    description: enriched.description,
    compliance: complianceDisplay,
    fix: enriched.fix,
    documentation: enriched.documentationLink,
    jira: jiraUrl,
    confluence: confluenceUrl,
    organization: templateConfig.organizationName ?? '',
    ...templateConfig.customMetadata,
    ...options.customPlaceholders,
  };

  // Format lines using templates
  const line1Template =
    templateConfig.line1Format ??
    '{{icon}} {{cwe}} {{owasp}} {{cvss}} | {{description}} | {{severity}} {{compliance}}';
  const line2Template = templateConfig.line2Format ?? '   Fix: {{fix}} | {{documentation}}';

  const line1 = replacePlaceholders(line1Template, placeholderValues)
    .replace(/\s+\|/g, ' |')
    .replace(/\|\s+\|/g, '|')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const line2 = replacePlaceholders(line2Template, placeholderValues)
    .replace(/\s+\|/g, ' |')
    .replace(/\|\s+\|/g, '|')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return `${line1}\n${line2}`;
}

// ============================================================================
// SARIF OUTPUT (Enterprise Security Tool Integration)
// ============================================================================

/**
 * Converts message options to SARIF format for security tool integration
 * Supports: GitHub Advanced Security, Snyk, SonarQube, Checkmarx
 *
 * @param options - Message options
 * @returns SARIF-compatible result object
 */
export function toSARIF(options: EnterpriseMessageOptions): SARIFResult {
  const enriched = enrichFromCWE(options);

  return {
    ruleId: options.ruleId || options.cwe || options.issueName.replace(/\s+/g, '-').toLowerCase(),
    level: severityToSARIFLevel(enriched.severity as Severity),
    message: { text: enriched.description },
    properties: {
      'security-severity': enriched.cvss?.toString() ?? severityToCVSS(enriched.severity as Severity).toString(),
      cwe: enriched.cwe,
      owasp: enriched.owasp,
      cvss: enriched.cvss ?? severityToCVSS(enriched.severity as Severity),
      compliance: enriched.compliance,
      fix: enriched.fix,
    },
  };
}

/**
 * Convert severity to SARIF level
 */
function severityToSARIFLevel(severity: Severity | string): 'error' | 'warning' | 'note' | 'none' {
  switch (severity) {
    case 'CRITICAL':
    case 'HIGH':
      return 'error';
    case 'MEDIUM':
      return 'warning';
    case 'LOW':
    case 'INFO':
      return 'note';
    default:
      return 'none';
  }
}
