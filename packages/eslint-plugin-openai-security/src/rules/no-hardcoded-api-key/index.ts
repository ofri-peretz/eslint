/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Forbid a literal API key in the OpenAI client options
 * @description A key written into source is committed, pushed, mirrored into
 * every clone and CI cache, and is billable by anyone who reads it. Rotating it
 * means a code change, so leaked keys tend to stay live.
 *
 * Nothing in `eslint-plugin-secure-coding` reports this shape — measured, not
 * assumed. See `createSdkApiKeyRule` for the taxonomy note.
 *
 * @see https://platform.openai.com/docs/api-reference/authentication
 */

import { createSdkApiKeyRule } from '@interlace/eslint-devkit';

export const noHardcodedApiKey = createSdkApiKeyRule({
  ruleName: 'no-hardcoded-api-key',
  vendor: 'OpenAI',
  // `openai` and its subpaths only. `openai-edge` is a different package with
  // a different client, so a bare prefix match would open the gate wrongly.
  modules: ['openai'],
  keyProps: ['apiKey'],
  fixTemplate: 'new OpenAI({ {{prop}}: process.env.OPENAI_API_KEY })',
  docsUrl:
    'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-openai-security/docs/rules/no-hardcoded-api-key.md',
  documentationLink: 'https://platform.openai.com/docs/api-reference/authentication',
});
