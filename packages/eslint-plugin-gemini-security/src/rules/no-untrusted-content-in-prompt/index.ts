/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow untrusted content built into a Gemini system prompt
 * @description A system prompt is instruction text. Whatever is spliced into it
 * is read by the model as instructions, not as data, so anyone who controls
 * that value controls the agent.
 *
 * Gated on member calls, so it cannot collide with
 * `vercel-ai-security/no-dynamic-system-prompt`, which owns the bare-function
 * `generateText(...)` form. See createSystemPromptInjectionRule.
 *
 * @see https://ai.google.dev/gemini-api/docs/system-instructions
 */

import { createSystemPromptInjectionRule } from '@interlace/eslint-devkit';

export const noUntrustedContentInPrompt = createSystemPromptInjectionRule({
  ruleName: 'no-untrusted-content-in-prompt',
  vendor: 'Gemini',
  modules: ['@google/generative-ai', '@google/genai'],
  requestPaths: ['generateContent', 'generateContentStream'],
  systemPromptProps: ['systemInstruction'],
  docsUrl:
    'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-gemini-security/docs/rules/no-untrusted-content-in-prompt.md',
  documentationLink: 'https://ai.google.dev/gemini-api/docs/system-instructions',
});
