/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow untrusted content built into a Anthropic system prompt
 * @description A system prompt is instruction text. Whatever is spliced into it
 * is read by the model as instructions, not as data, so anyone who controls
 * that value controls the agent.
 *
 * Gated on member calls, so it cannot collide with
 * `vercel-ai-security/no-dynamic-system-prompt`, which owns the bare-function
 * `generateText(...)` form. See createSystemPromptInjectionRule.
 *
 * @see https://docs.anthropic.com/en/docs/system-prompts
 */

import { createSystemPromptInjectionRule } from '@interlace/eslint-devkit';

export const noUntrustedContentInPrompt = createSystemPromptInjectionRule({
  ruleName: 'no-untrusted-content-in-prompt',
  vendor: 'Anthropic',
  modules: ['@anthropic-ai'],
  requestPaths: ['messages.create', 'messages.stream'],
  systemPromptProps: ['system'],
  docsUrl:
    'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-anthropic-security/docs/rules/no-untrusted-content-in-prompt.md',
  documentationLink: 'https://docs.anthropic.com/en/docs/system-prompts',
});
