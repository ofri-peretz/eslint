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
  compileUserPatterns, unwrapTypeSyntax,
} from '@interlace/eslint-devkit';
import {
  bindingInit,
  constLiteralOf,
  findVariable,
  makeReadsTaintSource,
} from '../../utils/provenance';
import { identifierWords } from '../../utils/names';

type MessageIds =
  | 'timingUnsafeCompare';

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

  /**
   * Whole words whose presence in an identifier means a `secretPatterns` match
   * was a collision, not a secret. Default: `['author', 'authors', 'authored',
   * 'authoring', 'authorship', 'hashtag', 'hashtags']`.
   *
   * Split on identifier word boundaries, so `postAuthorId` is excluded and
   * `authorization` is not. REPLACES the default list — `[]` removes the guard
   * and lets `authorId` match `auth` again.
   */
  nonSecretWords?: string[];

  /**
   * Trailing words that make the value a measurement or a location rather than
   * a credential. Default: `['count', 'counts', 'limit', 'limits', 'usage',
   * 'total', 'size', 'length', 'price', 'cost', 'quota', 'address',
   * 'addresses', 'index', 'rank', 'percent']`.
   *
   * Only the LAST word of the identifier is tested, so `tokenCount` is excluded
   * and `countToken` is not. REPLACES the default list.
   */
  nonSecretTails?: string[];
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

/**
 * Whole WORDS whose presence means a secret pattern matched by collision.
 *
 * `authorId` matched `auth` — the substring trap the pattern list's own
 * comment warns about but cannot avoid, because `auth` genuinely has to match
 * `authorization`. The asymmetry that makes this fixable is that `author` is a
 * word and `authorization` is a different word: splitting the identifier
 * separates them, where a substring test cannot.
 *
 * An earlier version of this guard enumerated whole identifier SPELLINGS
 * (`authorid`, `macaddress`, …). The corpus broke it immediately with
 * `postAuthorId` and `promptTokenLimit`: an exact-spelling set only ever
 * matches the spellings it was handed. Words and tails generalise.
 *
 * WHY THIS IS AN OPTION AND NOT A CONSTANT
 *
 * `secretPatterns` — the vocabulary that says "this IS a secret" — has always
 * been the user's to set. This list, which says "…except when", was not, and
 * the asymmetry has a cost: a project that adds `key` back through
 * `secretPatterns` cannot then exclude the `keyring`/`keyboard` sense, and a
 * project whose domain is publishing genuinely has secrets with `author` in
 * the name. Both halves of an English-word vocabulary have to be tunable or
 * neither is.
 */
const DEFAULT_NON_SECRET_WORDS: readonly string[] = [
  'author', 'authors', 'authored', 'authoring', 'authorship',
  'hashtag', 'hashtags',
];

/**
 * Trailing words that make the value a MEASUREMENT or a LOCATION.
 *
 * `tokenCount` is a quantity of LLM tokens; `promptTokenLimit` is a number on
 * the pricing page; `macAddress` is printed on the underside of the device.
 * None of them is a credential, and no credential in DEFAULT_SECRET_PATTERNS
 * is named after one of these either — `sessionId`, `authToken` and
 * `passwordHash` all end in something else.
 */
const DEFAULT_NON_SECRET_TAILS: readonly string[] = [
  'count', 'counts', 'limit', 'limits', 'usage', 'total', 'size', 'length',
  'price', 'cost', 'quota', 'address', 'addresses', 'index', 'rank', 'percent',
];

