/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-tls-connection
 * Requires TLS for MongoDB connections
 * CWE-295: Improper Certificate Validation
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { isTestFile } from '../../utils/paths';
import { analyzeMongoScope } from '../../utils/receiver';

type MessageIds = 'requireTls';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

const CONNECT_METHODS = new Set(['connect', 'createConnection']);

export const requireTlsConnection = createRule<RuleOptions, MessageIds>({
  name: 'require-tls-connection',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mongodb-security/docs/rules/require-tls-connection.md', description: 'Require TLS for MongoDB connections in production',
      cwe: 'CWE-295',
      cvss: 7.4,
    },
    hasSuggestions: true,
    messages: {
      requireTls: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing TLS Connection',
        cwe: 'CWE-295',
        owasp: 'A02:2021',
        cvss: 7.4,
        description: 'MongoDB connection is not using TLS encryption',
        severity: 'HIGH',
        fix: 'Add { tls: true } to connection options',
        documentationLink: 'https://www.mongodb.com/docs/manual/tutorial/configure-ssl/',
      }),
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

    const mongo = analyzeMongoScope(context.sourceCode.ast);

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }

        const methodName = node.callee.property.type === AST_NODE_TYPES.Identifier
          ? node.callee.property.name
          : null;

        if (!methodName || !CONNECT_METHODS.has(methodName)) {
          return;
        }

        // Same as require-auth-mechanism: a `.connect()` is not evidence of
        // MongoDB.
        if (!mongo.isConnectionReceiver(node)) {
          return;
        }

        const optionsArg = node.arguments[1];
        if (!optionsArg || optionsArg.type !== AST_NODE_TYPES.ObjectExpression) {
          if (node.arguments.length >= 1) {
            context.report({
              node,
              messageId: 'requireTls',
            });
          }
          return;
        }

        const hasTls = optionsArg.properties.some((prop) => {
          if (prop.type !== AST_NODE_TYPES.Property) return false;
          const key = prop.key.type === AST_NODE_TYPES.Identifier ? prop.key.name : null;
          return (key === 'tls' || key === 'ssl') &&
            prop.value.type === AST_NODE_TYPES.Literal &&
            prop.value.value === true;
        });

        if (!hasTls) {
          context.report({
            node,
            messageId: 'requireTls',
          });
        }
      },
    };
  },
});

export default requireTlsConnection;
