/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-gemini-security
 *
 * Security rules for the Google Gemini SDK (@google/genai).
 *
 * Scope promise: every rule gates on the SDK being imported, so the plugin
 * stays silent in files that do not use it.
 */

import type { TSESLint } from '@interlace/eslint-devkit';

import { noDisabledSafetySettings } from './rules/no-disabled-safety-settings';

export { noDisabledSafetySettings } from './rules/no-disabled-safety-settings';

export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  // CWE-693
  'no-disabled-safety-settings': noDisabledSafetySettings,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-gemini-security',
    version: '0.1.1',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

const enabled: TSESLint.FlatConfig.Config = {
  plugins: {
    'gemini-security': plugin,
  },
  rules: {
    'gemini-security/no-disabled-safety-settings': 'error',
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
