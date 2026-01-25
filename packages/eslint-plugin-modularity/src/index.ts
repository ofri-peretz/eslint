/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { dddAnemicDomainModel } from './rules/ddd-anemic-domain-model';
import { dddValueObjectImmutability } from './rules/ddd-value-object-immutability';
import { enforceNaming } from './rules/enforce-naming';
import { enforceRestConventions } from './rules/enforce-rest-conventions';
import { noExternalApiCallsInUtils } from './rules/no-external-api-calls-in-utils';

import { TSESLint } from '@interlace/eslint-devkit';

/**
 * Collection of all modularity and design pattern ESLint rules
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  'ddd-anemic-domain-model': dddAnemicDomainModel,
  'ddd-value-object-immutability': dddValueObjectImmutability,
  'enforce-naming': enforceNaming,
  'enforce-rest-conventions': enforceRestConventions,
  'no-external-api-calls-in-utils': noExternalApiCallsInUtils,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-modularity',
    version: '1.0.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Preset configurations for modularity rules
 */
const recommendedRules: Record<string, TSESLint.FlatConfig.RuleEntry> = {
  'modularity/ddd-anemic-domain-model': 'warn',
  'modularity/ddd-value-object-immutability': 'error',
  'modularity/enforce-naming': 'warn',
  'modularity/enforce-rest-conventions': 'error',
  'modularity/no-external-api-calls-in-utils': 'error',
};

export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  recommended: {
    plugins: {
      'modularity': plugin,
    },
    rules: recommendedRules,
  } satisfies TSESLint.FlatConfig.Config,
  
  strict: {
    plugins: {
      'modularity': plugin,
    },
    rules: Object.fromEntries(
      Object.keys(rules).map(ruleName => [`modularity/${ruleName}`, 'error'])
    ),
  } satisfies TSESLint.FlatConfig.Config,
};

export default plugin;
