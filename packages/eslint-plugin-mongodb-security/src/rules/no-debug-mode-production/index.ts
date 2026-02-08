/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-debug-mode-production
 * Prevents Mongoose debug mode in production
 * CWE-489: Active Debug Code
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'debugModeProduction';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

export const noDebugModeProduction = createRule<RuleOptions, MessageIds>({
  name: 'no-debug-mode-production',
  meta: {
    type: 'problem',
    docs: { description: 'Prevent Mongoose debug mode in production' },
    hasSuggestions: true,
    messages: {
      debugModeProduction: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Debug Mode in Production',
        cwe: 'CWE-489',
        owasp: 'A05:2021',
        cvss: 3.1,
        description: 'mongoose.set("debug", true) exposes query details in production',
        severity: 'LOW',
        fix: 'Use mongoose.set("debug", process.env.NODE_ENV !== "production")',
        documentationLink: 'https://mongoosejs.com/docs/api/mongoose.html#Mongoose.prototype.set()',
      }),
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options = {}] = context.options;
    const { allowInTests = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'set' &&
          node.arguments.length >= 2
        ) {
          const firstArg = node.arguments[0];
          const secondArg = node.arguments[1];

          if (
            firstArg.type === AST_NODE_TYPES.Literal &&
            firstArg.value === 'debug' &&
            secondArg.type === AST_NODE_TYPES.Literal &&
            secondArg.value === true
          ) {
            context.report({
              node,
              messageId: 'debugModeProduction',
            });
          }
        }
      },
    };
  },
});

export default noDebugModeProduction;
