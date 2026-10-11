/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require error handling for AI SDK calls
 * @description Ensures generateText/streamText calls are wrapped in try-catch
 * @see https://sdk.vercel.ai/docs/ai-sdk-core/generating-text
 * @see OWASP ASI08: Cascading Failures
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons, isTestFilePath } from '@interlace/eslint-devkit';
import { fileUsesVercelAi } from '../../utils/vercel-ai-evidence';
import { optionValue, sdkCallName } from '../../utils/sdk';

type MessageIds = 'missingErrorHandling';

export interface Options {
  /** Allow unhandled AI calls in test files */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const requireErrorHandling = createRule<RuleOptions, MessageIds>({
  name: 'require-error-handling',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-error-handling.md',
      description: 'Require error handling for AI SDK calls to prevent cascading failures',
      cwe: 'CWE-755',
      cvss: 5,
    },
    messages: {
      missingErrorHandling: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unhandled AI SDK Call',
        cwe: 'CWE-755',
        owasp: 'A05:2021',
        cvss: 5.0,
        description: '{{function}} call is not wrapped in try-catch. AI API failures can cause cascading errors.',
        severity: 'MEDIUM',
        compliance: ['SOC2'],
        fix: 'Wrap in try-catch: try { await {{function}}(...) } catch (e) { /* handle error */ }',
        documentationLink: 'https://sdk.vercel.ai/docs/ai-sdk-core/error-handling',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            description: 'Allow unhandled AI calls in test files',
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

    // oxlint-disable-next-line consistent-function-scoping
    function isInsideTryBlock(node: TSESTree.Node): boolean {
      let parent = node.parent;
      while (parent) {
        if (parent.type === 'TryStatement') {
          return true;
        }
        parent = parent.parent;
      }
      return false;
    }

    /**
     * `streamText` / `streamObject` never throw: a failed stream is delivered
     * to `onError` (or as an error part), so a try/catch round the call
     * catches nothing. For them, an `onError` option is the handling.
     */
    function hasStreamErrorHandler(node: TSESTree.CallExpression, fn: string): boolean {
      const optionsArg = node.arguments[0];
      return (
        STREAMING.has(fn) &&
        optionsArg?.type === 'ObjectExpression' &&
        optionValue(optionsArg, 'onError') !== undefined
      );
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const matchedFunction = sdkCallName(node);
        if (!matchedFunction) return;
        if (hasStreamErrorHandler(node, matchedFunction)) return;

        if (!isInsideTryBlock(node)) {
          context.report({
            node,
            messageId: 'missingErrorHandling',
            data: { function: matchedFunction },
          });
        }
      },
    };
  },
});

const STREAMING = new Set(['streamText', 'streamObject']);
