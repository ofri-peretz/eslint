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
import { fileUsesVercelAi } from '../../utils/vercel-ai-evidence';
import { declaresOption, sdkCallName } from '../../utils/sdk';

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
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-max-tokens.md',
      description: 'Require maxTokens limit in generateText and streamText calls',
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
        description: '{{function}} call without a token limit can lead to excessive resource consumption',
        severity: 'MEDIUM',
        compliance: ['SOC2'],
        fix: 'Add a token limit: {{function}}({ maxOutputTokens: 4096, ... }) (v5+) or maxTokens (v4)',
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
  create(context, [options]) {
    // Every rule in this plugin is Vercel-AI-specific, and none of them knew
    // it: over 107,384 files, 91% of this plugin's findings were in files with
    // no `ai` / `@ai-sdk` import. Registering no visitors is both the gate and
    // the cheap path — a file without the SDK does no work.
    if (!fileUsesVercelAi(context.sourceCode.ast)) return {};

    // Merged with `defaultOptions` before `create` runs.
    const { targetFunctions } = options as Required<Options>;

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const matchedFunction = sdkCallName(node, targetFunctions);
        if (!matchedFunction) return;

        // Options built elsewhere are not inspected — absence is not provable.
        const optionsArg = node.arguments[0];
        if (!optionsArg || optionsArg.type !== 'ObjectExpression') return;

        // maxTokens (v4) or maxOutputTokens (v5+), also snake_cased as the raw
        // provider APIs spell them. A spread may carry either, so it counts.
        if (!declaresOption(optionsArg, TOKEN_LIMIT_KEYS)) {
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

const TOKEN_LIMIT_KEYS = ['maxTokens', 'max_tokens', 'maxOutputTokens', 'max_output_tokens'];
