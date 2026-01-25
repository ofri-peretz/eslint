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

export const rules = {
  'cognitive-complexity': cognitiveComplexity,
  'nested-complexity-hotspots': nestedComplexityHotspots,
  'identical-functions': identicalFunctions,
  'max-parameters': maxParameters,
  'no-lonely-if': noLonelyIf,
  'no-nested-ternary': noNestedTernary,
  'consistent-function-scoping': consistentFunctionScoping,
  'no-unreadable-iife': noUnreadableIife,

  // Categorized names
  'maintainability/cognitive-complexity': cognitiveComplexity,
  'maintainability/nested-complexity-hotspots': nestedComplexityHotspots,
  'maintainability/identical-functions': identicalFunctions,
  'maintainability/max-parameters': maxParameters,
  'maintainability/no-lonely-if': noLonelyIf,
  'maintainability/no-nested-ternary': noNestedTernary,
  'maintainability/consistent-function-scoping': consistentFunctionScoping,
  'maintainability/no-unreadable-iife': noUnreadableIife,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

export const plugin = {
  meta: {
    name: '@interlace/eslint-plugin-maintainability',
    version: '1.0.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

export const configs = {
  recommended: {
    plugins: {
      '@interlace/maintainability': plugin,
    },
    rules: {
      '@interlace/maintainability/maintainability/cognitive-complexity': 'warn',
      '@interlace/maintainability/maintainability/identical-functions': 'warn',
      '@interlace/maintainability/maintainability/max-parameters': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,
} satisfies Record<string, TSESLint.FlatConfig.Config>;

export default plugin;
