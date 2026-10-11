/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-algorithm-confusion
 *
 * Detects algorithm confusion attacks where symmetric algorithms (HS256/384/512)
 * are used with asymmetric keys (public keys). This allows attackers to sign
 * tokens using the public key as an HMAC secret.
 *
 * CWE-347: Improper Verification of Cryptographic Signature
 *
 * @see https://portswigger.net/web-security/jwt/algorithm-confusion
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
  objectKeyName,
} from '@interlace/eslint-devkit';
import {
  isSignatureVerifyOperation,
  resolveCallOptions,
  extractAlgorithms,
  SECURE_ALGORITHMS,
} from '../../utils';
import type { NoAlgorithmConfusionOptions } from '../../types';

type MessageIds =
  'algorithmConfusion' | 'symmetricWithPublicKey' | 'useAsymmetricAlgorithm';

type RuleOptions = [NoAlgorithmConfusionOptions?];

// Patterns that indicate a public key
const PUBLIC_KEY_PATTERNS = [
  /public/i,
  /\.pub$/,
  /\.pem$/,
  /-----BEGIN PUBLIC KEY-----/,
  /-----BEGIN RSA PUBLIC KEY-----/,
  /-----BEGIN EC PUBLIC KEY-----/,
  /getPublicKey/i,
  /publicKey/i,
  /jwks/i,
];

export const noAlgorithmConfusion = createRule<RuleOptions, MessageIds>({
  name: 'no-algorithm-confusion',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-jwt-security/docs/rules/no-algorithm-confusion.md',
      description:
        'Prevent algorithm confusion attacks using symmetric algorithms with asymmetric keys',
      cwe: 'CWE-347',
      cvss: 9.5,
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      algorithmConfusion: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'JWT Algorithm Confusion Attack',
        cwe: 'CWE-347',
        description:
          'Symmetric algorithm (HS*) used with public key allows token forgery',
        severity: 'CRITICAL',
        fix: 'Use asymmetric algorithms (RS256, ES256) with public keys',
        documentationLink:
          'https://portswigger.net/web-security/jwt/algorithm-confusion',
      }),
      symmetricWithPublicKey: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Symmetric Algorithm with Public Key',
        cwe: 'CWE-347',
        description:
          'HS256/384/512 should only be used with shared secrets, not public keys',
        severity: 'CRITICAL',
        fix: 'Switch to RS256 or ES256 for asymmetric key verification',
        documentationLink:
          'https://portswigger.net/web-security/jwt/algorithm-confusion',
      }),
      useAsymmetricAlgorithm: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Asymmetric Algorithm',
        description: 'Replace HS* with RS* or ES* algorithm',
        severity: 'LOW',
        fix: 'Use RS256 or ES256 with public key verification',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          symmetricAlgorithms: {
            type: 'array',
            items: { type: 'string' },
            default: ['HS256', 'HS384', 'HS512'],
            description: 'Algorithms to flag when used with public keys',
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
      symmetricAlgorithms: ['HS256', 'HS384', 'HS512'],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] ?? {};
    const symmetricAlgSet = new Set(
      options.symmetricAlgorithms ?? ['HS256', 'HS384', 'HS512'],
    );
    const sourceCode = context.sourceCode;

    /**
     * Check if a node looks like a public key reference
     */
    const looksLikePublicKey = (node: TSESTree.Node): boolean => {
      const text = sourceCode.getText(node);
      return PUBLIC_KEY_PATTERNS.some((pattern) => pattern.test(text));
    };

    /**
     * Check if algorithms include symmetric algorithms
     */
    const hasSymmetricAlgorithm = (algorithms: string[]): string | null => {
      for (const alg of algorithms) {
        if (symmetricAlgSet.has(alg)) {
          return alg;
        }
      }
      return null;
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Only check verify operations
        if (!isSignatureVerifyOperation(node, sourceCode)) {
          return;
        }

        // Need at least 2 arguments: token, key
        if (node.arguments.length < 2) {
          return;
        }

        // Options resolved structurally: a const, an `as` cast, a spread.
        const options = resolveCallOptions(node, sourceCode);
        if (options === null) {
          return;
        }

        const algorithms = extractAlgorithms(options);
        const symmetricAlg = hasSymmetricAlgorithm(algorithms);
        if (!symmetricAlg) {
          return;
        }

        /*
         * Two ways in, and only the first is independent of naming.
         *
         * 1. The whitelist admits BOTH an HMAC and an asymmetric algorithm.
         *    That is CVE-2015-9235's configuration: the attacker picks HS*,
         *    and the verifier HMACs with whatever key material it holds for
         *    RS* or ES*. The key's name says nothing either way — `cert`, `foo`
         *    and `publicKey` are equally exploitable — so this is decided from
         *    the list alone.
         * 2. An HMAC-only list with a key that looks public (a PEM header, a
         *    `getPublicKey()` call, a `.pem` path …).
         */
        const mixesFamilies = algorithms.some((alg) =>
          SECURE_ALGORITHMS.has(alg),
        );
        if (!mixesFamilies && !looksLikePublicKey(node.arguments[1])) {
          return;
        }

        // Find the algorithm node for precise error location
        for (const prop of options.properties) {
          if (
            // @vocabulary JOSE / RFC 7519 header and jsonwebtoken option names
            // `objectKeyName`, not `key.name`: requiring an Identifier key
            // missed `{ ['alg']: … }` and `{ 'alg': … }`, which name the
            // same option and are what a bundler and ordinary hand-written
            // JS respectively produce.
            ['algorithms', 'algorithm', 'alg'].includes(
              objectKeyName(prop) ?? '',
            )
          ) {
            context.report({
              node: prop.value,
              messageId: 'algorithmConfusion',
              data: { algorithm: symmetricAlg },
            });
            return;
          }
        }
      },
    };
  },
});

export default noAlgorithmConfusion;
