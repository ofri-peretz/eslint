/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Forbid a literal API key in the Gemini client construction
 * @description A key written into source is committed, pushed, mirrored into
 * every clone and CI cache, and is billable by anyone who reads it. Rotating it
 * means a code change, so leaked keys tend to stay live.
 *
 * Gemini is the one SDK of the three where the key is commonly a *positional*
 * argument — the legacy `@google/generative-ai` client is constructed as
 * `new GoogleGenerativeAI(apiKey)`, with no options object to inspect. The
 * current `@google/genai` client takes `{ apiKey }` like the others, so both
 * shapes are gated.
 *
 * @see https://ai.google.dev/gemini-api/docs/api-key
 */

import { createSdkApiKeyRule } from '@interlace/eslint-devkit';

export const noHardcodedApiKey = createSdkApiKeyRule({
  ruleName: 'no-hardcoded-api-key',
  vendor: 'Gemini',
  modules: ['@google/generative-ai', '@google/genai'],
  keyProps: ['apiKey'],
  // Static, not `{{prop}}`-templated: the key here can be positional, where
  // the property name reads "The first argument" and would render nonsense
  // inside an options literal. Both client shapes are shown instead.
  fixTemplate:
    'new GoogleGenerativeAI(process.env.GEMINI_API_KEY) — or new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })',
  positionalKeyConstructors: ['GoogleGenerativeAI'],
  docsUrl:
    'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-gemini-security/docs/rules/no-hardcoded-api-key.md',
  documentationLink: 'https://ai.google.dev/gemini-api/docs/api-key',
});
