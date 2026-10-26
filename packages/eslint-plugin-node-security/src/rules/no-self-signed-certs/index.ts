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
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  isTestFilePath,
  MessageIcons,
  objectKeyName,
  propertyName,
  staticString,
} from '@interlace/eslint-devkit';

type MessageIds = 'insecureTls' | 'enableValidation';

export interface Options {
  /** Allow in test/development files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noSelfSignedCerts = createRule<RuleOptions, MessageIds>({
  name: 'no-self-signed-certs',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-self-signed-certs.md',
      description: 'Disallow rejectUnauthorized: false in TLS options',
      cwe: 'CWE-295',
      cvss: 7.4,
    },
    hasSuggestions: true,
    messages: {
      insecureTls: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'TLS certificate validation disabled',
        cwe: 'CWE-295',
        description:
          'rejectUnauthorized: false disables TLS certificate validation, enabling man-in-the-middle attacks. Any certificate will be accepted, including self-signed and expired ones.',
        severity: 'CRITICAL',
        fix: 'Remove rejectUnauthorized: false or set it to true',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html',
      }),
      enableValidation: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Enable certificate validation',
        description: 'Enable proper TLS certificate validation',
        severity: 'LOW',
        fix: 'rejectUnauthorized: true (or remove the property)',
        documentationLink:
          'https://nodejs.org/api/tls.html#tlsconnectoptions-callback',
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
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let isTestFile: boolean;

    function checkProperty(node: TSESTree.Property) {
      if (isTestFile) return;

      // Check for rejectUnauthorized: false
      if (
        objectKeyName(node) === 'rejectUnauthorized' &&
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

    function isProcess(node: TSESTree.Expression): boolean {
      if (node.type === AST_NODE_TYPES.Identifier)
        return node.name === 'process';
      return (
        node.type === AST_NODE_TYPES.MemberExpression &&
        node.object.type === AST_NODE_TYPES.Identifier &&
        node.object.name === 'globalThis' &&
        propertyName(node) === 'process'
      );
    }

    function checkAssignmentExpression(node: TSESTree.AssignmentExpression) {
      if (isTestFile) return;

      // Check for process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
      // (also `globalThis.process.env…`, the same object)
      if (
        node.left.type === AST_NODE_TYPES.MemberExpression &&
        node.left.object.type === AST_NODE_TYPES.MemberExpression &&
        isProcess(node.left.object.object) &&
        propertyName(node.left.object) === 'env' &&
        propertyName(node.left) === 'NODE_TLS_REJECT_UNAUTHORIZED'
      ) {
        // An env var is a string: `'0'`, `` `0` `` and `0` all store '0'.
        if (
          staticString(node.right) === '0' ||
          (node.right.type === AST_NODE_TYPES.Literal && node.right.value === 0)
        ) {
          context.report({
            node,
            messageId: 'insecureTls',
          });
        }
      }
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        const { allowInTests = false } = options as Options;

        const filename = context.filename;
        isTestFile = allowInTests && isTestFilePath(filename);
      },
      Property: checkProperty,
      AssignmentExpression: checkAssignmentExpression,
    };
  },
});

export type { Options as NoSelfSignedCertsOptions };
