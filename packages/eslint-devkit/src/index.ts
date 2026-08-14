/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

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
// Side-effect import: extends `@typescript-eslint/utils` `RuleMetaDataDocs`
// with Interlace fields (cwe + cvss) so plugin authors can populate them
// without per-rule `@ts-expect-error`. See ./types/meta-augmentation.ts.
import './types/meta-augmentation';

export * from './rule-creation';

// AST utilities
export * from './ast/ast-utils';
export * from './ast/module-binding';
export * from './ast/static-expression';

// Type utilities
export * from './types/type-utils';

// LLM messaging utilities
export * from './messaging';

// Security utilities
export * from './security';

// Node utilities
export * from './node';

// Resolver and dependency analysis utilities.
// Kept in the barrel for compatibility — `oxc-resolver` itself is now loaded
// lazily inside `./resolver`, so importing this package no longer requires the
// native binary to be installed. Rules that resolve imports should declare
// `oxc-resolver` in their own dependencies.
export * from './resolver';

// Other utilities
export * from './aria-definitions';

// Re-export specific enterprise types for convenience
export type {
  Severity,
  OWASPCategory,
  OWASP2025Category,
  OWASP2021Category,
  OWASPServerlessCategory,
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
  OWASP_SERVERLESS_DETAILS,
  OWASP_2021_TO_2025,
  MessageIcons,
  getSecurityBenchmarks,
  severityToCVSS,
  toSARIF,
} from './messaging';

/**
 * Re-export commonly used types and utilities from typescript-eslint.
 *
 * ponytail: both of these used to be runtime imports from
 * `@typescript-eslint/utils`, which declares a non-optional `typescript` peer
 * and so pulled a 24 MB compiler into every consumer install. `AST_NODE_TYPES`
 * is now an inlined table (`./ast-node-types`) and `ESLintUtils` is our own
 * ported shim (`./rule-creation/rule-creator`). Together they take this
 * package to zero runtime dependencies. The type-only re-exports below still
 * point at `utils` — erased at compile time, so they cost nothing.
 */
export { AST_NODE_TYPES } from './ast-node-types';
export { ESLintUtils } from './rule-creation/rule-creator';

export type {
  TSESLint,
  TSESTree,
  ParserServices,
} from '@typescript-eslint/utils';
