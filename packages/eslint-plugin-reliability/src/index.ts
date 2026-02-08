/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESLint } from '@interlace/eslint-devkit';

// Error handling rules
import { noUnhandledPromise } from './rules/error-handling/no-unhandled-promise';
import { noSilentErrors } from './rules/error-handling/no-silent-errors';
import { noMissingErrorContext } from './rules/error-handling/no-missing-error-context';
import { errorMessage } from './rules/error-handling/error-message';

// Reliability rules
import { noMissingNullChecks } from './rules/reliability/no-missing-null-checks';
import { noUnsafeTypeNarrowing } from './rules/reliability/no-unsafe-type-narrowing';
import { requireNetworkTimeout } from './rules/reliability/require-network-timeout';
import { noAwaitInLoop } from './rules/reliability/no-await-in-loop';
import { noJsdocTerminatorInExample } from './rules/reliability/no-jsdoc-terminator-in-example';

export const rules = {
  'no-unhandled-promise': noUnhandledPromise,
  'no-silent-errors': noSilentErrors,
  'no-missing-error-context': noMissingErrorContext,
  'error-message': errorMessage,
  'no-missing-null-checks': noMissingNullChecks,
  'no-unsafe-type-narrowing': noUnsafeTypeNarrowing,
  'require-network-timeout': requireNetworkTimeout,
  'no-await-in-loop': noAwaitInLoop,
  'no-jsdoc-terminator-in-example': noJsdocTerminatorInExample,

  // Categorized names
  'error-handling/no-unhandled-promise': noUnhandledPromise,
  'error-handling/no-silent-errors': noSilentErrors,
  'error-handling/no-missing-error-context': noMissingErrorContext,
  'error-handling/error-message': errorMessage,
  'reliability/no-missing-null-checks': noMissingNullChecks,
  'reliability/no-unsafe-type-narrowing': noUnsafeTypeNarrowing,
  'reliability/require-network-timeout': requireNetworkTimeout,
  'reliability/no-await-in-loop': noAwaitInLoop,
  'reliability/no-jsdoc-terminator-in-example': noJsdocTerminatorInExample,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

export const plugin = {
  meta: {
    name: 'eslint-plugin-reliability',
    version: '1.0.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

export const configs = {
  recommended: {
    plugins: {
      reliability: plugin,
    },
    rules: {
      'reliability/no-silent-errors': 'warn',
      'reliability/no-missing-null-checks': 'warn',
      'reliability/require-network-timeout': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,
} satisfies Record<string, TSESLint.FlatConfig.Config>;

export default plugin;
