/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent dynamic content in system prompts
 * @description Detects when system prompts contain dynamic/user-controlled content
 * @see OWASP ASI01: Agent Confusion
 */

import { AST_NODE_TYPES, TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { isSystemPromptProp, getStaticPropName } from '../../utils/prompt-props';
import { fileUsesVercelAi } from '../../utils/vercel-ai-evidence';
import { isRequestDerived, isStaticText, sdkCallName } from '../../utils/sdk';

type MessageIds = 'dynamicSystemPrompt' | 'userControlledSystemPrompt';

export interface Options {
  /** Allow template literals with only static parts */
  allowStaticTemplates?: boolean;
}

type RuleOptions = [Options?];

export const noDynamicSystemPrompt = createRule<RuleOptions, MessageIds>({
  name: 'no-dynamic-system-prompt',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/no-dynamic-system-prompt.md',
      description: 'Prevent dynamic content in system prompts to avoid agent confusion attacks',
      cwe: 'CWE-74',
      cvss: 8,
    },
    messages: {
      dynamicSystemPrompt: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dynamic System Prompt',
        cwe: 'CWE-74',
        owasp: 'A03:2021',
        cvss: 8.0,
        description: 'System prompt contains dynamic content. This can lead to agent confusion attacks.',
        severity: 'HIGH',
        compliance: ['SOC2'],
        fix: 'Use a static system prompt defined as a constant. Avoid template literals or concatenation.',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
      userControlledSystemPrompt: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'User-Controlled System Prompt',
        cwe: 'CWE-74',
        owasp: 'A03:2021',
        cvss: 8.0,
        description: 'System prompt is read straight from the request body. The caller can replace the agent\'s instructions.',
        severity: 'HIGH',
        compliance: ['SOC2'],
        fix: 'Keep the system prompt server-side; let the request select from a fixed set of prompts by id',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowStaticTemplates: {
            type: 'boolean',
            description: 'Allow template literals without expressions',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowStaticTemplates: true,
    },
  ],
  create(context, [options]) {
    // Every rule in this plugin is Vercel-AI-specific, and none of them knew
    // it: over 107,384 files, 91% of this plugin's findings were in files with
    // no `ai` / `@ai-sdk` import. Registering no visitors is both the gate and
    // the cheap path — a file without the SDK does no work.
    if (!fileUsesVercelAi(context.sourceCode.ast)) return {};

    // Merged with `defaultOptions` before `create` runs.
    const { allowStaticTemplates } = options as Required<Options>;

    const sourceCode = context.sourceCode;

    /**
     * Does this value vary at runtime? Templates and concatenations are
     * dynamic only when a part is — `${BASE_PROMPT}` over a string constant,
     * or `${new Date().toISOString()}`, is fixed by the source.
     */
    function isDynamicContent(node: TSESTree.Node): boolean {
      if (node.type === 'TemplateLiteral') {
        if (node.expressions.length === 0) return !allowStaticTemplates;
        return !isStaticText(node, sourceCode);
      }
      if (node.type === 'BinaryExpression' && node.operator === '+') {
        return !isStaticText(node, sourceCode);
      }
      if (node.type === 'CallExpression') return !isStaticText(node, sourceCode);
      return node.type === 'AwaitExpression';
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!sdkCallName(node)) return;

        // Check first argument (options object)
        const optionsArg = node.arguments[0];
        if (!optionsArg || optionsArg.type !== 'ObjectExpression') return;

        // Find the system-prompt property (`instructions` in AI SDK v7+, `system` before it)
        for (const prop of optionsArg.properties) {
          if (prop.type !== AST_NODE_TYPES.Property) continue;

          const keyName = getStaticPropName(prop);
          if (!isSystemPromptProp(keyName)) continue;

          if (isDynamicContent(prop.value)) {
            context.report({
              node: prop.value,
              messageId: 'dynamicSystemPrompt',
            });
          } else if (isRequestDerived(prop.value, sourceCode)) {
            // A bare reference to the request body — no template to see,
            // but the caller still writes the agent's instructions.
            context.report({
              node: prop.value,
              messageId: 'userControlledSystemPrompt',
            });
          }
        }
      },
    };
  },
});
