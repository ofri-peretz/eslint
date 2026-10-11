/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require abort signal for streaming AI calls
 * @description Ensures streamText/streamObject have AbortSignal for proper cleanup
 * @see https://sdk.vercel.ai/docs/ai-sdk-core/generating-text
 * @see OWASP LLM10: Unbounded Consumption
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { fileUsesVercelAi } from '../../utils/vercel-ai-evidence';
import { declaresOption, sdkCallName } from '../../utils/sdk';

type MessageIds = 'missingAbortSignal';

export interface Options {
  /** Functions that should have abort signal */
  targetFunctions?: string[];
}

type RuleOptions = [Options?];

export const requireAbortSignal = createRule<RuleOptions, MessageIds>({
  name: 'require-abort-signal',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-abort-signal.md',
      description: 'Require AbortSignal for streaming AI calls to enable proper cleanup',
      cwe: 'CWE-404',
      cvss: 4,
    },
    messages: {
      missingAbortSignal: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing AbortSignal in Streaming Call',
        cwe: 'CWE-404',
        owasp: 'A05:2021',
        cvss: 4.0,
        description: '{{function}} call without abortSignal. Users cannot cancel long-running streams.',
        severity: 'LOW',
        fix: 'Add abortSignal option: {{function}}({ ..., abortSignal: controller.signal })',
        documentationLink: 'https://sdk.vercel.ai/docs/ai-sdk-core/generating-text',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          targetFunctions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Functions that should have abort signal',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      targetFunctions: ['streamText', 'streamObject'],
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

        const optionsArg = node.arguments[0];
        if (!optionsArg || optionsArg.type !== 'ObjectExpression') return;

        // A spread may carry the signal, so it counts.
        if (!declaresOption(optionsArg, ['abortSignal', 'signal'])) {
          context.report({
            node,
            messageId: 'missingAbortSignal',
            data: { function: matchedFunction },
          });
        }
      },
    };
  },
});
