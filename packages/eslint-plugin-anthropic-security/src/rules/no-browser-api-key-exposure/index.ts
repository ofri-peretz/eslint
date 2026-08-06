/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Forbid `dangerouslyAllowBrowser: true` on the Anthropic client
 * @description The Anthropic SDK refuses to run in a browser by default and
 * unlocks it with this flag — its own JSDoc says client-side use "risks
 * exposing your secret API credentials to attackers" (`client.d.ts:208`,
 * v0.115.0). Turning it on ships the key to every visitor.
 *
 * @see https://docs.anthropic.com/en/api/getting-started
 */

import { createBrowserEscapeHatchRule } from '@interlace/eslint-devkit';

export const noBrowserApiKeyExposure = createBrowserEscapeHatchRule({
  ruleName: 'no-browser-api-key-exposure',
  vendor: 'Anthropic',
  /** Covers the base SDK and the agent SDK, which share the client options. */
  modules: ['@anthropic-ai'],
  docsUrl:
    'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-anthropic-security/docs/rules/no-browser-api-key-exposure.md',
  documentationLink: 'https://docs.anthropic.com/en/api/getting-started',
});
