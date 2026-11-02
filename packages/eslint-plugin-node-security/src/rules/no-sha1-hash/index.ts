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
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  AST_NODE_TYPES,
  isModuleBinding,
  isTestFilePath,
} from '@interlace/eslint-devkit';

type MessageIds = 'sha1Deprecated' | 'useSha256' | 'useSha512';

export interface Options {
  /** Allow SHA1 in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noSha1Hash = createRule<RuleOptions, MessageIds>({
  name: 'no-sha1-hash',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-sha1-hash.md',
      description:
        'Disallow sha1() from crypto-hash package (use sha256 or sha512)',
      cwe: 'CWE-327',
      cvss: 7.5,
    },
    hasSuggestions: true,
    messages: {
      sha1Deprecated: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'SHA-1 hash detected',
        cwe: 'CWE-327',
        description:
          'SHA-1 is cryptographically broken and should not be used. The crypto-hash package itself warns against using sha1().',
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
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let isTestFile: boolean;

    return {
      before() {
        const [options = {}] = currentOptions();
        const { allowInTests = false } = options as Options;

        const filename = context.filename;
        isTestFile = allowInTests && isTestFilePath(filename);
      },
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

        // A call that RESOLVES to crypto-hash's `sha1`, however it was bound:
        // a named import, `const { sha1 } = require('crypto-hash')`,
        // `hashes.sha1(data)` on a namespace import or a required module.
        // Matching the spelling `sha1` missed every one but the first.
        if (
          !isModuleBinding(
            node.callee,
            context.sourceCode.getScope(node),
            'crypto-hash',
            ['sha1'],
          )
        ) {
          return;
        }
        // Renaming in place is only sound where the call site spells the
        // export: `sha1(d)` → `sha256(d)`, `hashes.sha1(d)` → `hashes.sha256(d)`.
        const callee = node.callee;
        const target =
          callee.type === AST_NODE_TYPES.Identifier && callee.name === 'sha1'
            ? callee
            : callee.type === AST_NODE_TYPES.MemberExpression &&
                !callee.computed
              ? callee.property
              : null;
        context.report({
          node,
          messageId: 'sha1Deprecated',
          suggest:
            target === null
              ? []
              : [
                  {
                    messageId: 'useSha256',
                    fix: (fixer: TSESLint.RuleFixer) =>
                      fixer.replaceText(target, 'sha256'),
                  },
                ],
        });
      },
    };
  },
});

export type { Options as NoSha1HashOptions };
