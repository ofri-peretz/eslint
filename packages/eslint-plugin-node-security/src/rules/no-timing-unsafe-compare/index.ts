/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-timing-unsafe-compare
 * Detects === comparison of secrets, suggest crypto.timingSafeEqual()
 * CWE-208: Observable Timing Discrepancy
 *
 * @see https://cwe.mitre.org/data/definitions/208.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'timingUnsafeCompare'
  | 'useTimingSafeEqual';

export interface Options {
  /** Variable name patterns that indicate secrets. Default: ['token', 'secret', 'key', 'password', 'hash', 'signature', 'mac', 'hmac', 'digest', 'apiKey', 'api_key'] */
  secretPatterns?: string[];
}

type RuleOptions = [Options?];

const DEFAULT_SECRET_PATTERNS = [
  // Common secret names (camelCase, snake_case, kebab-case)
  // `key` is deliberately absent. Substring-matched, it hits `key`, `firstKey`,
  // `keys` and every AST walker's `key === 'text'` — 88 findings on this repo,
  // none of them secrets. The names that DO mean a secret are listed in full
  // below (`apiKey`, `privateKey`, `encryptionKey`, …), and a project that
  // really does compare a bare `key` can add it via `secretPatterns`.
  'token', 'secret', 'password', 'hash', 'signature',
  'mac', 'hmac', 'digest', 'apiKey', 'api_key', 'api-key',
  'auth', 'credential', 'bearer', 'jwt', 'csrf', 'nonce',
  // PII and sensitive data patterns
  'ssn', 'social_security', 'social-security',
  'pii', 'private_key', 'private-key', 'privateKey',
  'access_token', 'access-token', 'accessToken',
  'refresh_token', 'refresh-token', 'refreshToken',
  'session_id', 'session-id', 'sessionId',
  'auth_token', 'auth-token', 'authToken',
  'encryption_key', 'encryption-key', 'encryptionKey',
];

/**
 * Is this operand a sentinel rather than a value an attacker could supply?
 *
 * `token !== undefined`, `hash === null`, `signature.length === 0` — all
 * existence or arity checks. A timing attack needs the comparison to leak how
 * much of a *secret* matched, which requires an attacker-controlled operand.
 */
function isExistenceCheck(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.Identifier && node.name === 'undefined') return true;
  if (node.type === AST_NODE_TYPES.Literal) {
    return node.value === null || typeof node.value === 'number' || typeof node.value === 'boolean';
  }
  return false;
}

export const noTimingUnsafeCompare = createRule<RuleOptions, MessageIds>({
  name: 'no-timing-unsafe-compare',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-timing-unsafe-compare.md',
      description: 'Disallow timing-unsafe comparison of secrets',
      cwe: 'CWE-208',
      cvss: 7.5,
    },
    hasSuggestions: true,
    messages: {
      timingUnsafeCompare: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Timing-unsafe comparison',
        cwe: 'CWE-208',
        description: 'Using === to compare secrets enables timing attacks. The comparison short-circuits on first mismatch, leaking information about the secret.',
        severity: 'HIGH',
        fix: 'Use crypto.timingSafeEqual() for constant-time comparison',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b',
      }),
      useTimingSafeEqual: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use timingSafeEqual',
        description: 'Use constant-time comparison to prevent timing attacks',
        severity: 'LOW',
        fix: 'crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          secretPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_SECRET_PATTERNS,
            description: 'Variable name patterns that indicate secrets',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      secretPatterns: DEFAULT_SECRET_PATTERNS,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const { secretPatterns = DEFAULT_SECRET_PATTERNS } = options as Options;
    // Substring-matched on purpose: `auth` has to match `authorization`, and
    // `token` has to match `accessTokenValue`. Anchoring to word boundaries was
    // tried and dropped — it fixed `firstKey` but stopped matching
    // `req.headers.authorization`, trading one false positive for a worse false
    // negative. The existence-check guard below is what kills the `firstKey`
    // case, precisely and without weakening detection.
    const patterns = secretPatterns.map((p) => new RegExp(p, 'i'));

    function isSecretIdentifier(node: TSESTree.Node): boolean {
      if (node.type === AST_NODE_TYPES.Identifier) {
        return patterns.some(p => p.test(node.name));
      }
      if (node.type === AST_NODE_TYPES.MemberExpression) {
        const prop = node.property;
        if (prop.type === AST_NODE_TYPES.Identifier) {
          return patterns.some(p => p.test(prop.name));
        }
      }
      return false;
    }

    function checkBinaryExpression(node: TSESTree.BinaryExpression) {
      // Check for === or == comparisons
      if (node.operator !== '===' && node.operator !== '==' && 
          node.operator !== '!==' && node.operator !== '!=') {
        return;
      }

      // Comparing a secret to `undefined` / `null` / a number / a boolean is an
      // existence or arity check, not a secret comparison — there is no
      // attacker-supplied value on the other side, so there is nothing to time.

      if (isExistenceCheck(node.left) || isExistenceCheck(node.right)) {
        return;
      }

      // Check if either side looks like a secret
      const leftIsSecret = isSecretIdentifier(node.left);
      const rightIsSecret = isSecretIdentifier(node.right);

      if (leftIsSecret || rightIsSecret) {
        context.report({
          node,
          messageId: 'timingUnsafeCompare',
          suggest: [
            {
              messageId: 'useTimingSafeEqual',
              fix: () => null, // Complex refactoring
            },
          ],
        });
      }
    }

    return {
      BinaryExpression: checkBinaryExpression,
    };
  },
});

export type { Options as NoTimingUnsafeCompareOptions };