/**
 * Node crypto derivations. A value that came out of one of these is a secret
 * whatever it is spelled, which is the only evidence available when the
 * programmer named it `expected`.
 *
 * Closed API surface, exact names.
 *
 * DELIBERATELY NOT CONFIGURABLE — as are `RECEIVER_COMPARE_METHODS`,
 * `BINARY_EQUALITY_FUNCTIONS` and `SERVER_STATE_REQUEST_PROPERTIES` below. The
 * ledger's `unconfigurable-vocabulary` check flags all four; all four are false
 * alarms, and the distinction from `nonSecretWords` / `nonSecretTails` — which
 * WERE made configurable — is exactly the one the check description draws.
 *
 * These four name APIs, not concepts:
 *
 * - `CRYPTO_DERIVATIONS` — `node:crypto`'s digest/sign/derive functions.
 * - `RECEIVER_COMPARE_METHODS` — `Buffer`/`String` comparison methods that
 *   short-circuit on the first differing byte.
 * - `BINARY_EQUALITY_FUNCTIONS` — the deep-equality helpers (lodash,
 *   `fast-deep-equal`, `node:assert`) that do the same thing under a name.
 * - `SERVER_STATE_REQUEST_PROPERTIES` — the documented Express / Koa
 *   properties that hold SERVER state rather than the caller's input.
 *
 * Each of them makes the rule see MORE, not less: three prove a value is a
 * secret or a comparison is a memcmp, and the fourth is what stops
 * `req.body._csrf !== req.session.csrfToken` — the canonical double-submit
 * check, and a real timing oracle — from being dismissed because both operands
 * hang off `req`. Handing a consumer the power to shorten any of them is
 * handing them the power to silence the rule on the shapes it exists to find,
 * which is why the option surface stops at the two vocabularies that decide a
 * report from a SPELLING.
 */
const CRYPTO_DERIVATIONS: ReadonlySet<string> = new Set([
  'createHmac', 'createHash', 'createSign', 'pbkdf2Sync', 'scryptSync',
  'hkdfSync', 'digest', 'sign', 'hmac',
]);

/**
 * Comparison APIs that are memcmp wearing a method name.
 *
 * `buf.equals(other)` and `Buffer.compare(a, b)` return at the first differing
 * byte — Node's own crypto documentation says so, and is why timingSafeEqual
 * exists. `startsWith` is worse than equality rather than better: it leaks the
 * same per-byte timing AND accepts anything with the right head.
 */
const RECEIVER_COMPARE_METHODS: ReadonlySet<string> = new Set([
  'equals', 'startsWith', 'endsWith', 'localeCompare',
]);

/** Deep-equality helpers, called with the two values as arguments. */
const BINARY_EQUALITY_FUNCTIONS: ReadonlySet<string> = new Set([
  'isEqual', 'isEqualWith', 'deepEqual', 'fastDeepEqual', 'shallowEqual',
]);

/**
 * Request properties that hold SERVER state rather than the current request.
 *
 * `req.session` is what express-session rehydrated from its store;
 * `req.user` is what passport put there after verifying a credential;
 * `res.locals` and `req.app.locals` are the application's own.
 *
 * Everything else under `req` is the caller's. The distinction matters because
 * the canonical double-submit CSRF check puts both operands under `req`:
 *
 * ```js
 * if (req.body._csrf !== req.session.csrfToken) …
 * ```
 *
 * A model that classifies by the ROOT identifier sees one `req` on each side
 * and concludes there is no attacker, which is backwards — that comparison is
 * exactly the timing oracle this rule exists to find. Documented Express /
 * Koa surface, exact names.
 */
const SERVER_STATE_REQUEST_PROPERTIES: ReadonlySet<string> = new Set([
  'session', 'user', 'locals', 'app', 'state',
]);

/**
 * `a?.b` parses to a MemberExpression wrapped in a ChainExpression. Without
 * this unwrap every operand written with optional chaining — ordinary modern
 * Node — was neither a secret nor a constant nor a self-comparison, and the
 * rule fell silent on it.
 */
function unwrapChain(node: TSESTree.Node): TSESTree.Node {
  return node.type === AST_NODE_TYPES.ChainExpression
    ? (node.expression as TSESTree.Node)
    : node;
}

/**
 * The property name a member expression reads, for both spellings.
 *
 * `creds['apiKey']` is the same property as `creds.apiKey` — the name is a
 * string literal sitting in the source. Reading only the Identifier form made
 * bracket access an evasion.
 */
function memberPropertyName(node: TSESTree.MemberExpression): string | null {
  const property = node.property;
  if (!node.computed) {
    return property.type === AST_NODE_TYPES.Identifier ? property.name : null;
  }
  return property.type === AST_NODE_TYPES.Literal && typeof property.value === 'string'
    ? property.value
    : null;
}

