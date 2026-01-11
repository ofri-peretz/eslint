/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-mongodb-security
 *
 * Security-focused ESLint plugin for MongoDB & Mongoose.
 * Detects NoSQL injection, operator attacks, credential exposure,
 * and ODM-specific vulnerabilities with AI-optimized fix guidance.
 *
 * Features:
 * - LLM-optimized error messages with CWE references
 * - OWASP Top 10 coverage (A01-A07)
 * - CVE detection (CVE-2025-23061, CVE-2024-53900)
 * - Full support for mongodb, mongoose, mongodb-client-encryption
 *
 * @see https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-mongodb-security
 */

import { TSESLint } from '@interlace/eslint-devkit';

// Critical - NoSQL Injection
import { noUnsafeQuery } from './rules/no-unsafe-query';
import { noOperatorInjection } from './rules/no-operator-injection';
import { noUnsafeWhere } from './rules/no-unsafe-where';
import { noUnsafeRegexQuery } from './rules/no-unsafe-regex-query';

// High - Credentials & Connection
import { noHardcodedConnectionString } from './rules/no-hardcoded-connection-string';
import { noHardcodedCredentials } from './rules/no-hardcoded-credentials';
import { requireTlsConnection } from './rules/require-tls-connection';
import { requireAuthMechanism } from './rules/require-auth-mechanism';

// Medium - Mongoose ODM
import { requireSchemaValidation } from './rules/require-schema-validation';
import { noSelectSensitiveFields } from './rules/no-select-sensitive-fields';
import { noBypassMiddleware } from './rules/no-bypass-middleware';
import { noUnsafePopulate } from './rules/no-unsafe-populate';

// Low - Best Practices
import { noUnboundedFind } from './rules/no-unbounded-find';
import { requireProjection } from './rules/require-projection';
import { requireLeanQueries } from './rules/require-lean-queries';
import { noDebugModeProduction } from './rules/no-debug-mode-production';

/**
 * Collection of all MongoDB security rules
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  // Critical - NoSQL Injection (OWASP A03)
  'no-unsafe-query': noUnsafeQuery,
  'no-operator-injection': noOperatorInjection,
  'no-unsafe-where': noUnsafeWhere,
  'no-unsafe-regex-query': noUnsafeRegexQuery,

  // High - Credentials & Connection (OWASP A02, A07)
  'no-hardcoded-connection-string': noHardcodedConnectionString,
  'no-hardcoded-credentials': noHardcodedCredentials,
  'require-tls-connection': requireTlsConnection,
  'require-auth-mechanism': requireAuthMechanism,

  // Medium - Mongoose ODM (OWASP A01, A04)
  'require-schema-validation': requireSchemaValidation,
  'no-select-sensitive-fields': noSelectSensitiveFields,
  'no-bypass-middleware': noBypassMiddleware,
  'no-unsafe-populate': noUnsafePopulate,

  // Low - Best Practices
  'no-unbounded-find': noUnboundedFind,
  'require-projection': requireProjection,
  'require-lean-queries': requireLeanQueries,
  'no-debug-mode-production': noDebugModeProduction,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-mongodb-security',
    version: '1.0.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Recommended rules configuration
 */
const recommendedRules: Record<string, TSESLint.FlatConfig.RuleEntry> = {
  // Critical - NoSQL Injection
  'mongodb-security/no-unsafe-query': 'error',
  'mongodb-security/no-operator-injection': 'error',
  'mongodb-security/no-unsafe-where': 'error',
  'mongodb-security/no-unsafe-regex-query': 'error',

  // High - Credentials & Connection
  'mongodb-security/no-hardcoded-connection-string': 'error',
  'mongodb-security/no-hardcoded-credentials': 'error',
  'mongodb-security/require-tls-connection': 'warn',
  'mongodb-security/require-auth-mechanism': 'warn',

  // Medium - Mongoose ODM
  'mongodb-security/require-schema-validation': 'warn',
  'mongodb-security/no-select-sensitive-fields': 'warn',
  'mongodb-security/no-bypass-middleware': 'warn',
  'mongodb-security/no-unsafe-populate': 'error',

  // Low - Best Practices
  'mongodb-security/no-unbounded-find': 'warn',
  'mongodb-security/require-projection': 'off',
  'mongodb-security/require-lean-queries': 'off',
  'mongodb-security/no-debug-mode-production': 'error',
};

/**
 * Preset configurations
 */
export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  /**
   * Recommended configuration
   * Critical rules as errors, high as warnings
   */
  recommended: {
    plugins: {
      'mongodb-security': plugin,
    },
    rules: recommendedRules,
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Strict configuration
   * All rules as errors
   */
  strict: {
    plugins: {
      'mongodb-security': plugin,
    },
    rules: Object.fromEntries(
      Object.keys(rules).map((ruleName) => [`mongodb-security/${ruleName}`, 'error'])
    ),
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Mongoose-focused configuration
   * ODM-specific rules for Mongoose projects
   */
  mongoose: {
    plugins: {
      'mongodb-security': plugin,
    },
    rules: {
      'mongodb-security/no-unsafe-query': 'error',
      'mongodb-security/no-operator-injection': 'error',
      'mongodb-security/no-unsafe-where': 'error',
      'mongodb-security/require-schema-validation': 'error',
      'mongodb-security/no-select-sensitive-fields': 'error',
      'mongodb-security/no-bypass-middleware': 'error',
      'mongodb-security/no-unsafe-populate': 'error',
      'mongodb-security/require-lean-queries': 'warn',
      'mongodb-security/no-debug-mode-production': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,
};

/**
 * Default export for ESLint plugin
 */
export default plugin;
