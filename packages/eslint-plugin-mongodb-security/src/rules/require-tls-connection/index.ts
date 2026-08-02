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

type MessageIds = 'requireTls' | 'suggestionAddTls';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

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
      suggestionAddTls: 'Add tls: true to the connection options',
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

    const CONNECT_METHODS = new Set(['connect', 'createConnection']);

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

        const optionsArg = node.arguments[1];
        if (!optionsArg || optionsArg.type !== AST_NODE_TYPES.ObjectExpression) {
          if (node.arguments.length >= 1) {
            const uriArg = node.arguments[0];
            context.report({
              node,
              messageId: 'requireTls',
              // Only offer the rewrite when there is nothing in the options
              // slot to merge with — an existing non-object second argument
              // (spread config, variable) can't be edited mechanically.
              suggest:
                node.arguments.length === 1
                  ? [
                      {
                        messageId: 'suggestionAddTls',
                        fix: (fixer: TSESLint.RuleFixer) =>
                          fixer.insertTextAfter(uriArg, ', { tls: true }'),
                      },
                    ]
                  : undefined,
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
          // A `tls`/`ssl` key that is present but not `true` gets its value
          // flipped; appending a second one would emit a duplicate key.
          const existing = optionsArg.properties.find((prop) => {
            if (prop.type !== AST_NODE_TYPES.Property) return false;
            // Key text rather than node shape: catches `tls`, `'tls'` and
            // `"ssl"` in one comparison.
            const key = context.sourceCode.getText(prop.key).replaceAll(/['"]/g, '');
            return key === 'tls' || key === 'ssl';
          }) as TSESTree.Property | undefined;
          const lastProperty = optionsArg.properties.at(-1);
          // A quoted `'tls': true` still reports (the key check above only
          // accepts identifier keys) but there is nothing to rewrite — offering
          // a no-op suggestion is worse than offering none.
          const alreadyTrue =
            existing?.value.type === AST_NODE_TYPES.Literal && existing.value.value === true;
          context.report({
            node,
            messageId: 'requireTls',
            suggest: alreadyTrue
              ? undefined
              : [
                  {
                    messageId: 'suggestionAddTls',
                    fix: (fixer: TSESLint.RuleFixer) => {
                      if (existing) return fixer.replaceText(existing.value, 'true');
                      return lastProperty
                        ? fixer.insertTextAfter(lastProperty, ', tls: true')
                        : fixer.replaceText(optionsArg, '{ tls: true }');
                    },
                  },
                ],
          });
        }
      },
    };
  },
});

export default requireTlsConnection;
