/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESLint } from '@interlace/eslint-devkit';

// Maintainability rules
import { cognitiveComplexity } from './rules/maintainability/cognitive-complexity';
import { nestedComplexityHotspots } from './rules/maintainability/nested-complexity-hotspots';
import { identicalFunctions } from './rules/maintainability/identical-functions';
import { maxParameters } from './rules/maintainability/max-parameters';
import { noLonelyIf } from './rules/maintainability/no-lonely-if';
import { noNestedTernary } from './rules/maintainability/no-nested-ternary';
import { consistentFunctionScoping } from './rules/maintainability/consistent-function-scoping';
import { noUnreadableIife } from './rules/maintainability/no-unreadable-iife';

// Error-handling rules (wired 2026-05-09 — implementations + docs both
// existed but the plugin index didn't register them; users following the
// docs couldn't enable them. They are also exported by `eslint-plugin-
// reliability` under the same names — the dual export is intentional
// because the rules apply to both maintainability and reliability concerns).
import { errorMessage } from './rules/error-handling/error-message';
import { noMissingErrorContext } from './rules/error-handling/no-missing-error-context';
import { noSilentErrors } from './rules/error-handling/no-silent-errors';
import { noUnhandledPromise } from './rules/error-handling/no-unhandled-promise';

export const rules = {
  'cognitive-complexity': cognitiveComplexity,
  'nested-complexity-hotspots': nestedComplexityHotspots,
  'identical-functions': identicalFunctions,
  'max-parameters': maxParameters,
  'no-lonely-if': noLonelyIf,
  'no-nested-ternary': noNestedTernary,
  'consistent-function-scoping': consistentFunctionScoping,
  'no-unreadable-iife': noUnreadableIife,
  'error-message': errorMessage,
  'no-missing-error-context': noMissingErrorContext,
  'no-silent-errors': noSilentErrors,
  'no-unhandled-promise': noUnhandledPromise,

  // Categorized names
  'maintainability/cognitive-complexity': cognitiveComplexity,
  'maintainability/nested-complexity-hotspots': nestedComplexityHotspots,
  'maintainability/identical-functions': identicalFunctions,
  'maintainability/max-parameters': maxParameters,
  'maintainability/no-lonely-if': noLonelyIf,
  'maintainability/no-nested-ternary': noNestedTernary,
  'maintainability/consistent-function-scoping': consistentFunctionScoping,
  'maintainability/no-unreadable-iife': noUnreadableIife,
  'maintainability/error-message': errorMessage,
  'maintainability/no-missing-error-context': noMissingErrorContext,
  'maintainability/no-silent-errors': noSilentErrors,
  'maintainability/no-unhandled-promise': noUnhandledPromise,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

export const plugin = {
  meta: {
    // Unscoped, matching package.json `name` and every other plugin in the
    // ecosystem (`eslint-plugin-*`). These packages are published WITHOUT the
    // `@interlace` scope; a scoped name here drifts from how consumers install
    // and reference the plugin. Locked in index.test.ts.
    name: 'eslint-plugin-maintainability',
    version: '3.0.7',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

export const configs = {
  recommended: {
    plugins: {
      'maintainability': plugin,
    },
    rules: {
      'maintainability/cognitive-complexity': 'warn',
      'maintainability/identical-functions': 'warn',
      'maintainability/max-parameters': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,
} satisfies Record<string, TSESLint.FlatConfig.Config>;

export default plugin;
