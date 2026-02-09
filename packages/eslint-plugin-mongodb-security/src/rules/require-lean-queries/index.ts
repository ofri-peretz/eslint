/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-lean-queries
 * Suggests .lean() for read-only queries
 * CWE-400: Resource Exhaustion
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'useLean';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

const READ_METHODS = ['find', 'findOne', 'findById'];

/**
 * Check if any chained call in the parent chain includes .lean()
 */
function hasChainedMethod(node: TSESTree.CallExpression, methodName: string): boolean {
  let current: TSESTree.Node | undefined = node.parent;
  while (current) {
    if (
      current.type === AST_NODE_TYPES.MemberExpression &&
      current.property.type === AST_NODE_TYPES.Identifier &&
      current.property.name === methodName
    ) {
      return true;
    }
    if (
      current.type === AST_NODE_TYPES.CallExpression &&
      current.callee.type === AST_NODE_TYPES.MemberExpression &&
      current.callee.property.type === AST_NODE_TYPES.Identifier &&
      current.callee.property.name === methodName
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

export const requireLeanQueries = createRule<RuleOptions, MessageIds>({
  name: 'require-lean-queries',
  meta: {
    type: 'suggestion',
    docs: { description: 'Suggest .lean() for read-only Mongoose queries' },
    hasSuggestions: true,
    messages: {
      useLean: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Consider Using .lean()',
        cwe: 'CWE-400',
        owasp: 'A04:2021',
        cvss: 4.3,
        description: 'Full Mongoose documents use more memory than plain objects',
        severity: 'LOW',
        fix: 'Add .lean() for read-only queries to improve performance',
        documentationLink: 'https://mongoosejs.com/docs/tutorials/lean.html',
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

        if (!methodName || !READ_METHODS.includes(methodName)) {
          return;
        }

        // Check if .lean() exists anywhere in the chain
        if (!hasChainedMethod(node, 'lean')) {
          context.report({
            node,
            messageId: 'useLean',
          });
        }
      },
    };
  },
});

export default requireLeanQueries;
