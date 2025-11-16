/**
 * LLM-Optimized Error Message Formatting
 * 
 * Provides utilities for creating consistent, LLM-friendly error messages
 * that follow the 2-line format standard.
 * 
 * Format:
 * Line 1: [Icon] [Issue Name] | [Description] | [SEVERITY]
 * Line 2:    Fix: [specific fix instruction] | [documentation link]
 */

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface LLMMessageOptions {
  /** Icon emoji (e.g., '🔒', '⚠️', '📦', '🔧') */
  icon: string;
  /** Issue name (e.g., 'SQL Injection', 'Dependency Version Strategy') - kept for backwards compatibility, description is used in format */
  issueName: string;
  /** CWE reference (optional, e.g., 'CWE-89', 'CWE-915') */
  cwe?: string;
  /** Description of the issue - this appears in the formatted message (e.g., 'SQL Injection detected') */
  description: string;
  /** Severity level (can be a template variable like '{{riskLevel}}') */
  severity: Severity | string;
  /** Specific fix instruction */
  fix: string;
  /** Documentation link */
  documentationLink: string;
}

/**
 * Creates an LLM-optimized error message following the 2-line format standard.
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
 * // Returns: '🔒 CWE-89 | SQL Injection detected | CRITICAL\n   Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId]) | https://owasp.org/www-community/attacks/SQL_Injection'
 * ```
 */
export function formatLLMMessage(options: LLMMessageOptions): string {
  const { icon, cwe, description, severity, fix, documentationLink } = options;

  // Build first line: [Icon] [CWE?] | [Description] | [SEVERITY]
  // Note: issueName is kept for backwards compatibility but not used in format
  // The description should be the full message (e.g., "SQL Injection detected")
  const cwePart = cwe ? `${cwe} | ` : '';
  const firstLine = `${icon} ${cwePart}${description} | ${severity}`;

  // Build second line:    Fix: [fix instruction] | [documentation link]
  const secondLine = `   Fix: ${fix} | ${documentationLink}`;

  return `${firstLine}\n${secondLine}`;
}

/**
 * Helper function for creating LLM-optimized messages with template variables.
 * Useful when severity or other parts need to be dynamic.
 * 
 * @param options - Message configuration options (supports template variables)
 * @returns Formatted error message string with template variables
 * 
 * @example
 * ```typescript
 * const message = formatLLMMessageTemplate({
 *   icon: '⚠️',
 *   issueName: 'Object injection',
 *   cwe: 'CWE-915',
 *   description: 'Object injection/Prototype pollution',
 *   severity: '{{riskLevel}}', // Dynamic severity
 *   fix: '{{safeAlternative}}', // Dynamic fix
 *   documentationLink: 'https://portswigger.net/web-security/prototype-pollution'
 * });
 * ```
 */
export function formatLLMMessageTemplate(options: LLMMessageOptions): string {
  // Same implementation, but documents that template variables are expected
  return formatLLMMessage(options);
}

/**
 * Common icon constants for consistency
 */
export const MessageIcons = {
  /** Security issues */
  SECURITY: '🔒',
  /** Warnings */
  WARNING: '⚠️',
  /** Package/dependency issues */
  PACKAGE: '📦',
  /** Development practices */
  DEVELOPMENT: '🔧',
  /** Performance issues */
  PERFORMANCE: '⚡',
  /** Accessibility issues */
  ACCESSIBILITY: '♿',
  /** Code quality */
  QUALITY: '📚',
  /** Architecture issues */
  ARCHITECTURE: '🏗️',
  /** Migration/refactoring */
  MIGRATION: '🔄',
  /** Deprecation */
  DEPRECATION: '❌',
  /** Domain/DDD */
  DOMAIN: '📖',
  /** Complexity */
  COMPLEXITY: '🧠',
  /** Duplication */
  DUPLICATION: '📋',
} as const;

