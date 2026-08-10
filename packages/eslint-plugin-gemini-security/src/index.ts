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

import { noHardcodedApiKey } from './rules/no-hardcoded-api-key';
import { noUntrustedContentInPrompt } from './rules/no-untrusted-content-in-prompt';
import { noDisabledSafetySettings } from './rules/no-disabled-safety-settings';

export { noHardcodedApiKey } from './rules/no-hardcoded-api-key';
export { noUntrustedContentInPrompt } from './rules/no-untrusted-content-in-prompt';
export { noDisabledSafetySettings } from './rules/no-disabled-safety-settings';

export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  // CWE-798: Use of Hard-coded Credentials
  'no-hardcoded-api-key': noHardcodedApiKey,
  // CWE-1427: Improper Neutralization of Input Used for LLM Prompting
  'no-untrusted-content-in-prompt': noUntrustedContentInPrompt,
  // CWE-693
  'no-disabled-safety-settings': noDisabledSafetySettings,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-gemini-security',
    version: '0.3.1',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

const enabled: TSESLint.FlatConfig.Config = {
  plugins: {
    'gemini-security': plugin,
  },
  rules: {
    // Ships at the same severity as the identical rule in
    // eslint-plugin-anthropic-security, which has been in `recommended` since
    // 0.1.0. A non-empty string literal in a named client option, behind an
    // SDK-import gate, has no realistic false-positive shape; splitting preset
    // membership across three copies of one rule would be the worse outcome.
    'gemini-security/no-hardcoded-api-key': 'error',
    'gemini-security/no-disabled-safety-settings': 'error',
  },
} satisfies TSESLint.FlatConfig.Config;

/**
 * Plan §1.6: a new rule joins `strict` and stays out of `minimal` /
 * `recommended` until its false-positive profile is measured on the corpus.
 *
 * `no-untrusted-content-in-prompt` genuinely has a plausible FP shape — a
 * system prompt interpolating something harmless like today's date is not an
 * injection, and this rule cannot tell the difference. That is a real judgement
 * call for `strict` to make, unlike the credential rules above, where a literal
 * key in a named option has no innocent reading.
 */
const strict: TSESLint.FlatConfig.Config = {
  plugins: {
    'gemini-security': plugin,
  },
  rules: {
    ...enabled.rules,
    'gemini-security/no-untrusted-content-in-prompt': 'error',
  },
} satisfies TSESLint.FlatConfig.Config;

export const configs = {
  minimal: enabled,
  recommended: enabled,
  strict,
};

export default {
  ...plugin,
  configs,
};
