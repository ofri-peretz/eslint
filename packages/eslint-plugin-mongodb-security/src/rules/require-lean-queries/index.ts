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
import { isTestFile } from '../../utils/paths';
import { analyzeMongoScope } from '../../utils/receiver';

type MessageIds = 'useLean' | 'suggestionAddLean';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

const READ_METHODS = new Set(['find', 'findOne', 'findById']);

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
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mongodb-security/docs/rules/require-lean-queries.md', description: 'Suggest .lean() for read-only Mongoose queries',
      cwe: 'CWE-400',
      cvss: 4.3,
    },
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
      suggestionAddLean: 'Append .lean() to the query',
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options = {}] = context.options;
    const { allowInTests = true } = options as Options;
    const filename = context.filename;
    const inTestFile = isTestFile(filename);

    if (allowInTests && inTestFile) {
      return {};
    }

    // `find` is also Array.prototype.find. Without this the rule reported
    // every `.find()` in every codebase — measured at 115 findings on this
    // repo alone, which contains no MongoDB. The receiver has to look like
    // a Mongo handle before a method name means anything.
    const mongo = analyzeMongoScope(context.sourceCode.ast);

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }

        const methodName = node.callee.property.type === AST_NODE_TYPES.Identifier
          ? node.callee.property.name
          : null;

        if (!methodName || !READ_METHODS.has(methodName)) {
          return;
        }

        // Cheap syntax checks first; the receiver analysis is the expensive
        // one and the only one that can tell a Mongo query from Array.find.
        if (!mongo.isModelReceiver(node)) {
          return;
        }

        // Check if .lean() exists anywhere in the chain
        if (!hasChainedMethod(node, 'lean')) {
          context.report({
            node,
            messageId: 'useLean',
            suggest: [
              {
                messageId: 'suggestionAddLean',
                fix: (fixer: TSESLint.RuleFixer) => fixer.insertTextAfter(node, '.lean()'),
              },
            ],
          });
        }
      },
    };
  },
});

export default requireLeanQueries;
