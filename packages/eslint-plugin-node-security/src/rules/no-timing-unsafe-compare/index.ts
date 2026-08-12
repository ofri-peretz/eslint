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
  /**
   * Variable name patterns that indicate secrets. Default: ['token', 'secret',
   * 'password', 'hash', 'signature', 'mac', 'hmac', 'digest', 'apiKey',
   * 'api_key', …] — see DEFAULT_SECRET_PATTERNS for the full list.
   *
   * Note `key` is NOT a default; see the note on DEFAULT_SECRET_PATTERNS.
   */
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
 * Is this operand a constant that is already sitting in the source file?
 *
 * `token !== undefined`, `hash === null`, `signature.length === 0`,
 * `revokedToken === 'access'` — none of these can leak a secret, because there
 * is no secret on the other side of the comparison to leak. A timing attack
 * needs the comparison to leak how much of a *secret* matched byte by byte,
 * which requires the value being compared against to be one the attacker is
 * trying to discover.
 *
 * String literals WERE deliberately allowed through here, on the argument that
 * `password === 'default_password'` is a real finding. Measured against the
 * 8-repo corpus, that trade did not hold: string-literal comparisons were the
 * single largest false-positive source for this rule, and the archetype is
 * `okta/okta-auth-js` `lib/oidc/dpop.ts:185`:
 *
 * ```ts
 * function clearDPoPKeyPairAfterRevoke (revokedToken: 'access' | 'refresh', …) {
 *   if (revokedToken === 'access' && …)
 * ```
 *
 * `'access'` is a union-member tag, and `revokedToken` matched only because the
 * name contains `token`. The `password === 'default_password'` case that
 * motivated the old behaviour is a hardcoded credential — CWE-798, which
 * `secure-coding/no-hardcoded-credentials` reports. It is not CWE-208: a
 * constant-time comparison against a credential printed in the source protects
 * nothing. Reporting it here duplicated the other rule and cost far more in
 * noise than it bought.
 */
function isSourceConstant(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.Identifier && node.name === 'undefined') return true;
  if (node.type === AST_NODE_TYPES.Literal) return true;
  // A template literal with no interpolation is a string constant written out
  // longhand — `token === \`access\`` is the same finding as the quoted form.
  if (node.type === AST_NODE_TYPES.TemplateLiteral) return node.expressions.length === 0;
  return false;
}

/**
 * Names that JavaScript convention reserves for booleans.
 *
 * `prevState.isAuthenticated === state.isAuthenticated` (`okta/okta-auth-js`
 * `lib/core/AuthStateManager.ts:44`) matched because `isAuthenticated` contains
 * `auth`. Comparing two booleans leaks one bit that the caller already has;
 * there is no secret to time. The `is`/`has`/`should`/… + capital form is the
 * one naming convention universal enough to read as a type annotation, so it is
 * the only one trusted here — no attempt is made to guess at other names.
 */
const BOOLEAN_PREDICATE_NAME = /^(?:is|has|should|can|did|was|will|does)[A-Z]/;

/**
 * SCREAMING_SNAKE_CASE — JavaScript's convention for a named constant.
 *
 * After the constant-operand and boolean-predicate guards landed, 73 of the 88
 * findings still standing on the corpus were comparisons against an enum
 * member: `name === IDX_STEP.SELECT_AUTHENTICATOR_AUTHENTICATE`,
 * `authenticatorKey === AUTHENTICATOR_KEY.WEBAUTHN`,
 * `err.name === Enums.AUTH_STOP_POLL_INITIATION_ERROR`. Every one matched only
 * because a constant's NAME contained `auth`, `password` or `token`.
 *
 * A named constant is a source constant reached through an identifier, so it
 * falls to the same argument as a string literal: the value is in the program,
 * not in the attacker's head.
 */
const NAMED_CONSTANT = /^[A-Z][A-Z0-9_]*$/;

/** `process.env.API_KEY` is SCREAMING_SNAKE but is emphatically NOT a constant. */
function isProcessEnv(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.MemberExpression &&
    node.object.type === AST_NODE_TYPES.Identifier &&
    node.object.name === 'process' &&
    node.property.type === AST_NODE_TYPES.Identifier &&
    node.property.name === 'env'
  );
}

/**
 * Is this operand a member of a constant object — `AUTHENTICATOR_KEY.WEBAUTHN`,
 * `Enums.INVALID_TOKEN`, `ErrorCodes.INVALID_TOKEN_EXCEPTION`?
 *
 * Either half carries the convention: `AUTHENTICATOR_KEY.WEBAUTHN` announces
 * itself through the object, `Enums.AUTH_STOP_POLL` through the property.
 *
 * Deliberately MEMBER EXPRESSIONS ONLY. A bare SCREAMING_SNAKE identifier is
 * ambiguous in exactly the wrong direction: `API_KEY === expected` is a module
 * constant holding a real secret, and the existing fixture for it went green
 * the moment bare identifiers were accepted here. Every corpus finding but one
 * was namespaced, so the namespace is the evidence — not the casing alone.
 */
function isNamedConstant(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.MemberExpression) return false;
  // The one member expression whose SCREAMING_SNAKE property is a live secret
  // rather than a constant. Suppressing `userToken === process.env.API_TOKEN`
  // would drop the archetypal true positive this rule exists for.
  if (isProcessEnv(node.object)) return false;
  const viaProperty =
    node.property.type === AST_NODE_TYPES.Identifier && NAMED_CONSTANT.test(node.property.name);
  const viaObject =
    node.object.type === AST_NODE_TYPES.Identifier && NAMED_CONSTANT.test(node.object.name);
  return viaProperty || viaObject;
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
    // negative.
    //
    // Under the DEFAULT patterns `firstKey` never reaches the guard at all,
    // because `key` is not among them. The existence-check guard below is what
    // handles the same shape when a project adds `key` back through
    // `secretPatterns` — two separate mechanisms, not one.
    const patterns = secretPatterns.map((p) => new RegExp(p, 'i'));

    function nameLooksSecret(name: string): boolean {
      if (BOOLEAN_PREDICATE_NAME.test(name)) return false;
      return patterns.some(p => p.test(name));
    }

    function isSecretIdentifier(node: TSESTree.Node): boolean {
      if (node.type === AST_NODE_TYPES.Identifier) {
        return nameLooksSecret(node.name);
      }
      if (node.type === AST_NODE_TYPES.MemberExpression) {
        const prop = node.property;
        if (prop.type === AST_NODE_TYPES.Identifier) {
          return nameLooksSecret(prop.name);
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

      // Comparing against a constant that is already in the source — a string,
      // a number, `null`, `undefined` — cannot leak a secret, because the value
      // being compared against is not one an attacker is trying to discover.

      if (isSourceConstant(node.left) || isSourceConstant(node.right)) {
        return;
      }

      // …and neither can a constant reached through its name.
      if (isNamedConstant(node.left) || isNamedConstant(node.right)) {
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
