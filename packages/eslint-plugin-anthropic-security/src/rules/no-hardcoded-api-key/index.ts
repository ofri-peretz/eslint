/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Forbid a literal API key in the Anthropic client options
 * @description A key written into source is committed, pushed, mirrored into
 * every clone and CI cache, and is billable by anyone who reads it. Rotating it
 * means a code change, so leaked keys tend to stay live.
 *
 * The detection logic moved to `createSdkApiKeyRule` when the same rule landed
 * for OpenAI and Gemini; the three differ only in module name, option names and
 * remediation copy. Behaviour here is unchanged.
 *
 * @see https://docs.anthropic.com/en/api/getting-started
 */

import { createSdkApiKeyRule } from '@interlace/eslint-devkit';

export const noHardcodedApiKey = createSdkApiKeyRule({
  ruleName: 'no-hardcoded-api-key',
  vendor: 'Anthropic',
  /** Covers the base SDK and the agent SDK, which share the client options. */
  modules: ['@anthropic-ai'],
  keyProps: ['apiKey', 'authToken'],
  fixTemplate: 'new Anthropic({ {{prop}}: process.env.ANTHROPIC_API_KEY })',
  docsUrl:
    'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-anthropic-security/docs/rules/no-hardcoded-api-key.md',
  documentationLink: 'https://docs.anthropic.com/en/api/getting-started',
});
