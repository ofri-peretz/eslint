/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-openai-security
 *
 * Security rules for the OpenAI SDK and OpenAI Agents SDK.
 *
 * Scope promise: every rule gates on the SDK being imported, so the plugin
 * stays silent in files that do not use it.
 */

import type { TSESLint } from '@interlace/eslint-devkit';

import { noHardcodedApiKey } from './rules/no-hardcoded-api-key';
import { noBrowserApiKeyExposure } from './rules/no-browser-api-key-exposure';

export { noHardcodedApiKey } from './rules/no-hardcoded-api-key';
export { noBrowserApiKeyExposure } from './rules/no-browser-api-key-exposure';

export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  // CWE-798: Use of Hard-coded Credentials
  'no-hardcoded-api-key': noHardcodedApiKey,
  // CWE-522
  'no-browser-api-key-exposure': noBrowserApiKeyExposure,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-openai-security',
    version: '0.1.1',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

const enabled: TSESLint.FlatConfig.Config = {
  plugins: {
    'openai-security': plugin,
  },
  rules: {
    // Ships at the same severity as the identical rule in
    // eslint-plugin-anthropic-security, which has been in `recommended` since
    // 0.1.0. A non-empty string literal in a named client option, behind an
    // SDK-import gate, has no realistic false-positive shape; splitting preset
    // membership across three copies of one rule would be the worse outcome.
    'openai-security/no-hardcoded-api-key': 'error',
    'openai-security/no-browser-api-key-exposure': 'error',
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
