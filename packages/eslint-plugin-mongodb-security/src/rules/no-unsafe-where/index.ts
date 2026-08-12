/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unsafe-where
 * Detects dangerous $where operator usage (CVE-2025-23061, CVE-2024-53900)
 * CWE-943: NoSQL Injection
 *
 * @see https://nvd.nist.gov/vuln/detail/CVE-2025-23061
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { isTestFile } from '../../utils/paths';
import { fileUsesMongo } from '../../utils/mongo-evidence';

type MessageIds = 'unsafeWhere';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

export const noUnsafeWhere = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-where',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mongodb-security/docs/rules/no-unsafe-where.md',
      description: 'Prevent $where operator RCE attacks (CVE-2025-23061)',
      cwe: 'CWE-943',
      cvss: 9,
    },
    messages: {
      unsafeWhere: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: '$where Operator RCE',
        cwe: 'CWE-943',
        owasp: 'A01:2021',
        cvss: 9.0,
        description: 'The $where operator executes JavaScript and enables Remote Code Execution',
        severity: 'CRITICAL',
        fix: 'Remove $where and use standard query operators like $eq, $in, $regex',
        documentationLink: 'https://nvd.nist.gov/vuln/detail/CVE-2025-23061',
      }),
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

    return {
      Property(node: TSESTree.Property) {
        const keyName = node.key.type === AST_NODE_TYPES.Identifier
          ? node.key.name
          : node.key.type === AST_NODE_TYPES.Literal
            ? String(node.key.value)
            : null;

        if (keyName === '$where') {
          context.report({
            node,
            messageId: 'unsafeWhere',
          });
        }
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'where' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === AST_NODE_TYPES.Literal &&
          node.arguments[0].value === '$where'
        ) {
          context.report({
            node,
            messageId: 'unsafeWhere',
          });
        }
      },
    };
  },
});

export default noUnsafeWhere;
