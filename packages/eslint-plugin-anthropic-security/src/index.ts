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

import { noBrowserApiKeyExposure } from './rules/no-browser-api-key-exposure';
import { noHardcodedApiKey } from './rules/no-hardcoded-api-key';
import { noUntrustedContentInPrompt } from './rules/no-untrusted-content-in-prompt';

export { noBrowserApiKeyExposure } from './rules/no-browser-api-key-exposure';
export { noHardcodedApiKey } from './rules/no-hardcoded-api-key';
export { noUntrustedContentInPrompt } from './rules/no-untrusted-content-in-prompt';

export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  // CWE-522: Insufficiently Protected Credentials
  'no-browser-api-key-exposure': noBrowserApiKeyExposure,
  // CWE-798
  'no-hardcoded-api-key': noHardcodedApiKey,
  // CWE-1427: Improper Neutralization of Input Used for LLM Prompting
  'no-untrusted-content-in-prompt': noUntrustedContentInPrompt,
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
    // Same severity as the identical rule in eslint-plugin-openai-security,
    // which has shipped it in `recommended` since 0.1.0. The flag is an explicit
    // opt-in with a literal `true`, so there is no false-positive shape.
    'anthropic-security/no-browser-api-key-exposure': 'error',
    'anthropic-security/no-hardcoded-api-key': 'error',
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
    'anthropic-security': plugin,
  },
  rules: {
    ...enabled.rules,
    'anthropic-security/no-untrusted-content-in-prompt': 'error',
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
