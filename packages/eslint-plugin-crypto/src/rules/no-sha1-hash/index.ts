/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-sha1-hash
 * Detects sha1() usage from crypto-hash package
 * CWE-327: SHA-1 is cryptographically broken
 *
 * The crypto-hash package itself warns: "SHA-1 is insecure and should not be used"
 * @see https://www.npmjs.com/package/crypto-hash
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'sha1Deprecated'
  | 'useSha256'
  | 'useSha512';

export interface Options {
  /** Allow SHA1 in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noSha1Hash = createRule<RuleOptions, MessageIds>({
  name: 'no-sha1-hash',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow sha1() from crypto-hash package (use sha256 or sha512)',
    },
    hasSuggestions: true,
    messages: {
      sha1Deprecated: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'SHA-1 hash detected',
        cwe: 'CWE-327',
        description: 'SHA-1 is cryptographically broken and should not be used. The crypto-hash package itself warns against using sha1().',
        severity: 'HIGH',
        fix: 'Use sha256() or sha512() instead',
        documentationLink: 'https://shattered.io/',
      }),
      useSha256: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use sha256',
        description: 'SHA-256 provides adequate security for most use cases',
        severity: 'LOW',
        fix: "import { sha256 } from 'crypto-hash'; await sha256(data)",
        documentationLink: 'https://www.npmjs.com/package/crypto-hash',
      }),
      useSha512: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use sha512',
        description: 'SHA-512 provides stronger security with longer hash',
        severity: 'LOW',
        fix: "import { sha512 } from 'crypto-hash'; await sha512(data)",
        documentationLink: 'https://www.npmjs.com/package/crypto-hash',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow SHA1 in test files',
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

    // Track if sha1 was imported from crypto-hash
    let sha1ImportedFromCryptoHash = false;

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (isTestFile) return;

        // Check for: import { sha1 } from 'crypto-hash'
        if (node.source.value === 'crypto-hash') {
          for (const specifier of node.specifiers) {
            if (
              specifier.type === AST_NODE_TYPES.ImportSpecifier &&
              specifier.imported.type === AST_NODE_TYPES.Identifier &&
              specifier.imported.name === 'sha1'
            ) {
              sha1ImportedFromCryptoHash = true;
              context.report({
                node: specifier,
                messageId: 'sha1Deprecated',
                suggest: [
                  {
                    messageId: 'useSha256',
                    fix: (fixer: TSESLint.RuleFixer) => {
                      return fixer.replaceText(specifier.imported, 'sha256');
                    },
                  },
                  {
                    messageId: 'useSha512',
                    fix: (fixer: TSESLint.RuleFixer) => {
                      return fixer.replaceText(specifier.imported, 'sha512');
                    },
                  },
                ],
              });
            }
          }
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (isTestFile) return;

        // Check for sha1() call if imported from crypto-hash
        if (
          sha1ImportedFromCryptoHash &&
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'sha1'
        ) {
          /* c8 ignore next 12 -- sha1() call pattern requires specific import tracking */
          context.report({
            node,
            messageId: 'sha1Deprecated',
            suggest: [
              {
                messageId: 'useSha256',
                fix: (fixer: TSESLint.RuleFixer) => {
                  return fixer.replaceText(node.callee, 'sha256');
                },
              },
            ],
          });
        }
      },
    };
  },
});

export type { Options as NoSha1HashOptions };
