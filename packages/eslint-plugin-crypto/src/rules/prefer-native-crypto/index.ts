/**
 * ESLint Rule: prefer-native-crypto
 * Suggests using native crypto over third-party libraries
 * CWE-1104: Use of Unmaintained Third Party Components
 *
 * Native crypto is maintained by Node.js/browser vendors and is always up-to-date
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'preferNative'
  | 'useNodeCrypto'
  | 'useWebCrypto';

export interface Options {
  /** Severity level. Default: 'warn' */
  severity?: 'error' | 'warn';
}

type RuleOptions = [Options?];

// Third-party crypto libraries that should be replaced with native
const THIRD_PARTY_CRYPTO_LIBS = new Set([
  'crypto-js',
  'cryptojs',
  'sjcl',           // Stanford JavaScript Crypto Library
  'forge',          // node-forge
  'node-forge',
  'jsencrypt',
  'bcryptjs',       // pure JS bcrypt (prefer native bcrypt)
  'js-sha256',
  'js-sha512',
  'js-sha3',
  'js-md5',
  'blueimp-md5',
  'aes-js',
]);

export const preferNativeCrypto = createRule<RuleOptions, MessageIds>({
  name: 'prefer-native-crypto',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer native crypto over third-party libraries',
    },
    hasSuggestions: true,
    messages: {
      preferNative: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Third-party crypto library',
        cwe: 'CWE-1104',
        description: '{{library}} is a third-party crypto library. Native crypto (Node.js crypto or Web Crypto API) is faster, more secure, and always maintained.',
        severity: 'MEDIUM',
        fix: 'Migrate to native crypto module',
        documentationLink: 'https://nodejs.org/api/crypto.html',
      }),
      useNodeCrypto: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Node.js crypto',
        description: 'Node.js crypto module is built-in and maintained',
        severity: 'LOW',
        fix: 'import crypto from "node:crypto"',
        documentationLink: 'https://nodejs.org/api/crypto.html',
      }),
      useWebCrypto: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Web Crypto API',
        description: 'Web Crypto API is built into browsers and Node.js 15+',
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
            description: 'Severity level',
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
    function reportThirdPartyLib(node: TSESTree.Node, library: string) {
      /* c8 ignore next 15 -- suggestions with fix: () => null cannot be tested with RuleTester */
      context.report({
        node,
        messageId: 'preferNative',
        data: { library },
        suggest: [
          {
            messageId: 'useNodeCrypto',
            fix: () => null,
          },
          {
            messageId: 'useWebCrypto',
            fix: () => null,
          },
        ],
      });
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (typeof node.source.value === 'string') {
          const lib = node.source.value.split('/')[0]; // Get base package name
          if (THIRD_PARTY_CRYPTO_LIBS.has(lib)) {
            reportThirdPartyLib(node, lib);
          }
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === AST_NODE_TYPES.Literal &&
          typeof node.arguments[0].value === 'string'
        ) {
          const lib = node.arguments[0].value.split('/')[0];
          if (THIRD_PARTY_CRYPTO_LIBS.has(lib)) {
            reportThirdPartyLib(node, lib);
          }
        }
      },
    };
  },
});

export type { Options as PreferNativeCryptoOptions };
