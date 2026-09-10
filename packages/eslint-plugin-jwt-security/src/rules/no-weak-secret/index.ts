/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-weak-secret
 *
 * Detects weak secrets used for HMAC-based JWT signing.
 * Weak secrets can be brute-forced, allowing attackers to forge tokens.
 *
 * CWE-326: Inadequate Encryption Strength
 *
 * @see https://tools.ietf.org/html/rfc8725
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import {
  byteKeyLiteral,
  isSignOperation,
  isSignatureVerifyOperation,
  isEnvVariable,
} from '../../utils';
import type { NoWeakSecretOptions } from '../../types';

type MessageIds = 'weakSecret' | 'shortSecret' | 'useStrongSecret';

type RuleOptions = [NoWeakSecretOptions?];

// Common weak secret patterns
const WEAK_SECRET_PATTERNS = [
  /^secret$/i,
  /^password$/i,
  /^123456/,
  /^test/i,
  /^demo/i,
  /^example/i,
  /^changeme/i,
  /^default/i,
];

/**
 * How many BYTES a key literal actually carries.
 *
 * A key's length in the source and its strength are different numbers the
 * moment an encoding is named: `Buffer.from('00112233445566778899aabbccddeeff',
 * 'hex')` is 32 characters and 16 bytes. Counting characters called that key
 * long enough for a 32-byte floor and reported nothing — for a key at half the
 * configured strength.
 */
function decodedByteLength(value: string, encoding?: string): number {
  if (encoding === 'hex') return Math.floor(value.length / 2);
  if (encoding === 'base64' || encoding === 'base64url') {
    return Math.floor((value.replace(/=+$/u, '').length * 3) / 4);
  }
  /*
   * utf8, latin1, ascii and the unencoded default. One byte per character is
   * the floor for all of them — a multi-byte character only makes the key
   * longer — so counting characters can never overstate the strength.
   */
  return value.length;
}

export const noWeakSecret = createRule<RuleOptions, MessageIds>({
  name: 'no-weak-secret',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-jwt-security/docs/rules/no-weak-secret.md',
      description:
        'Require strong secrets (256+ bits) for HMAC-based JWT signing',
      cwe: 'CWE-326',
      cvss: 5.9,
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      weakSecret: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Weak JWT Secret',
        cwe: 'CWE-326',
        description: 'JWT secret is too weak and can be brute-forced',
        severity: 'HIGH',
        fix: 'Use crypto.randomBytes(32).toString("hex") for secrets',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
      shortSecret: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Short JWT Secret',
        cwe: 'CWE-326',
        description:
          'JWT secret must be at least 32 characters (256 bits) for HS256',
        severity: 'HIGH',
        fix: 'Generate a secret with: crypto.randomBytes(32).toString("hex")',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
      useStrongSecret: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Strong Secret',
        description: 'Replace with cryptographically strong secret',
        severity: 'LOW',
        fix: 'Use process.env.JWT_SECRET with a 256-bit random value',
        documentationLink: 'https://nodejs.org/api/crypto.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          minSecretLength: {
            type: 'integer',
            default: 32,
            minimum: 16,
            description: 'Minimum secret length in characters',
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          strictMode: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      minSecretLength: 32,
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] ?? {};
    const { minSecretLength = 32 } = options;

    /**
     * Check if a value matches known weak patterns
     */
    const isKnownWeakPattern = (value: string): boolean => {
      return WEAK_SECRET_PATTERNS.some((pattern) => pattern.test(value));
    };

    /**
     * Check the secret argument for weakness
     */
    const checkSecret = (
      secretNode: TSESTree.Node,
      encoding?: string,
    ): void => {
      // Environment variables are considered safe (configuration)
      if (isEnvVariable(secretNode)) {
        return;
      }

      /*
       * jose takes symmetric keys as bytes, and its documented idiom is
       * `new TextEncoder().encode(secret)`. A short secret is exactly as weak
       * wrapped in an encoder as it is bare, so judge the literal inside.
       */
      const bytes = byteKeyLiteral(secretNode);
      if (bytes !== null) {
        checkSecret(bytes.literal, bytes.encoding);
        return;
      }

      // Check string literals
      if (
        secretNode.type === 'Literal' &&
        typeof secretNode.value === 'string'
      ) {
        const secretValue = secretNode.value;

        // Check for known weak patterns
        if (isKnownWeakPattern(secretValue)) {
          context.report({
            node: secretNode,
            messageId: 'weakSecret',
          });
          return;
        }

        // Check for short secrets
        if (decodedByteLength(secretValue, encoding) < minSecretLength) {
          context.report({
            node: secretNode,
            messageId: 'shortSecret',
            data: {
              length: String(secretValue.length),
              minLength: String(minSecretLength),
            },
          });
        }
      }

      // Template literals with obvious weak values
      if (
        secretNode.type === 'TemplateLiteral' &&
        secretNode.quasis.length === 1
      ) {
        const rawValue = secretNode.quasis[0].value.raw;
        if (isKnownWeakPattern(rawValue) || rawValue.length < minSecretLength) {
          context.report({
            node: secretNode,
            messageId: 'weakSecret',
          });
        }
      }
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check both sign and verify operations
        if (!isSignOperation(node) && !isSignatureVerifyOperation(node)) {
          return;
        }

        // Secret is usually the second argument
        if (node.arguments.length >= 2) {
          checkSecret(node.arguments[1]);
        }
      },
    };
  },
});

export default noWeakSecret;
