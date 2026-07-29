/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require max tokens limit in generateText/streamText calls
 * @description Prevents unbounded token consumption in AI requests
 * @see https://sdk.vercel.ai/docs/ai-sdk-core/generating-text
 * @see https://owasp.org/www-project-top-10-for-large-language-model-applications/
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'missingMaxTokens';

/**
 * Option keys that bound output tokens.
 * AI SDK v5+ renamed `maxTokens` to `maxOutputTokens` (`CallSettings.maxOutputTokens`);
 * the v4 names stay accepted so v4 codebases keep passing. snake_case variants cover
 * OpenAI-shaped proxies that forward the raw wire name.
 */
const MAX_TOKEN_KEYS = new Set([
  'maxOutputTokens', 'max_output_tokens', // v5+
  'maxTokens', 'max_tokens',              // v4
]);

export interface Options {
  /** Default max tokens to suggest */
  suggestedLimit?: number;
  
  /** Functions that require max tokens */
  targetFunctions?: string[];
}

type RuleOptions = [Options?];

export const requireMaxTokens = createRule<RuleOptions, MessageIds>({
  name: 'require-max-tokens',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-max-tokens.md',
      description: 'Require an output token limit (maxOutputTokens / maxTokens) in generateText and streamText calls',
      cwe: 'CWE-770',
      cvss: 6.5,
    },
    messages: {
      missingMaxTokens: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing Token Limit in Vercel AI SDK',
        cwe: 'CWE-770',
        owasp: 'A05:2021',
        cvss: 6.5,
        description: '{{function}} call without an output token limit can lead to excessive resource consumption',
        severity: 'MEDIUM',
        compliance: ['SOC2'],
        fix: 'Add maxOutputTokens option: {{function}}({ maxOutputTokens: 4096, ... }) — on AI SDK v4 the option is maxTokens',
        documentationLink: 'https://sdk.vercel.ai/docs/ai-sdk-core/generating-text',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          suggestedLimit: {
            type: 'number',
            description: 'Default max tokens limit to suggest',
            default: 4096,
          },
          targetFunctions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Function names that require max tokens',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      suggestedLimit: 4096,
      targetFunctions: ['generateText', 'streamText', 'generateObject', 'streamObject'],
    },
  ],
  create(context) {
    const [options = {}] = context.options;
    const targetFunctions = options.targetFunctions ?? [
      'generateText', 'streamText', 'generateObject', 'streamObject',
    ];

    const sourceCode = context.sourceCode;

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = sourceCode.getText(node.callee);
        
        // Check if this is a target AI function
        const matchedFunction = targetFunctions.find((fn: string) => callee.includes(fn));
        if (!matchedFunction) {
          return;
        }

        // Check first argument (options object)
        const optionsArg = node.arguments[0];
        if (!optionsArg || optionsArg.type !== 'ObjectExpression') {
          return;
        }

        // Check if a token limit is present (v5+ maxOutputTokens or v4 maxTokens)
        const hasMaxTokens = optionsArg.properties.some(prop => {
          if (prop.type !== 'Property') return false;
          const keyName = prop.key.type === 'Identifier'
            ? prop.key.name
            : prop.key.type === 'Literal'
              ? String(prop.key.value)
              : null;
          return keyName !== null && MAX_TOKEN_KEYS.has(keyName);
        });

        if (!hasMaxTokens) {
          context.report({
            node,
            messageId: 'missingMaxTokens',
            data: { function: matchedFunction },
          });
        }
      },
    };
  },
});
