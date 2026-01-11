/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @eslint/eslint-plugin-architecture
 */

import type { TSESLint } from '@interlace/eslint-devkit';

// Architecture rules
import { consistentExistenceIndexCheck } from './rules/architecture/consistent-existence-index-check';
import { preferEventTarget } from './rules/architecture/prefer-event-target';
import { preferAt } from './rules/architecture/prefer-at';
import { noUnreadableIife } from './rules/architecture/no-unreadable-iife';
import { noAwaitInLoop } from './rules/architecture/no-await-in-loop';
import { noExternalApiCallsInUtils } from './rules/architecture/no-external-api-calls-in-utils';
import { consistentFunctionScoping } from './rules/architecture/consistent-function-scoping';
import { filenameCase } from './rules/architecture/filename-case';
import { noInstanceofArray } from './rules/architecture/no-instanceof-array';

// DDD rules
import { dddAnemicDomainModel } from './rules/ddd/ddd-anemic-domain-model';
import { dddValueObjectImmutability } from './rules/ddd/ddd-value-object-immutability';

// Domain rules
import { enforceNaming } from './rules/domain/enforce-naming';

// API rules
import { enforceRestConventions } from './rules/api/enforce-rest-conventions';

export const rules = {
  // Flat names
  'consistent-existence-index-check': consistentExistenceIndexCheck,
  'prefer-event-target': preferEventTarget,
  'prefer-at': preferAt,
  'no-unreadable-iife': noUnreadableIife,
  'no-await-in-loop': noAwaitInLoop,
  'no-external-api-calls-in-utils': noExternalApiCallsInUtils,
  'consistent-function-scoping': consistentFunctionScoping,
  'filename-case': filenameCase,
  'no-instanceof-array': noInstanceofArray,
  'ddd-anemic-domain-model': dddAnemicDomainModel,
  'ddd-value-object-immutability': dddValueObjectImmutability,
  'enforce-naming': enforceNaming,
  'enforce-rest-conventions': enforceRestConventions,

  // Categorized names
  'architecture/consistent-existence-index-check': consistentExistenceIndexCheck,
  'architecture/prefer-event-target': preferEventTarget,
  'architecture/prefer-at': preferAt,
  'architecture/no-unreadable-iife': noUnreadableIife,
  'architecture/no-await-in-loop': noAwaitInLoop,
  'architecture/no-external-api-calls-in-utils': noExternalApiCallsInUtils,
  'architecture/consistent-function-scoping': consistentFunctionScoping,
  'architecture/filename-case': filenameCase,
  'architecture/no-instanceof-array': noInstanceofArray,
  'ddd/ddd-anemic-domain-model': dddAnemicDomainModel,
  'ddd/ddd-value-object-immutability': dddValueObjectImmutability,
  'domain/enforce-naming': enforceNaming,
  'api/enforce-rest-conventions': enforceRestConventions,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

export const plugin = {
  meta: {
    name: '@eslint/eslint-plugin-architecture',
    version: '1.0.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

export const configs = {
  recommended: {
    plugins: {
      '@eslint/architecture': plugin,
    },
    rules: {
      '@eslint/architecture/architecture/no-external-api-calls-in-utils': 'warn',
      '@eslint/architecture/architecture/prefer-at': 'warn',
      '@eslint/architecture/ddd/ddd-anemic-domain-model': 'warn',
      '@eslint/architecture/domain/enforce-naming': 'warn',
      '@eslint/architecture/api/enforce-rest-conventions': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,
} satisfies Record<string, TSESLint.FlatConfig.Config>;

export default plugin;
