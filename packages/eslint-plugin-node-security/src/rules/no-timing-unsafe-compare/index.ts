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
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES,
  compileUserPatterns,
} from '@interlace/eslint-devkit';
import { constLiteralOf, makeReadsTaintSource } from '../../utils/provenance';

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

  /**
   * Identifier roots treated as attacker-controlled input.
   * Default: `['req', 'request', 'ctx', 'event']`.
   *
   * `process` is deliberately absent: in
   * `req.headers['x-sig'] === process.env.SIGNING_KEY` the env read is the
   * secret being protected, not the attacker's lever.
   */
  untrustedSources?: string[];

  /**
   * Report comparisons where no attacker-controlled operand could be found.
   * Default: `false`.
   *
   * `true` restores the pre-inversion behaviour — report on a secret-looking
   * NAME alone. Measured on an 8-repo corpus that produced 27 findings, none of
   * which were timing oracles, so it is off.
   */
  reportUnverifiedComparisons?: boolean;
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

/**
 * Roots an attacker actually controls in a Node process.
 *
 * `process` is NOT here. A timing oracle needs the attacker on ONE side and the
 * secret on the other; `process.env.SIGNING_KEY` is the secret, and counting it
 * as untrusted would make both sides "untrusted" in the canonical webhook shape
 * and suppress the finding the rule exists for.
 */
const DEFAULT_UNTRUSTED_SOURCES = ['req', 'request', 'ctx', 'event'];

/**
 * Names that read as a namespace rather than a runtime value: `Enums`,
 * `ErrorCodes`, `AuthenticatorKey`, `IDX_STEP`, `AUTHENTICATOR_KEY`.
 *
 * PascalCase or SCREAMING_SNAKE_CASE. A camelCase object — `credentials`,
 * `secrets`, `config` — is an ordinary value that happens to be holding
 * something, and its properties prove nothing about constness.
 */
const NAMESPACE_NAME = /^(?:[A-Z][A-Z0-9_]*|[A-Z][a-zA-Z0-9]*)$/;

/**
 * Is this operand a member of a constant object — `AUTHENTICATOR_KEY.WEBAUTHN`,
 * `Enums.INVALID_TOKEN`, `ErrorCodes.INVALID_TOKEN_EXCEPTION`?
 *
 * BOTH halves must carry the convention: a namespace-cased object AND a
 * constant-cased property. Every one of the 73 corpus findings this guard
 * exists for satisfies both, and requiring both is what keeps it from
 * swallowing real secrets:
 *
 * - `userToken === credentials.API_TOKEN` — `credentials` is a camelCase
 *   runtime value, so `API_TOKEN` is a live secret, not an enum member.
 * - `userToken === secrets[API_TOKEN]` — computed, so `API_TOKEN` is a
 *   *variable holding* the key, and the property name is unknowable here.
 * - `userToken === process.env.API_TOKEN` and its `process['env']` spelling —
 *   the object is lowercase (or not an Identifier at all), so neither form is
 *   a namespace. This replaces an explicit `process.env` special case that
 *   only recognised dot notation and missed the bracket form.
 *
 * Deliberately MEMBER EXPRESSIONS ONLY. A bare SCREAMING_SNAKE identifier is
 * ambiguous in exactly the wrong direction: `API_KEY === expected` is a module
 * constant holding a real secret, and the existing fixture for it went green
 * the moment bare identifiers were accepted here.
 */
function isNamedConstant(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.MemberExpression) return false;
  // An identifier key under `[]` is a variable, not a property name.
  if (node.computed) return false;
  if (node.object.type !== AST_NODE_TYPES.Identifier) return false;
  if (node.property.type !== AST_NODE_TYPES.Identifier) return false;
  return NAMESPACE_NAME.test(node.object.name) && NAMED_CONSTANT.test(node.property.name);
}

/**
 * The root identifier of a member chain — `a` in `a.b.c`, `a` in `a.b().c`.
 * Returns null for anything not rooted in a plain identifier (`this.x`,
 * `foo().bar`).
 */
function memberRoot(node: TSESTree.Node): TSESTree.Identifier | null {
  let current: TSESTree.Node = node;
  // Unwrap calls as well as property reads: the shape this exists for,
  // `token !== token.trim()`, is a CallExpression at the top, and stopping at
  // MemberExpression would never reach the receiver.
  for (;;) {
    if (current.type === AST_NODE_TYPES.MemberExpression) {
      current = current.object;
      continue;
    }
    if (current.type === AST_NODE_TYPES.CallExpression) {
      current = current.callee;
      continue;
    }
    break;
  }
  return current.type === AST_NODE_TYPES.Identifier ? current : null;
}

/**
 * Are both operands readings of the SAME value?
 *
 * `auth0/express-openid-connect` `lib/context.js:155`:
 *
 * ```js
 * if (token !== token.trim()) throw createError(400, '…whitespace');
 * ```
 *
 * There is only one value here, so there is no second value for a timing
 * oracle to reveal. The comparison is a formatting assertion, and its duration
 * tells an attacker only about the token they already sent.
 *
 * Requires one side to be a bare identifier and the other to be a chain rooted
 * at that same identifier, so two genuinely different values that merely share
 * a receiver (`a.expected !== a.actual`) are untouched.
 */
function isSelfComparison(left: TSESTree.Node, right: TSESTree.Node): boolean {
  const pair = (bare: TSESTree.Node, derived: TSESTree.Node): boolean => {
    if (bare.type !== AST_NODE_TYPES.Identifier) return false;
    if (derived.type === AST_NODE_TYPES.Identifier) return false;
    return memberRoot(derived)?.name === bare.name;
  };
  return pair(left, right) || pair(right, left);
}

