/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-insecure-rsa-padding
 * Detects RSA with PKCS#1 v1.5 padding (Marvin Attack vulnerable)
 * CVE-2023-46809: Timing side-channel in Node.js privateDecrypt()
 *
 * @see https://nvd.nist.gov/vuln/detail/CVE-2023-46809
 * @see https://people.redhat.com/~hkario/marvin/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'insecureRsaPadding'
  | 'useOaep';

export interface Options {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Constants for PKCS#1 v1.5 padding (insecure)
const PKCS1_PADDING_NAMES = new Set([
  'RSA_PKCS1_PADDING',
  'constants.RSA_PKCS1_PADDING',
  'crypto.constants.RSA_PKCS1_PADDING',
]);

export const noInsecureRsaPadding = createRule<RuleOptions, MessageIds>({
  name: 'no-insecure-rsa-padding',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow RSA PKCS#1 v1.5 padding (CVE-2023-46809 Marvin Attack)',
    },
    hasSuggestions: true,
    messages: {
      insecureRsaPadding: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insecure RSA padding',
        cwe: 'CWE-327',
        description: 'RSA PKCS#1 v1.5 padding is vulnerable to the Marvin Attack (CVE-2023-46809). Timing side-channels allow attackers to decrypt ciphertexts or forge signatures.',
        severity: 'HIGH',
        fix: 'Use RSA_PKCS1_OAEP_PADDING instead',
        documentationLink: 'https://people.redhat.com/~hkario/marvin/',
      }),
      useOaep: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use OAEP padding',
        description: 'Use RSA-OAEP which is not vulnerable to padding oracle attacks',
        severity: 'LOW',
        fix: 'padding: crypto.constants.RSA_PKCS1_OAEP_PADDING',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptopublicdecryptkey-buffer',
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

    const sourceCode = context.sourceCode;

    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) return;

      // Check for privateDecrypt, publicDecrypt, privateEncrypt, publicEncrypt
      const rsaMethods = new Set(['privateDecrypt', 'publicDecrypt', 'privateEncrypt', 'publicEncrypt']);

      const isRsaCall =
        (node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          rsaMethods.has(node.callee.property.name)) ||
        (node.callee.type === AST_NODE_TYPES.Identifier &&
          rsaMethods.has(node.callee.name));

      if (isRsaCall && node.arguments.length >= 1) {
        const keyArg = node.arguments[0];

        // Check if first argument is an object with padding property
        if (keyArg.type === AST_NODE_TYPES.ObjectExpression) {
          for (const prop of keyArg.properties) {
            if (
              prop.type === AST_NODE_TYPES.Property &&
              prop.key.type === AST_NODE_TYPES.Identifier &&
              prop.key.name === 'padding'
            ) {
              const paddingText = sourceCode.getText(prop.value);
              if (PKCS1_PADDING_NAMES.has(paddingText) || paddingText.includes('RSA_PKCS1_PADDING')) {
                context.report({
                  node: prop,
                  messageId: 'insecureRsaPadding',
                  suggest: [
                    {
                      messageId: 'useOaep',
                      fix: (fixer: TSESLint.RuleFixer) => {
                        return fixer.replaceText(prop.value, 'crypto.constants.RSA_PKCS1_OAEP_PADDING');
                      },
                    },
                  ],
                });
              }
            }
          }
        }
      }
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

export type { Options as NoInsecureRsaPaddingOptions };
