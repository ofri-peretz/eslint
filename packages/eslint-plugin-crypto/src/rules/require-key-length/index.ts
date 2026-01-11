/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-key-length
 * Detects AES-128/192 when AES-256 is available
 * CWE-326: Inadequate Encryption Strength
 *
 * @see https://cwe.mitre.org/data/definitions/326.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'weakKeyLength'
  | 'useAes256';

export interface Options {
  /** Minimum AES key bits. Default: 256 */
  minKeyBits?: number;
}

type RuleOptions = [Options?];

const DEFAULT_MIN_KEY_BITS = 256;

export const requireKeyLength = createRule<RuleOptions, MessageIds>({
  name: 'require-key-length',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require AES-256 instead of AES-128/192',
    },
    hasSuggestions: true,
    messages: {
      weakKeyLength: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Weak key length',
        cwe: 'CWE-326',
        description: 'AES-{{bits}} provides less security than AES-256. While AES-128 is not broken, AES-256 provides better long-term security with minimal performance impact.',
        severity: 'MEDIUM',
        fix: 'Use AES-256: crypto.createCipheriv("aes-256-gcm", key, iv)',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html#algorithms',
      }),
      useAes256: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use AES-256',
        description: 'AES-256 provides maximum security with minimal performance cost',
        severity: 'LOW',
        fix: 'crypto.createCipheriv("aes-256-gcm", key256, iv)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptocreatecipherivalgorithm-key-iv-options',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          minKeyBits: {
            type: 'number',
            default: DEFAULT_MIN_KEY_BITS,
            description: 'Minimum required key bits',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      minKeyBits: DEFAULT_MIN_KEY_BITS,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const { minKeyBits = DEFAULT_MIN_KEY_BITS } = options as Options;

    function checkCallExpression(node: TSESTree.CallExpression) {
      const cipherMethods = new Set(['createCipheriv', 'createDecipheriv', 'createCipher', 'createDecipher']);

      const isCipherCall =
        (node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          cipherMethods.has(node.callee.property.name)) ||
        (node.callee.type === AST_NODE_TYPES.Identifier &&
          cipherMethods.has(node.callee.name));

      if (isCipherCall && node.arguments.length >= 1) {
        const algorithmArg = node.arguments[0];

        if (algorithmArg.type === AST_NODE_TYPES.Literal && typeof algorithmArg.value === 'string') {
          const algorithm = algorithmArg.value.toLowerCase();

          // Check for AES-128 or AES-192
          const aes128Match = algorithm.match(/aes-?128/i);
          const aes192Match = algorithm.match(/aes-?192/i);

          if (aes128Match && minKeyBits > 128) {
            const aes256Algorithm = algorithm.replace(/aes-?128/i, 'aes-256');
            context.report({
              node: algorithmArg,
              messageId: 'weakKeyLength',
              data: { bits: '128' },
              suggest: [
                {
                  messageId: 'useAes256',
                  fix: (fixer: TSESLint.RuleFixer) => {
                    return fixer.replaceText(algorithmArg, `"${aes256Algorithm}"`);
                  },
                },
              ],
            });
          } else if (aes192Match && minKeyBits > 192) {
            const aes256Algorithm = algorithm.replace(/aes-?192/i, 'aes-256');
            context.report({
              node: algorithmArg,
              messageId: 'weakKeyLength',
              data: { bits: '192' },
              suggest: [
                {
                  messageId: 'useAes256',
                  fix: (fixer: TSESLint.RuleFixer) => {
                    return fixer.replaceText(algorithmArg, `"${aes256Algorithm}"`);
                  },
                },
              ],
            });
          }
        }
      }
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

export type { Options as RequireKeyLengthOptions };