/** Is this member expression a known false-friend of a secret name? */
function isNonSecretMember(node: TSESTree.MemberExpression): boolean {
  const propertyName = memberPropertyName(node);
  if (propertyName === null) return false;
  const receivers = NON_SECRET_MEMBERS.get(propertyName.toLowerCase());
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
          nonSecretWords: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_NON_SECRET_WORDS],
            description:
              'Whole words that mean a secretPatterns match was a collision (default: author, authors, authored, authoring, authorship, hashtag, hashtags). Replaces the list.',
          },
          nonSecretTails: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_NON_SECRET_TAILS],
            description:
              'Trailing words that make the value a measurement or location rather than a credential (default: count, limit, usage, total, size, length, price, cost, quota, address, index, rank, percent). Replaces the list.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      secretPatterns: DEFAULT_SECRET_PATTERNS,
      nonSecretWords: [...DEFAULT_NON_SECRET_WORDS],
      nonSecretTails: [...DEFAULT_NON_SECRET_TAILS],
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
      nonSecretWords = [...DEFAULT_NON_SECRET_WORDS],
      nonSecretTails = [...DEFAULT_NON_SECRET_TAILS],
    } = options as Options;
    // Lower-cased once. `identifierWords` already lower-cases what it returns,
    // so a user who writes `['Author']` must still match `postAuthorId` — the
    // built-ins are lower-case and the option has to behave identically.
    const nonSecretWordSet: ReadonlySet<string> = new Set(
      nonSecretWords.map((word) => word.toLowerCase()),
    );
    const nonSecretTailSet: ReadonlySet<string> = new Set(
      nonSecretTails.map((word) => word.toLowerCase()),
    );
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
      const words = identifierWords(name);
      if (words.some((word) => nonSecretWordSet.has(word))) return false;
      if (words.length > 0 && nonSecretTailSet.has(words[words.length - 1] as string)) {
        return false;
      }
      return patterns.some(p => p.test(name));
    }

    /**
     * Is this value the output of a Node crypto derivation?
     *
     * `createHmac(secret, …).update(body).digest('hex')` is a secret whatever
     * the programmer called it. Resolving the shape rather than reading the
     * name is what recovers the finding in
     *
     * ```js
     * const v = req.headers['x-sig'];
     * const expected = createHmac('sha256', SECRET).update(raw).digest('hex');
     * if (v === expected) { … }
     * ```
     *
     * where a name-only rule sees two ordinary locals and stays quiet.
     */
    function isCryptoDerivation(node: TSESTree.Node): boolean {
      const bare = unwrapTypeSyntax(node);
      if (bare !== node) return isCryptoDerivation(bare);
      if (node.type !== AST_NODE_TYPES.CallExpression) return false;
      const callee = node.callee;
      if (callee.type === AST_NODE_TYPES.Identifier) {
        return CRYPTO_DERIVATIONS.has(callee.name);
      }
      if (callee.type !== AST_NODE_TYPES.MemberExpression || callee.computed) return false;
      if (callee.property.type !== AST_NODE_TYPES.Identifier) return false;
      if (CRYPTO_DERIVATIONS.has(callee.property.name)) return true;
      // `pbkdf2Sync(…).toString('hex')` — the derivation is the receiver.
      return isCryptoDerivation(callee.object);
    }

    /** The same question, allowing one hop through a binding. */
    function isCryptoSecret(node: TSESTree.Node): boolean {
      if (isCryptoDerivation(node)) return true;
      const bare = unwrapTypeSyntax(node);
      if (bare.type !== AST_NODE_TYPES.Identifier) return false;
      const init = bindingInit(sourceCode, bare);
      return init !== undefined && containsCryptoDerivation(init);
    }

    /**
     * A derivation reached through the string plumbing an HMAC check puts
     * around it — `` `sha256=${…digest('hex')}` ``, `'sha256=' + digest`.
     */
    function containsCryptoDerivation(node: TSESTree.Node): boolean {
      if (isCryptoDerivation(node)) return true;
      if (node.type === AST_NODE_TYPES.TemplateLiteral) {
        return node.expressions.some((expression) => containsCryptoDerivation(expression));
      }
      if (node.type === AST_NODE_TYPES.BinaryExpression) {
        return (
          containsCryptoDerivation(node.left as TSESTree.Node) ||
          containsCryptoDerivation(node.right)
        );
      }
      return false;
    }

    /**
     * Did this value come from the SERVER, whatever the request steered?
     *
     * The taint reader answers "is there visible flow from the request", and
     * that answer is `true` for both operands of the canonical webhook check —
     * because the expected signature is an HMAC **of the request body**. The
     * `exactly one side untrusted` gate then suppressed the single finding
     * this rule exists for. Measured on this corpus: 13.3% recall, with
     * `no-timing-unsafe-compare` silent on its own headline shape.
     *
     * The missing distinction is not "does the request reach it" but "did the
     * value cross a boundary the attacker is not on the other side of":
     *
     * - an `await` — the value came back from a store, and the request only
     *   chose which row
     * - a crypto derivation — the request went IN, but so did a server secret,
     *   and what came out is the thing being protected
     * - `process.env` — configuration, loaded at boot
     */
    function isServerDerived(node: TSESTree.Node, depth = 0): boolean {
      if (depth > 4) return false;
      const bare = unwrapTypeSyntax(node);
      if (bare !== node) return isServerDerived(bare, depth + 1);

      if (node.type === AST_NODE_TYPES.AwaitExpression) return true;
      if (containsCryptoDerivation(node)) return true;
      if (node.type === AST_NODE_TYPES.MemberExpression) {
        // No `process.env` arm here on purpose: this function is only ever
        // consulted when BOTH operands read the request, and a `process.env`
        // read is never one of those — `process` is deliberately absent from
        // DEFAULT_UNTRUSTED_SOURCES. An arm for it would be unreachable code
        // wearing the appearance of a safeguard.
        const propertyName = memberPropertyName(node);
        if (propertyName !== null && SERVER_STATE_REQUEST_PROPERTIES.has(propertyName)) {
          return true;
        }
        return isServerDerived(node.object, depth + 1);
      }
      if (node.type === AST_NODE_TYPES.Identifier) {
        const init = bindingInit(sourceCode, node);
        return init !== undefined && isServerDerived(init, depth + 1);
      }
      if (node.type === AST_NODE_TYPES.CallExpression) {
        const callee = unwrapChain(node.callee);
        if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
        // `cache.getSync(req.params.id)` — the request chose WHICH row; the
        // value came out of `cache`. Not every store read is awaited, and
        // requiring an `await` made an in-process LRU an evasion. The receiver
        // is the evidence: if the attacker cannot steer the OBJECT the method
        // was called on, the result is the server's.
        return !readsUntrusted(callee.object) || isServerDerived(callee.object, depth + 1);
      }
      return false;
    }

    function isSecretIdentifier(node: TSESTree.Node): boolean {
      if (node.type === AST_NODE_TYPES.Identifier) {
        return nameLooksSecret(node.name);
      }
      if (node.type === AST_NODE_TYPES.MemberExpression) {
        if (isNonSecretMember(node)) return false;
        const propertyName = memberPropertyName(node);
        if (propertyName !== null) {
          return nameLooksSecret(propertyName);
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

    /** The function a callee identifier resolves to, if it is a local one. */
    function resolveLocalFunction(
      callee: TSESTree.Identifier,
    ): TSESTree.FunctionLike | null {
      const variable = findVariable(sourceCode, callee);
      if (!variable || variable.defs.length !== 1) return null;
      const def = variable.defs[0];
      if (def.type === 'FunctionName') return def.node as TSESTree.FunctionLike;
      if (def.type !== 'Variable') return null;
      const init = def.node.init;
      if (!init) return null;
      const bare = unwrapTypeSyntax(init);
      if (
        bare.type === AST_NODE_TYPES.ArrowFunctionExpression ||
        bare.type === AST_NODE_TYPES.FunctionExpression
      ) {
        return bare as TSESTree.FunctionLike;
      }
      return null;
    }

    /** Is either side of this comparison a `.length` read? */
    function comparesLengths(node: TSESTree.BinaryExpression): boolean {
      const isLength = (operand: TSESTree.Node): boolean =>
        operand.type === AST_NODE_TYPES.MemberExpression &&
        memberPropertyName(operand) === 'length';
      return isLength(node.left as TSESTree.Node) || isLength(node.right);
    }

    /**
     * Is this a local function that decides equality with `===`?
     *
     * Two shapes, one predicate:
     *
     * ```js
     * const timingSafeEqual = (a, b) => a === b;        // the trusted NAME,
     *                                                   // the untrusted body
     * function constantTimeEquals(a, b) {               // the FAKE mitigation
     *   if (a.length !== b.length) return false;
     *   for (let i = 0; i < a.length; i++) {
     *     if (a.charCodeAt(i) !== b.charCodeAt(i)) return false;   // ← here
     *   }
     *   return true;
     * }
     * ```
     *
     * Both are found by the same question: does an equality operator anywhere
     * in the body compare values rooted at the function's two parameters? A
     * REAL constant-time implementation cannot answer yes — it accumulates
     * `diff |= a[i] ^ b[i]` and compares the accumulator to zero, never the
     * two inputs to each other. The `.length` guard is excluded because a
     * correct implementation needs it and the length of a digest is public.
     *
     * A fake mitigation is worse than no mitigation: the name and the comment
     * stop the next reader from looking.
     */
    function equalityWrapperParams(
      callee: TSESTree.Identifier,
    ): [number, number] | null {
      const fn = resolveLocalFunction(callee);
      if (!fn || fn.params.length < 2) return null;
      // Which parameter is which is answered by the body, not by position: the
      // corpus's `safeCompare(a, b, label)` emits a metric from a third
      // argument and is otherwise the same leak. Requiring exactly two
      // parameters made the extra argument an evasion.
      // Exact membership, keyed by the function's OWN parameter spellings —
      // there is no vocabulary here and nothing is matched by substring. A
      // Map rather than an array scan so that stays legible.
      const paramIndex = new Map<string, number>();
      fn.params.forEach((param, index) => {
        if (param.type === AST_NODE_TYPES.Identifier) paramIndex.set(param.name, index);
      });

      let found: [number, number] | null = null;
      const visit = (node: TSESTree.Node | null | undefined): void => {
        if (found || !node || typeof node.type !== 'string') return;
        if (node.type === AST_NODE_TYPES.BinaryExpression) {
          const isEquality =
            node.operator === '===' || node.operator === '!==' ||
            node.operator === '==' || node.operator === '!=';
          if (isEquality && !comparesLengths(node)) {
            const leftIndex = paramIndex.get(memberRoot(node.left as TSESTree.Node)?.name ?? '');
            const rightIndex = paramIndex.get(memberRoot(node.right)?.name ?? '');
            if (
              leftIndex !== undefined &&
              rightIndex !== undefined &&
              leftIndex !== rightIndex
            ) {
              found = [leftIndex, rightIndex];
              return;
            }
          }
        }
        for (const [key, value] of Object.entries(
          node as unknown as Record<string, unknown>,
        )) {
          // `parent` points back up the tree. Following it turns this walk
          // into an infinite loop — measured as a "Maximum call stack size
          // exceeded" crash on the very first fixture with a nested function.
          if (key === 'parent') continue;
          if (Array.isArray(value)) {
            for (const entry of value) visit(entry as TSESTree.Node);
          } else if (value && typeof value === 'object' && 'type' in value) {
            visit(value as TSESTree.Node);
          }
        }
      };
      visit(fn.body as TSESTree.Node);
      return found;
    }

    /**
     * The two values a comparison API is comparing, or null when the call is
     * not one.
     *
     * `===` is not the only short-circuiting comparison a Node service reaches
     * for, and the alternatives are picked precisely BY the developer who knew
     * enough to convert the values to Buffers first.
     */
    function comparisonOperands(
      node: TSESTree.CallExpression,
    ): [TSESTree.Node, TSESTree.Node] | null {
      const args = node.arguments;
      if (args.some((argument) => argument.type === AST_NODE_TYPES.SpreadElement)) {
        return null;
      }
      const callee = node.callee;

      if (callee.type === AST_NODE_TYPES.Identifier) {
        if (BINARY_EQUALITY_FUNCTIONS.has(callee.name) && args.length === 2) {
          return [args[0] as TSESTree.Node, args[1] as TSESTree.Node];
        }
        const wrapped = equalityWrapperParams(callee);
        if (!wrapped) return null;
        const [leftIndex, rightIndex] = wrapped;
        const leftArg = args[leftIndex];
        const rightArg = args[rightIndex];
        if (!leftArg || !rightArg) return null;
        return [leftArg as TSESTree.Node, rightArg as TSESTree.Node];
      }

      if (callee.type !== AST_NODE_TYPES.MemberExpression || callee.computed) return null;
      if (callee.property.type !== AST_NODE_TYPES.Identifier) return null;
      const method = callee.property.name;

      // `Buffer.compare(a, b)` — the static form of `buf.equals`.
      if (
        method === 'compare' &&
        callee.object.type === AST_NODE_TYPES.Identifier &&
        callee.object.name === 'Buffer' &&
        args.length === 2
      ) {
        return [args[0] as TSESTree.Node, args[1] as TSESTree.Node];
      }

      // `_.isEqual(a, b)` — namespaced deep equality.
      if (BINARY_EQUALITY_FUNCTIONS.has(method) && args.length === 2) {
        return [args[0] as TSESTree.Node, args[1] as TSESTree.Node];
      }

      // `buf.equals(other)`, `token.startsWith(prefix)`, `a.localeCompare(b)`.
      if (RECEIVER_COMPARE_METHODS.has(method) && args.length === 1) {
        return [callee.object, args[0] as TSESTree.Node];
      }

      return null;
    }

    function checkComparison(
      node: TSESTree.Node,
      rawLeft: TSESTree.Node,
      rawRight: TSESTree.Node,
    ) {
      // `a?.b` arrives wrapped in a ChainExpression. Unwrap once, here, so
      // every guard below sees the member expression it was written for.
      const left = unwrapChain(rawLeft);
      const right = unwrapChain(rawRight);

      // Comparing against a constant that is already in the source — a string,
      // a number, `null`, `undefined` — cannot leak a secret, because the value
      // being compared against is not one an attacker is trying to discover.

      if (isResolvedConstant(left) || isResolvedConstant(right)) {
        return;
      }

      // …and neither can a constant reached through its name.
      if (isNamedConstant(left) || isNamedConstant(right)) {
        return;
      }

      // One value compared against a reading of itself is an assertion about
      // its format, not a check against a second value.
      if (isSelfComparison(left, right)) {
        return;
      }

      // Check if either side looks like a secret. A crypto derivation counts
      // as a secret on evidence rather than on spelling, which is the only
      // thing available when both operands are named `v` and `expected`.
      const leftIsSecret = isSecretIdentifier(left) || isCryptoSecret(left);
      const rightIsSecret = isSecretIdentifier(right) || isCryptoSecret(right);

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
          const leftUntrusted = readsUntrusted(left);
          const rightUntrusted = readsUntrusted(right);
          if (leftUntrusted === rightUntrusted) {
            // Neither operand is attacker-readable: nothing is being timed.
            if (!leftUntrusted) return;
            // BOTH are, which is what the taint reader answers for the
            // canonical webhook check — the expected signature is an HMAC of
            // the request body, so the request reaches both sides. Ask the
            // second question instead: did either value cross a boundary the
            // attacker is not on the other side of? If neither did, this is
            // the user's own input against their own input.
            if (!isServerDerived(left) && !isServerDerived(right)) return;
          }
        }

        context.report({
          node,
          messageId: 'timingUnsafeCompare',
        });
      }
    }

    function checkBinaryExpression(node: TSESTree.BinaryExpression) {
      // Check for === or == comparisons
      if (node.operator !== '===' && node.operator !== '==' &&
          node.operator !== '!==' && node.operator !== '!=') {
        return;
      }
      checkComparison(node, node.left as TSESTree.Node, node.right);
    }

    function checkCallExpression(node: TSESTree.CallExpression) {
      const operands = comparisonOperands(node);
      if (!operands) return;
      checkComparison(node, operands[0], operands[1]);
    }

    return {
      BinaryExpression: checkBinaryExpression,
      CallExpression: checkCallExpression,
    };
  },
});

export type { Options as NoTimingUnsafeCompareOptions };
