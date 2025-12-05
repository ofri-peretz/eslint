/**
 * @interlace/eslint-devkit
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
 * - Custom message templates for organizations
 */

// Rule creation utilities
export * from './rule-creation';

// AST utilities
export * from './ast/ast-utils';

// Type utilities
export * from './types/type-utils';

// LLM messaging utilities
export * from './messaging';

// Security utilities
export * from './security';

// Node utilities
export * from './node';

// Resolver and dependency analysis utilities
export * from './resolver';

// Other utilities
export * from './aria-definitions';

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
} from './messaging';

export {
  CVSS_RANGES,
  CWE_MAPPING,
  CWE_COMPLIANCE_MAPPING,
  OWASP_DETAILS,
  OWASP_2025_DETAILS,
  OWASP_2021_DETAILS,
  OWASP_2021_TO_2025,
  MessageIcons,
  getSecurityBenchmarks,
  severityToCVSS,
  toSARIF,
} from './messaging';

/**
 * Re-export commonly used types and utilities from @typescript-eslint/utils
 */
export { ESLintUtils, AST_NODE_TYPES } from '@typescript-eslint/utils';

export type {
  TSESLint,
  TSESTree,
  ParserServices,
} from '@typescript-eslint/utils';
