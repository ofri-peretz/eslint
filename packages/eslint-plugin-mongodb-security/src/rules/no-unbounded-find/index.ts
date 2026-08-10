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
import { isTestFile } from '../../utils/paths';
import { analyzeMongoScope } from '../../utils/receiver';
import { fileUsesMongo } from '../../utils/mongo-evidence';

type MessageIds = 'unboundedFind' | 'suggestionAddLimit';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

// `findOne` is bounded by definition (returns at most one document) and must
// not be flagged here. The CWE-400 concern is unbounded multi-doc reads, which
// is `find()` only.
const FIND_METHODS = new Set(['find']);

export const noUnboundedFind = createRule<RuleOptions, MessageIds>({
  name: 'no-unbounded-find',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mongodb-security/docs/rules/no-unbounded-find.md', description: 'Require limit() on find queries to prevent resource exhaustion',
      cwe: 'CWE-400',
      cvss: 4.3,
    },
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
      suggestionAddLimit: 'Append .limit(100) to the query',
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    // Every rule here is MongoDB-specific, and none of them could ask the
    // file-level question: over the corpus, 47% of this plugin's findings were
    // in files with no Mongo in them. `receiver.ts` discriminates by receiver
    // NAME, which matches `userModel.findOne()` in a TypeORM repository just as
    // well as in a Mongoose one. Registering no visitors is both the gate and
    // the cheap path.
    if (!fileUsesMongo(context.sourceCode.ast)) return {};

    const [options = {}] = context.options;
    const { allowInTests = true } = options as Options;
    const filename = context.filename;
    const inTestFile = isTestFile(filename);

    if (allowInTests && inTestFile) {
      return {};
    }

    const mongo = analyzeMongoScope(context.sourceCode.ast);

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }

        const methodName = node.callee.property.type === AST_NODE_TYPES.Identifier
          ? node.callee.property.name
          : null;

        if (!methodName || !FIND_METHODS.has(methodName)) {
          return;
        }

        // `Array.prototype.find` outnumbers Mongo `find()` in most codebases.
        // Only a model/collection receiver can exhaust a database.
        if (!mongo.isModelReceiver(node)) {
          return;
        }

        // Walk the full chain: find().a().b().limit() — accept .limit() at
        // any depth. Earlier versions only checked parent/grandparent, which
        // missed long chains like `.select(...).limit(100).toArray()`.
        let cursor: TSESTree.Node | undefined = node.parent;
        while (cursor) {
          if (
            cursor.type === AST_NODE_TYPES.MemberExpression &&
            cursor.property.type === AST_NODE_TYPES.Identifier &&
            cursor.property.name === 'limit'
          ) return;
          if (
            cursor.type === AST_NODE_TYPES.CallExpression &&
            cursor.callee.type === AST_NODE_TYPES.MemberExpression &&
            cursor.callee.property.type === AST_NODE_TYPES.Identifier &&
            cursor.callee.property.name === 'limit'
          ) return;
          // Stop walking once we leave the chain (the call is no longer the
          // object of a member expression / callee).
          const next: TSESTree.Node | undefined = cursor.parent;
          if (!next) break;
          if (
            next.type === AST_NODE_TYPES.MemberExpression && next.object === cursor
          ) { cursor = next; continue; }
          if (
            next.type === AST_NODE_TYPES.CallExpression && next.callee === cursor
          ) { cursor = next; continue; }
          break;
        }

        // Native MongoDB driver: { limit: N } in 2nd argument options.
        const opts = node.arguments[1];
        if (opts && opts.type === AST_NODE_TYPES.ObjectExpression) {
          const hasLimit = opts.properties.some(
            (p) =>
              p.type === AST_NODE_TYPES.Property &&
              p.key.type === AST_NODE_TYPES.Identifier &&
              p.key.name === 'limit',
          );
          if (hasLimit) return;
        }

        context.report({
          node,
          messageId: 'unboundedFind',
          suggest: [
            {
              messageId: 'suggestionAddLimit',
              // ponytail: 100 mirrors the message's documented default; make it
              // an option only if users ask for a different ceiling.
              fix: (fixer: TSESLint.RuleFixer) => fixer.insertTextAfter(node, '.limit(100)'),
            },
          ],
        });
      },
    };
  },
});

export default noUnboundedFind;
