/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-self-signed-certs
 * Detects rejectUnauthorized: false in TLS options
 * CWE-295: Improper Certificate Validation
 *
 * @see https://cwe.mitre.org/data/definitions/295.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'insecureTls'
  | 'enableValidation';

export interface Options {
  /** Allow in test/development files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noSelfSignedCerts = createRule<RuleOptions, MessageIds>({
  name: 'no-self-signed-certs',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow rejectUnauthorized: false in TLS options',
    },
    hasSuggestions: true,
    messages: {
      insecureTls: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'TLS certificate validation disabled',
        cwe: 'CWE-295',
        description: 'rejectUnauthorized: false disables TLS certificate validation, enabling man-in-the-middle attacks. Any certificate will be accepted, including self-signed and expired ones.',
        severity: 'CRITICAL',
        fix: 'Remove rejectUnauthorized: false or set it to true',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html',
      }),
      enableValidation: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Enable certificate validation',
        description: 'Enable proper TLS certificate validation',
        severity: 'LOW',
        fix: 'rejectUnauthorized: true (or remove the property)',
        documentationLink: 'https://nodejs.org/api/tls.html#tlsconnectoptions-callback',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const { allowInTests = false } = options as Options;

    const filename = context.filename;
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    function checkProperty(node: TSESTree.Property) {
      if (isTestFile) return;

      // Check for rejectUnauthorized: false
      if (
        node.key.type === AST_NODE_TYPES.Identifier &&
        node.key.name === 'rejectUnauthorized' &&
        node.value.type === AST_NODE_TYPES.Literal &&
        node.value.value === false
      ) {
        context.report({
          node,
          messageId: 'insecureTls',
          suggest: [
            {
              messageId: 'enableValidation',
              fix: (fixer: TSESLint.RuleFixer) => {
                return fixer.replaceText(node.value, 'true');
              },
            },
          ],
        });
      }
    }

    function checkAssignmentExpression(node: TSESTree.AssignmentExpression) {
      if (isTestFile) return;

      // Check for process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
      if (
        node.left.type === AST_NODE_TYPES.MemberExpression &&
        node.left.object.type === AST_NODE_TYPES.MemberExpression &&
        node.left.object.object.type === AST_NODE_TYPES.Identifier &&
        node.left.object.object.name === 'process' &&
        node.left.object.property.type === AST_NODE_TYPES.Identifier &&
        node.left.object.property.name === 'env' &&
        node.left.property.type === AST_NODE_TYPES.Identifier &&
        node.left.property.name === 'NODE_TLS_REJECT_UNAUTHORIZED'
      ) {
        if (
          node.right.type === AST_NODE_TYPES.Literal &&
          (node.right.value === '0' || node.right.value === 0)
        ) {
          /* c8 ignore next 10 -- process.env.NODE_TLS_REJECT_UNAUTHORIZED pattern requires complex AST */
          context.report({
            node,
            messageId: 'insecureTls',
            suggest: [
              {
                messageId: 'enableValidation',
                fix: () => null, // Should remove the assignment
              },
            ],
          });
        }
      }
    }

    return {
      Property: checkProperty,
      AssignmentExpression: checkAssignmentExpression,
    };
  },
});

export type { Options as NoSelfSignedCertsOptions };
