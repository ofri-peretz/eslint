/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require timeout for AI API calls to prevent DoS
 * @description Detects AI calls without timeout configuration
 * @see OWASP LLM04: Model Denial of Service
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons, isTestFilePath } from '@interlace/eslint-devkit';
import { fileUsesVercelAi } from '../../utils/vercel-ai-evidence';
import { declaresOption, sdkCallName } from '../../utils/sdk';

type MessageIds = 'missingTimeout';

export interface Options {
  /** Skip in test files */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const requireRequestTimeout = createRule<RuleOptions, MessageIds>({
  name: 'require-request-timeout',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-request-timeout.md',
      description: 'Require timeout configuration for AI SDK calls to prevent DoS',
      cwe: 'CWE-400',
      cvss: 5,
    },
    messages: {
      missingTimeout: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing Request Timeout',
        cwe: 'CWE-400',
        owasp: 'A05:2021',
        cvss: 5.0,
        description: '{{function}} call lacks timeout configuration. This can lead to denial of service.',
        severity: 'MEDIUM',
        compliance: ['SOC2'],
        fix: 'Add timeout configuration or use AbortController with setTimeout',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            description: 'Skip in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: true,
    },
  ],
  create(context, [options]) {
    // Every rule in this plugin is Vercel-AI-specific, and none of them knew
    // it: over 107,384 files, 91% of this plugin's findings were in files with
    // no `ai` / `@ai-sdk` import. Registering no visitors is both the gate and
    // the cheap path — a file without the SDK does no work.
    if (!fileUsesVercelAi(context.sourceCode.ast)) return {};

    // Merged with `defaultOptions` before `create` runs.
    const { allowInTests } = options as Required<Options>;

    // Skip test files if allowed
    if (allowInTests && isTestFilePath(context.filename)) {
      return {};
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const matchedFunction = sdkCallName(node);
        if (!matchedFunction) return;

        const optionsArg = node.arguments[0];
        // `generateText(opts)` — options built elsewhere may well carry a
        // timeout; only a call with no options at all provably lacks one.
        if (optionsArg && optionsArg.type !== 'ObjectExpression') return;

        // `timeout` (number or v7 `{ totalMs, stepMs, ... }`), or a signal —
        // `AbortSignal.timeout(ms)` is the idiomatic bound. A spread may carry either.
        if (!optionsArg || !declaresOption(optionsArg, TIMEOUT_KEYS)) {
          context.report({
            node,
            messageId: 'missingTimeout',
            data: { function: matchedFunction },
          });
        }
      },
    };
  },
});

const TIMEOUT_KEYS = ['timeout', 'abortSignal', 'signal', 'timeoutMs', 'requestTimeout'];
