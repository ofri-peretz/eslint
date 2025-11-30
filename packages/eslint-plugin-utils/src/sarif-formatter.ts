/**
 * ESLint SARIF Formatter for GitHub Advanced Security Integration
 *
 * This formatter outputs ESLint results in SARIF (Static Analysis Results Interchange Format)
 * which is compatible with:
 * - GitHub Advanced Security (Code Scanning)
 * - Azure DevOps
 * - Snyk
 * - SonarQube
 * - Checkmarx
 *
 * @see https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning
 * @see https://sarifweb.azurewebsites.net/
 */

import type { ESLint } from 'eslint';
import { CWE_MAPPING, severityToCVSS } from './llm-message-format';

// =============================================================================
// SARIF Types (v2.1.0)
// =============================================================================

export interface SARIFLog {
  version: '2.1.0';
  $schema: string;
  runs: SARIFRun[];
}

export interface SARIFRun {
  tool: SARIFTool;
  results: SARIFResultItem[];
  invocations?: SARIFInvocation[];
  originalUriBaseIds?: Record<string, { uri: string }>;
}

export interface SARIFTool {
  driver: SARIFToolDriver;
}

export interface SARIFToolDriver {
  name: string;
  version?: string;
  informationUri?: string;
  rules?: SARIFRule[];
}

export interface SARIFRule {
  id: string;
  name?: string;
  shortDescription?: { text: string };
  fullDescription?: { text: string };
  helpUri?: string;
  defaultConfiguration?: {
    level?: 'none' | 'note' | 'warning' | 'error';
  };
  properties?: {
    'security-severity'?: string;
    tags?: string[];
    precision?: 'very-high' | 'high' | 'medium' | 'low';
  };
}

export interface SARIFResultItem {
  ruleId: string;
  ruleIndex?: number;
  level: 'none' | 'note' | 'warning' | 'error';
  message: { text: string };
  locations: SARIFLocation[];
  fingerprints?: Record<string, string>;
  properties?: Record<string, unknown>;
}

export interface SARIFLocation {
  physicalLocation: {
    artifactLocation: {
      uri: string;
      uriBaseId?: string;
    };
    region?: {
      startLine: number;
      startColumn?: number;
      endLine?: number;
      endColumn?: number;
    };
  };
}

export interface SARIFInvocation {
  executionSuccessful: boolean;
  toolExecutionNotifications?: SARIFNotification[];
}

export interface SARIFNotification {
  message: { text: string };
  level: 'none' | 'note' | 'warning' | 'error';
}

// =============================================================================
// Formatter Options
// =============================================================================

