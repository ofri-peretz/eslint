/**
 * @forge-js/eslint-plugin-utils
 * 
 * Core utilities for creating TypeScript ESLint plugins
 * Inspired by typescript-eslint's infrastructure
 * 
 * This package provides:
 * - Rule creator utilities
 * - AST utilities
 * - Type utilities
 * - LLM message formatting with enterprise security benchmarks
 * - OWASP Top 10, CVSS, CWE mappings
 * - SARIF output for security tool integration
 */

export * from './rule-creator';
export * from './ast-utils';
export * from './type-utils';
export * from './llm-message-format';

// Re-export specific enterprise types for convenience
export type {
  Severity,
  OWASPCategory,
  OWASP2025Category,
  OWASP2021Category,
  ComplianceFramework,
  LLMMessageOptions,
  EnterpriseMessageOptions,
  SARIFResult,
} from './llm-message-format';

export {
  CVSS_RANGES,
  CWE_MAPPING,
  CWE_COMPLIANCE_MAPPING,
  OWASP_DETAILS,
  OWASP_2025_DETAILS,
  OWASP_2021_DETAILS,
  OWASP_2021_TO_2025,
  getSecurityBenchmarks,
  severityToCVSS,
  toSARIF,
} from './llm-message-format';

/**
 * Re-export commonly used types and utilities from @typescript-eslint/utils
 */
export { ESLintUtils, AST_NODE_TYPES } from '@typescript-eslint/utils';

export type {
  TSESLint,
  TSESTree,
  ParserServices,
} from '@typescript-eslint/utils';

