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

type MessageIds = 'requireTls';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

export const requireTlsConnection = createRule<RuleOptions, MessageIds>({
  name: 'require-tls-connection',
  meta: {
    type: 'problem',
    docs: { description: 'Require TLS for MongoDB connections in production' },
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
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    const CONNECT_METHODS = ['connect', 'createConnection'];

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }

        const methodName = node.callee.property.type === AST_NODE_TYPES.Identifier
          ? node.callee.property.name
          : null;

        if (!methodName || !CONNECT_METHODS.includes(methodName)) {
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
