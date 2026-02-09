/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-auth-mechanism
 * Requires explicit authentication mechanism
 * CWE-287: Improper Authentication
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'requireAuthMechanism';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

const CONNECTION_METHODS = ['connect', 'createConnection'];

export const requireAuthMechanism = createRule<RuleOptions, MessageIds>({
  name: 'require-auth-mechanism',
  meta: {
    type: 'suggestion',
    docs: { description: 'Require explicit authentication mechanism (SCRAM-SHA-256)' },
    hasSuggestions: true,
    messages: {
      requireAuthMechanism: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Implicit Auth Mechanism',
        cwe: 'CWE-287',
        owasp: 'A07:2021',
        cvss: 6.5,
        description: 'MongoDB connection uses default authentication mechanism',
        severity: 'MEDIUM',
        fix: 'Add { authMechanism: "SCRAM-SHA-256" } to connection options',
        documentationLink: 'https://www.mongodb.com/docs/manual/core/authentication/',
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

        if (!methodName || !CONNECTION_METHODS.includes(methodName)) {
          return;
        }

        // Connection string is first argument, options is second
        const optionsArg = node.arguments[1];

        // No options at all
        if (!optionsArg) {
          context.report({ node, messageId: 'requireAuthMechanism' });
          return;
        }

        // Options exist, check for authMechanism
        if (optionsArg.type === AST_NODE_TYPES.ObjectExpression) {
          const hasAuthMechanism = optionsArg.properties.some((prop) => {
            if (prop.type !== AST_NODE_TYPES.Property) return false;
            const keyName = prop.key.type === AST_NODE_TYPES.Identifier
              ? prop.key.name
              : prop.key.type === AST_NODE_TYPES.Literal
                ? String(prop.key.value)
                : null;
            return keyName === 'authMechanism';
          });

          if (!hasAuthMechanism) {
            context.report({ node, messageId: 'requireAuthMechanism' });
          }
        }
      },
    };
  },
});

export default requireAuthMechanism;
