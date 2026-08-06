/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-prisma-security
 *
 * ESLint plugin with security rules for Prisma.
 *
 * @see https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-prisma-security
 */

import { TSESLint } from '@interlace/eslint-devkit';

import { noMassAssignment } from './rules/no-mass-assignment';
import { noRawIdentifierInterpolation } from './rules/no-raw-identifier-interpolation';
import { noUnsafeQuery } from './rules/no-unsafe-query';
import { noUnscopedMutation } from './rules/no-unscoped-mutation';

/**
 * Collection of all rules
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  'no-mass-assignment': noMassAssignment,
  'no-raw-identifier-interpolation': noRawIdentifierInterpolation,
  'no-unsafe-query': noUnsafeQuery,
  'no-unscoped-mutation': noUnscopedMutation,
};

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-prisma-security',
    version: '0.3.1',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Preset configurations
 */
export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  /**
   * Flagship preset — the highest-signal rule(s) from this plugin, shippable
   * in a CI gate. Currently identical to `recommended`.
   */
  flagship: {
    plugins: { 'prisma-security': plugin },
    rules: {
      'prisma-security/no-unsafe-query': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Recommended preset — balanced security for most projects
   */
  recommended: {
    plugins: { 'prisma-security': plugin },
    rules: {
      'prisma-security/no-unsafe-query': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Strict preset — all rules as errors
   */
  strict: {
    plugins: { 'prisma-security': plugin },
    rules: Object.fromEntries(
      Object.keys(rules).map((ruleName) => [`prisma-security/${ruleName}`, 'error']),
    ),
  } satisfies TSESLint.FlatConfig.Config,
};

/**
 * Default export for ESLint plugin
 */
export default plugin;

export type { AllPrismaRulesOptions, NoRawIdentifierInterpolationOptions, NoMassAssignmentOptions, NoUnsafeQueryOptions, NoUnscopedMutationOptions } from './types/index';
