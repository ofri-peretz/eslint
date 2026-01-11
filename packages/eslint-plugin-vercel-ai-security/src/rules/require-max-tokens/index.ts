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
      description: 'Require maxTokens limit in generateText and streamText calls',
    },
    messages: {
      missingMaxTokens: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing Token Limit in Vercel AI SDK',
        cwe: 'CWE-770',
        owasp: 'A05:2021',
        cvss: 6.5,
        description: '{{function}} call without maxTokens limit can lead to excessive resource consumption',
        severity: 'MEDIUM',
        compliance: ['SOC2'],
        fix: 'Add maxTokens option: {{function}}({ maxTokens: 4096, ... })',
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

    const sourceCode = context.sourceCode || context.getSourceCode();

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

        // Check if maxTokens is present
        const hasMaxTokens = optionsArg.properties.some(prop => {
          if (prop.type !== 'Property') return false;
          const keyName = prop.key.type === 'Identifier' 
            ? prop.key.name 
            : prop.key.type === 'Literal' 
              ? String(prop.key.value)
              : null;
          return keyName === 'maxTokens' || keyName === 'max_tokens';
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
