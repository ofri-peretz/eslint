/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-cryptojs
 * Warns on usage of deprecated crypto-js library
 * CWE-1104: Use of Unmaintained Third Party Components
 *
 * crypto-js is not maintained since 2022 and recommends using native crypto
 * @see https://www.npmjs.com/package/crypto-js
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'deprecatedCryptojs'
  | 'useNativeCrypto'
  | 'useWebCrypto';

export interface Options {
  /** Severity level. Default: 'warn' */
  severity?: 'error' | 'warn';
}

type RuleOptions = [Options?];

export const noCryptojs = createRule<RuleOptions, MessageIds>({
  name: 'no-cryptojs',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow deprecated crypto-js library (use native crypto instead)',
    },
    hasSuggestions: true,
    messages: {
      deprecatedCryptojs: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Deprecated crypto-js library',
        cwe: 'CWE-1104',
        description: 'crypto-js is no longer maintained (last update: 2022). Future vulnerabilities will not be patched.',
        severity: 'MEDIUM',
        fix: 'Migrate to native Node.js crypto module or Web Crypto API',
        documentationLink: 'https://nodejs.org/api/crypto.html',
      }),
      useNativeCrypto: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Node.js crypto',
        description: 'Node.js crypto module is maintained by the Node.js core team',
        severity: 'LOW',
        fix: 'import crypto from "node:crypto"',
        documentationLink: 'https://nodejs.org/api/crypto.html',
      }),
      useWebCrypto: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Web Crypto API',
        description: 'Web Crypto API works in browsers and Node.js',
        severity: 'LOW',
        fix: 'globalThis.crypto.subtle',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          severity: {
            type: 'string',
            enum: ['error', 'warn'],
            default: 'warn',
            description: 'Severity level for the rule',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      severity: 'warn',
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    function reportDeprecatedLibrary(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'deprecatedCryptojs',
        suggest: [
          {
            messageId: 'useNativeCrypto',
            fix: () => null, // Complex migration
          },
          {
            messageId: 'useWebCrypto',
            fix: () => null, // Complex migration
          },
        ],
      });
    }

    return {
      // import CryptoJS from 'crypto-js'
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (
          typeof node.source.value === 'string' &&
          (node.source.value === 'crypto-js' || node.source.value.startsWith('crypto-js/'))
        ) {
          reportDeprecatedLibrary(node);
        }
      },

      // const CryptoJS = require('crypto-js')
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === AST_NODE_TYPES.Literal &&
          typeof node.arguments[0].value === 'string' &&
          (node.arguments[0].value === 'crypto-js' || node.arguments[0].value.startsWith('crypto-js/'))
        ) {
          reportDeprecatedLibrary(node);
        }
      },
    };
  },
});

export type { Options as NoCryptojsOptions };
