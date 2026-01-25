/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { noInstanceofArray } from './rules/no-instanceof-array';
import { preferAt } from './rules/prefer-at';
import { preferEventTarget } from './rules/prefer-event-target';

import { TSESLint } from '@interlace/eslint-devkit';

/**
 * Collection of all code modernization and ESNext migration ESLint rules
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  'no-instanceof-array': noInstanceofArray,
  'prefer-at': preferAt,
  'prefer-event-target': preferEventTarget,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-modernization',
    version: '1.0.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Preset configurations for modernization rules
 */
const recommendedRules: Record<string, TSESLint.FlatConfig.RuleEntry> = {
  'modernization/no-instanceof-array': 'error',
  'modernization/prefer-at': 'warn',
  'modernization/prefer-event-target': 'warn',
};

export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  recommended: {
    plugins: {
      'modernization': plugin,
    },
    rules: recommendedRules,
  } satisfies TSESLint.FlatConfig.Config,
  
  strict: {
    plugins: {
      'modernization': plugin,
    },
    rules: Object.fromEntries(
      Object.keys(rules).map(ruleName => [`modernization/${ruleName}`, 'error'])
    ),
  } satisfies TSESLint.FlatConfig.Config,
};

export default plugin;
