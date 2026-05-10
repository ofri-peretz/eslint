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
import './types/meta-augmentation';
export * from './rule-creation';
export * from './ast/ast-utils';
export * from './types/type-utils';
export * from './messaging';
export * from './security';
export * from './node';
export * from './resolver';
export * from './aria-definitions';
export type { Severity, OWASPCategory, OWASP2025Category, OWASP2021Category, OWASPServerlessCategory, ComplianceFramework, LLMMessageOptions, EnterpriseMessageOptions, SARIFResult, } from './messaging';
export { CVSS_RANGES, CWE_MAPPING, CWE_COMPLIANCE_MAPPING, OWASP_DETAILS, OWASP_2025_DETAILS, OWASP_2021_DETAILS, OWASP_SERVERLESS_DETAILS, OWASP_2021_TO_2025, MessageIcons, getSecurityBenchmarks, severityToCVSS, toSARIF, } from './messaging';
/**
 * Re-export commonly used types and utilities from @typescript-eslint/utils
 */
export { ESLintUtils, AST_NODE_TYPES } from '@typescript-eslint/utils';
export type { TSESLint, TSESTree, ParserServices, } from '@typescript-eslint/utils';
