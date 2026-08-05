/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-anthropic-security
 *
 * Security rules for the Anthropic SDK and Claude Agent SDK.
 *
 * Scope promise: every rule gates on the SDK being imported, so the plugin
 * stays silent in files that do not use it.
 */

import type { TSESLint } from '@interlace/eslint-devkit';

import { noHardcodedApiKey } from './rules/no-hardcoded-api-key';

export { noHardcodedApiKey } from './rules/no-hardcoded-api-key';

export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  // CWE-798
  'no-hardcoded-api-key': noHardcodedApiKey,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-anthropic-security',
    version: '0.1.1',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

const enabled: TSESLint.FlatConfig.Config = {
  plugins: {
    'anthropic-security': plugin,
  },
  rules: {
    'anthropic-security/no-hardcoded-api-key': 'error',
  },
} satisfies TSESLint.FlatConfig.Config;

export const configs = {
  minimal: enabled,
  recommended: enabled,
  strict: enabled,
};

export default {
  ...plugin,
  configs,
};
