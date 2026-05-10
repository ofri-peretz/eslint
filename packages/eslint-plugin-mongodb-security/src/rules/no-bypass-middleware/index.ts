/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-bypass-middleware
 * Prevents bypassing Mongoose middleware
 * CWE-284: Improper Access Control
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'bypassMiddleware';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

const BYPASS_METHODS = new Set([
  'updateOne', 'updateMany', 'deleteOne', 'deleteMany',
  'findOneAndUpdate', 'findOneAndDelete', 'findOneAndReplace',
  'findByIdAndUpdate', 'findByIdAndDelete',
  'insertMany', 'bulkWrite',
]);

export const noBypassMiddleware = createRule<RuleOptions, MessageIds>({
  name: 'no-bypass-middleware',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mongodb-security/docs/rules/no-bypass-middleware.md', description: 'Prevent bypassing Mongoose pre/post middleware hooks',
      cwe: 'CWE-284',
      cvss: 5.3,
    },
    hasSuggestions: true,
    messages: {
      bypassMiddleware: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Middleware Bypass',
        cwe: 'CWE-284',
        owasp: 'A01:2021',
        cvss: 5.3,
        description: 'This method bypasses Mongoose middleware hooks',
        severity: 'MEDIUM',
        fix: 'Use findOne + save() pattern to ensure middleware runs',
        documentationLink: 'https://mongoosejs.com/docs/middleware.html',
      }),
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options = {}] = context.options;
    const { allowInTests = true } = options as Options;
    const filename = context.filename;
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }

        const methodName = node.callee.property.type === AST_NODE_TYPES.Identifier
          ? node.callee.property.name
          : null;

        if (methodName && BYPASS_METHODS.has(methodName)) {
          context.report({
            node,
            messageId: 'bypassMiddleware',
          });
        }
      },
    };
  },
});

export default noBypassMiddleware;
