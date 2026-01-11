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

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

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
      description: 'Require error handling for AI SDK calls to prevent cascading failures',
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
  create(context) {
    const [options = {}] = context.options;
    const allowInTests = options.allowInTests ?? true;

    const sourceCode = context.sourceCode || context.getSourceCode();
    const filename = context.filename || context.getFilename();

    // Skip test files if allowed
    if (allowInTests && /\.(test|spec)\.[jt]sx?$/.test(filename)) {
      return {};
    }

    // Vercel AI SDK functions
    const aiSDKFunctions = ['generateText', 'streamText', 'generateObject', 'streamObject'];

    /**
     * Check if node is inside a try block
     */
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

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = sourceCode.getText(node.callee);
        
        // Check if this is an AI SDK function
        const matchedFunction = aiSDKFunctions.find(fn => callee.includes(fn));
        if (!matchedFunction) return;

        // Check if inside try block
        const parent = node.parent;
        if (parent?.type === 'AwaitExpression') {
          if (!isInsideTryBlock(parent)) {
            context.report({
              node,
              messageId: 'missingErrorHandling',
              data: { function: matchedFunction },
            });
          }
        } else if (!isInsideTryBlock(node)) {
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