export interface SARIFFormatterOptions {
  /** Tool name to display in SARIF output. Default: '@forge-js/eslint-plugin-llm-optimized' */
  toolName?: string;
  /** Tool version. Default: auto-detected from package.json */
  toolVersion?: string;
  /** Information URI for the tool */
  toolUri?: string;
  /** Include rule definitions in output. Default: true */
  includeRuleDefinitions?: boolean;
  /** Base URI for file paths. Default: 'file:///' */
  baseUri?: string;
  /** Extract security metadata from CWE patterns in messages. Default: true */
  extractSecurityMetadata?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract CWE ID from ESLint message
 */
function extractCWE(message: string): string | undefined {
  const match = message.match(/CWE-(\d+)/i);
  return match ? `CWE-${match[1]}` : undefined;
}

/**
 * Extract severity from ESLint message
 */
function extractSeverity(message: string): string | undefined {
  const match = message.match(/\|\s*(CRITICAL|HIGH|MEDIUM|LOW|INFO)\s*$/i);
  return match ? match[1].toUpperCase() : undefined;
}

/**
 * Convert ESLint severity to SARIF level
 */
function eslintSeverityToSARIFLevel(
  severity: 0 | 1 | 2,
  messageSeverity?: string
): 'none' | 'note' | 'warning' | 'error' {
  // Use extracted severity from message if available
  if (messageSeverity) {
    switch (messageSeverity) {
      case 'CRITICAL':
      case 'HIGH':
        return 'error';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
      case 'INFO':
        return 'note';
    }
  }

  // Fallback to ESLint severity
  switch (severity) {
    case 0:
      return 'none';
    case 1:
      return 'warning';
    case 2:
      return 'error';
    default:
      return 'warning';
  }
}

/**
 * Get security severity from CWE or message severity
 */
function getSecuritySeverity(cwe?: string, messageSeverity?: string): string | undefined {
  if (cwe && cwe in CWE_MAPPING) {
    const mapping = CWE_MAPPING[cwe as keyof typeof CWE_MAPPING];
    return mapping.cvss.toString();
  }

  if (messageSeverity) {
    return severityToCVSS(messageSeverity as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW').toString();
  }

  return undefined;
}

/**
 * Generate fingerprint for deduplication
 */
function generateFingerprint(
  ruleId: string,
  filePath: string,
  line: number,
  column: number
): string {
  const data = `${ruleId}:${filePath}:${line}:${column}`;
  // Simple hash function for fingerprint
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Normalize file path for SARIF
 */
function normalizeFilePath(filePath: string, baseUri?: string): string {
  // Convert backslashes to forward slashes
  let normalized = filePath.replace(/\\/g, '/');

  // Remove base URI prefix if present
  if (baseUri && normalized.startsWith(baseUri)) {
    normalized = normalized.slice(baseUri.length);
  }

  // Ensure no leading slash for relative paths
  normalized = normalized.replace(/^\/+/, '');

  return normalized;
}

// =============================================================================
// Main Formatter Function
// =============================================================================

/**
 * Create SARIF formatter with options
 *
 * @example
 * ```javascript
 * // eslint.config.js
 * export default [
 *   // ... your config
 * ];
 *
 * // Run with: eslint --format @forge-js/eslint-plugin-utils/sarif-formatter .
 * ```
 *
 * @example
 * ```typescript
 * // Programmatic usage
 * import { createSARIFFormatter } from '@forge-js/eslint-plugin-utils';
 *
 * const formatter = createSARIFFormatter({
 *   toolName: 'My Custom Linter',
 *   toolVersion: '1.0.0',
 *   includeRuleDefinitions: true,
 * });
 *
 * const sarif = formatter(eslintResults);
 * console.log(JSON.stringify(sarif, null, 2));
 * ```
 */
export function createSARIFFormatter(options: SARIFFormatterOptions = {}) {
  const {
    toolName = '@forge-js/eslint-plugin-llm-optimized',
    toolVersion = '1.8.1',
    toolUri = 'https://github.com/ofri-peretz/forge-js',
    includeRuleDefinitions = true,
    baseUri,
    extractSecurityMetadata = true,
  } = options;

  return function formatSARIF(results: ESLint.LintResult[]): string {
    const sarifResults: SARIFResultItem[] = [];
    const rulesMap = new Map<string, SARIFRule>();

    for (const result of results) {
      const filePath = normalizeFilePath(result.filePath, baseUri);

      for (const message of result.messages) {
        const ruleId = message.ruleId || 'unknown';
        const cwe = extractSecurityMetadata ? extractCWE(message.message) : undefined;
        const severity = extractSecurityMetadata ? extractSeverity(message.message) : undefined;
        const level = eslintSeverityToSARIFLevel(message.severity, severity);
        const securitySeverity = getSecuritySeverity(cwe, severity);

        // Add rule definition if not already added
        if (includeRuleDefinitions && !rulesMap.has(ruleId)) {
          const rule: SARIFRule = {
            id: ruleId,
            shortDescription: { text: ruleId },
            defaultConfiguration: { level },
          };

          if (securitySeverity) {
            rule.properties = {
              'security-severity': securitySeverity,
              tags: cwe ? ['security', cwe] : ['code-quality'],
            };
          }

          rulesMap.set(ruleId, rule);
        }

        // Create SARIF result
        const sarifResult: SARIFResultItem = {
          ruleId,
          ruleIndex: includeRuleDefinitions
            ? Array.from(rulesMap.keys()).indexOf(ruleId)
            : undefined,
          level,
          message: { text: message.message },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: filePath,
                  uriBaseId: baseUri ? '%SRCROOT%' : undefined,
                },
                region: {
                  startLine: message.line,
                  startColumn: message.column,
                  endLine: message.endLine || message.line,
                  endColumn: message.endColumn || message.column,
                },
              },
            },
          ],
          fingerprints: {
            primaryLocationLineHash: generateFingerprint(
              ruleId,
              filePath,
              message.line,
              message.column
            ),
          },
        };

        // Add security properties if available
        if (cwe || severity) {
          sarifResult.properties = {
            cwe,
            severity,
            securitySeverity,
          };
        }

        sarifResults.push(sarifResult);
      }
    }

    const hasErrors = results.some((r) => r.errorCount > 0);

    const sarifLog: SARIFLog = {
      version: '2.1.0',
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      runs: [
        {
          tool: {
            driver: {
              name: toolName,
              version: toolVersion,
              informationUri: toolUri,
              rules: includeRuleDefinitions ? Array.from(rulesMap.values()) : undefined,
            },
          },
          results: sarifResults,
          invocations: [
            {
              executionSuccessful: !hasErrors,
            },
          ],
          originalUriBaseIds: baseUri
            ? {
                '%SRCROOT%': { uri: baseUri },
              }
            : undefined,
        },
      ],
    };

    return JSON.stringify(sarifLog, null, 2);
  };
}

/**
 * Default SARIF formatter for ESLint CLI usage
 *
 * @example
 * ```bash
 * eslint --format @forge-js/eslint-plugin-utils/sarif-formatter .
 * ```
 */
export const sarifFormatter = createSARIFFormatter();

// Default export for ESLint formatter API
export default sarifFormatter;

