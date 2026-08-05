/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Forbid `dangerouslyAllowBrowser: true` on the OpenAI client
 * @description The flag exists to let the SDK run in a browser, which means the
 * API key travels to the client and is readable by anyone who opens devtools.
 * A leaked key is billable by whoever finds it.
 *
 * The detection moved into `createBrowserEscapeHatchRule` once the Anthropic
 * SDK turned out to spell the same flag identically. Reported messages are
 * unchanged.
 *
 * @see https://github.com/openai/openai-node#requestresponse-types
 */

import { createBrowserEscapeHatchRule } from '@interlace/eslint-devkit';

export const noBrowserApiKeyExposure = createBrowserEscapeHatchRule({
  ruleName: 'no-browser-api-key-exposure',
  vendor: 'OpenAI',
  // The `openai` package and its subpaths, plus the `@openai/` scope where the
  // Agents SDK lives. Matched precisely so `openai-mock` does not arm it.
  modules: ['openai', '@openai'],
  docsUrl:
    'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-openai-security/docs/rules/no-browser-api-key-exposure.md',
  documentationLink: 'https://platform.openai.com/docs/api-reference/authentication',
});