/**
 * Names whose match against a secret pattern is a collision, not a secret.
 *
 * `window.location.hash` is the URL fragment. It matched `hash` — the digest
 * pattern — at `okta/okta-signin-widget` `src/v1/LoginRouter.ts:165`, where the
 * code compares the fragment to a container id. Nothing about a URL fragment is
 * secret; the browser puts it in the address bar.
 */
const NON_SECRET_MEMBERS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['hash', new Set(['location'])],
]);

/** Is this member expression a known false-friend of a secret name? */
function isNonSecretMember(node: TSESTree.MemberExpression): boolean {
  if (node.computed || node.property.type !== AST_NODE_TYPES.Identifier) return false;
  const receivers = NON_SECRET_MEMBERS.get(node.property.name.toLowerCase());
  if (!receivers) return false;
  const owner = node.object;
  const ownerName =
    owner.type === AST_NODE_TYPES.Identifier
      ? owner.name
      : owner.type === AST_NODE_TYPES.MemberExpression &&
          !owner.computed &&
          owner.property.type === AST_NODE_TYPES.Identifier
        ? owner.property.name
        : '';
  return receivers.has(ownerName.toLowerCase());
}

export const noTimingUnsafeCompare = createRule<RuleOptions, MessageIds>({
  name: 'no-timing-unsafe-compare',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-timing-unsafe-compare.md',
      description: 'Disallow timing-unsafe comparison of secrets',
      cwe: 'CWE-208',
      cvss: 5.9,
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
          untrustedSources: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_UNTRUSTED_SOURCES,
            description:
              'Identifier roots treated as attacker-controlled (default: req, request, ctx, event)',
          },
          reportUnverifiedComparisons: {
            type: 'boolean',
            default: false,
            description:
              'Report on a secret-looking name alone, without an attacker-controlled operand. Restores the pre-inversion behaviour.',
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
    const {
      secretPatterns = DEFAULT_SECRET_PATTERNS,
      untrustedSources = DEFAULT_UNTRUSTED_SOURCES,
      reportUnverifiedComparisons = false,
    } = options as Options;
    const sourceCode = context.sourceCode;
    const readsUntrusted = makeReadsTaintSource(
      sourceCode,
      new Set(untrustedSources.map((source) => source.toLowerCase())),
    );
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
    // Guarded: a user pattern reaches `new RegExp` here. Measured before this
    // change: `(a+)+$` took 45-58s on a single file, and `[` threw
    // "Invalid regular expression" out of create(), killing the whole lint
    // run rather than just this rule. compileUserPattern degrades both to a
    // substring match.
    const patterns = compileUserPatterns(secretPatterns as string[], 'i');

    function nameLooksSecret(name: string): boolean {
      if (BOOLEAN_PREDICATE_NAME.test(name)) return false;
      return patterns.some(p => p.test(name));
    }

    function isSecretIdentifier(node: TSESTree.Node): boolean {
      if (node.type === AST_NODE_TYPES.Identifier) {
        return nameLooksSecret(node.name);
      }
      if (node.type === AST_NODE_TYPES.MemberExpression) {
        if (isNonSecretMember(node)) return false;
        const prop = node.property;
        if (prop.type === AST_NODE_TYPES.Identifier) {
          return nameLooksSecret(prop.name);
        }
      }
      return false;
    }

    /**
     * Is this operand a constant the source file already contains?
     *
     * Extends {@link isSourceConstant} by one hop through a `const` binding, so
     * a string written once and referred to by name is judged as the string it
     * is. `auth0/express-openid-connect` `lib/context.js:97` declares
     *
     * ```js
     * const SESSION_TRANSFER_TOKEN_IDENTIFIER = 'urn:ietf:params:oauth:token-type:session_transfer';
     * ```
     *
     * and two comparisons against it were reported purely because the constant's
     * NAME contains `token`. Resolving the binding — rather than trusting the
     * SCREAMING_SNAKE convention — is what keeps
     * `const API_KEY = process.env.API_KEY; API_KEY === supplied` reporting: an
     * env read is not a literal, so it does not qualify.
     */
    function isResolvedConstant(node: TSESTree.Node): boolean {
      if (isSourceConstant(node)) return true;
      if (node.type !== AST_NODE_TYPES.Identifier) return false;
      return constLiteralOf(sourceCode, node) !== undefined;
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

      if (isResolvedConstant(node.left) || isResolvedConstant(node.right)) {
        return;
      }

      // …and neither can a constant reached through its name.
      if (isNamedConstant(node.left) || isNamedConstant(node.right)) {
        return;
      }

      // One value compared against a reading of itself is an assertion about
      // its format, not a check against a second value.
      if (isSelfComparison(node.left, node.right)) {
        return;
      }

      // Check if either side looks like a secret
      const leftIsSecret = isSecretIdentifier(node.left);
      const rightIsSecret = isSecretIdentifier(node.right);

      if (leftIsSecret || rightIsSecret) {
        // A timing oracle needs an attacker on ONE side and a secret on the
        // other. Both conditions matter, and the rule used to check only the
        // second — which is why it reported `remoteApp.apiKey === localApp.
        // configuration.client_id` (Shopify/cli `app-context.ts:148`), two
        // config values a CLI compares on the developer's own machine, where
        // nobody is timing anything.
        //
        // `exactly one` is the test, not `at least one`. In
        // `okta/okta-auth-js` `routes/authenticator.js:187` both
        // `password` and `confirmPassword` are destructured from `req.body`:
        // the user is comparing their own input to their own input, and there
        // is no secret in the process for the timing to reveal.
        if (!reportUnverifiedComparisons) {
          const leftUntrusted = readsUntrusted(node.left);
          const rightUntrusted = readsUntrusted(node.right);
          if (leftUntrusted === rightUntrusted) return;
        }

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
