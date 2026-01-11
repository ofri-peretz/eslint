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

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

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
      description: 'Require timeout configuration for AI SDK calls to prevent DoS',
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

    // Timeout-related property names
    const timeoutProperties = ['timeout', 'abortSignal', 'signal', 'timeoutMs', 'requestTimeout'];

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = sourceCode.getText(node.callee);
        
        // Check if this is an AI SDK function
        const matchedFunction = aiSDKFunctions.find(fn => callee.includes(fn));
        if (!matchedFunction) return;

        // Check first argument (options object)
        const optionsArg = node.arguments[0];
        if (!optionsArg || optionsArg.type !== 'ObjectExpression') {
          context.report({
            node,
            messageId: 'missingTimeout',
            data: { function: matchedFunction },
          });
          return;
        }

        // Check for timeout or abort signal properties
        const hasTimeout = optionsArg.properties.some(prop => {
          if (prop.type !== 'Property') return false;
          const keyName = prop.key.type === 'Identifier' ? prop.key.name : null;
          return keyName && timeoutProperties.includes(keyName);
        });

        if (!hasTimeout) {
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
