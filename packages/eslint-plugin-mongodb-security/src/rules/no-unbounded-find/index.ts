/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unbounded-find
 * Requires limit() on find queries
 * CWE-400: Resource Exhaustion
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'unboundedFind';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

const FIND_METHODS = ['find', 'findOne'];

export const noUnboundedFind = createRule<RuleOptions, MessageIds>({
  name: 'no-unbounded-find',
  meta: {
    type: 'suggestion',
    docs: { description: 'Require limit() on find queries to prevent resource exhaustion' },
    hasSuggestions: true,
    messages: {
      unboundedFind: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Unbounded Query',
        cwe: 'CWE-400',
        owasp: 'A04:2021',
        cvss: 4.3,
        description: 'find() without limit() may return excessive data',
        severity: 'LOW',
        fix: 'Add .limit(100) or appropriate limit to the query',
        documentationLink: 'https://www.mongodb.com/docs/manual/reference/method/cursor.limit/',
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
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }

        const methodName = node.callee.property.type === AST_NODE_TYPES.Identifier
          ? node.callee.property.name
          : null;

        if (!methodName || !FIND_METHODS.includes(methodName)) {
          return;
        }

        // Check if the call is chained with .limit()
        const parent = node.parent;
        if (
          parent &&
          parent.type === AST_NODE_TYPES.MemberExpression &&
          parent.property.type === AST_NODE_TYPES.Identifier &&
          parent.property.name === 'limit'
        ) {
          return;
        }

        // Check if the parent's parent is .limit() (e.g., find().sort().limit())
        const grandparent = parent?.parent;
        if (
          grandparent &&
          grandparent.type === AST_NODE_TYPES.MemberExpression &&
          grandparent.property.type === AST_NODE_TYPES.Identifier &&
          grandparent.property.name === 'limit'
        ) {
          return;
        }

        // Also check if it's wrapped: await Model.find().limit()
        if (
          parent &&
          parent.type === AST_NODE_TYPES.CallExpression &&
          parent.callee.type === AST_NODE_TYPES.MemberExpression &&
          parent.callee.property.type === AST_NODE_TYPES.Identifier &&
          parent.callee.property.name === 'limit'
        ) {
          return;
        }

        context.report({
          node,
          messageId: 'unboundedFind',
        });
      },
    };
  },
});

export default noUnboundedFind;
