/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-projection
 * Requires field projection on queries
 * CWE-200: Information Exposure
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'requireProjection';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

const QUERY_METHODS = new Set(['find', 'findOne', 'findById']);

/**
 * Check if any chained call in the parent chain includes .select()
 */
function hasChainedSelect(node: TSESTree.CallExpression): boolean {
  let current: TSESTree.Node | undefined = node.parent;
  while (current) {
    if (
      current.type === AST_NODE_TYPES.MemberExpression &&
      current.property.type === AST_NODE_TYPES.Identifier &&
      current.property.name === 'select'
    ) {
      return true;
    }
    if (
      current.type === AST_NODE_TYPES.CallExpression &&
      current.callee.type === AST_NODE_TYPES.MemberExpression &&
      current.callee.property.type === AST_NODE_TYPES.Identifier &&
      current.callee.property.name === 'select'
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

export const requireProjection = createRule<RuleOptions, MessageIds>({
  name: 'require-projection',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mongodb-security/docs/rules/require-projection.md', description: 'Require field projection on MongoDB queries',
      cwe: 'CWE-200',
      cvss: 3.7,
    },
    hasSuggestions: true,
    messages: {
      requireProjection: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Missing Projection',
        cwe: 'CWE-200',
        owasp: 'A01:2021',
        cvss: 3.7,
        description: 'Query returns all fields without projection',
        severity: 'LOW',
        fix: 'Add projection to select only required fields',
        documentationLink: 'https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/',
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

        if (!methodName || !QUERY_METHODS.has(methodName)) {
          return;
        }

        // Check if find/findOne has a second argument (projection)
        if (methodName !== 'findById' && node.arguments.length >= 2) {
          return; // has inline projection
        }

        // findById has projection as second arg too
        if (methodName === 'findById' && node.arguments.length >= 2) {
          return; // has inline projection
        }

        // Check if .select() is chained
        if (hasChainedSelect(node)) {
          return;
        }

        context.report({
          node,
          messageId: 'requireProjection',
        });
      },
    };
  },
});

export default requireProjection;
