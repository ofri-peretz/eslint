/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESLint } from '@interlace/eslint-devkit';
import { withCanonicalDocsUrls } from '@interlace/eslint-devkit';

// Operability rules
import { noConsoleLog } from './rules/operability/no-console-log';
import { noProcessExit } from './rules/operability/no-process-exit';
import { noDebugCodeInProduction } from './rules/operability/no-debug-code-in-production';
import { noVerboseErrorMessages } from './rules/operability/no-verbose-error-messages';
import { requireCodeMinification } from './rules/operability/require-code-minification';
import { requireDataMinimization } from './rules/operability/require-data-minimization';

export const rules = {
  'no-console-log': noConsoleLog,
  'no-process-exit': noProcessExit,
  'no-debug-code-in-production': noDebugCodeInProduction,
  'no-verbose-error-messages': noVerboseErrorMessages,
  'require-code-minification': requireCodeMinification,
  'require-data-minimization': requireDataMinimization,

  // Categorized names
  'operability/no-console-log': noConsoleLog,
  'operability/no-process-exit': noProcessExit,
  'operability/no-debug-code-in-production': noDebugCodeInProduction,
  'operability/no-verbose-error-messages': noVerboseErrorMessages,
  'operability/require-code-minification': requireCodeMinification,
  'operability/require-data-minimization': requireDataMinimization,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * Stamp canonical documentation URLs onto every rule above.
 *
 * Applied as a statement rather than by wrapping the object literal: the docs
 * stats generator locates the rule map with `export const rules ... = {`, and a
 * wrapping call makes that regex miss and silently report zero rules. The helper
 * mutates in place and returns the same object, so this is equivalent.
 */
withCanonicalDocsUrls('plugin-operability', rules);


export const plugin = {
  meta: {
    name: 'eslint-plugin-operability',
    version: '3.1.1',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

export const configs = {
  recommended: {
    plugins: {
      'operability': plugin,
    },
    rules: {
      'operability/no-console-log': 'warn',
      'operability/no-debug-code-in-production': 'error',
      'operability/no-verbose-error-messages': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,
} satisfies Record<string, TSESLint.FlatConfig.Config>;

export default plugin;
