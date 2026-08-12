/**
 * Tests for no-timing-unsafe-compare rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noTimingUnsafeCompare } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

/**
 * The pre-inversion contract: report on a secret-looking NAME alone.
 *
 * Measured on the 8-repo corpus, that produced 27 findings and zero timing
 * oracles — every one was a CLI comparing two config values, an SDK comparing
 * two records, or a check against an enum. So by default the rule now also
 * requires an attacker-controlled operand (see the "Untrusted Operand" block
 * below), and the name-matching logic these cases exist to pin is exercised
 * through the option that restores the old behaviour.
 */
const NAME_ONLY = [{ reportUnverifiedComparisons: true }];

type InvalidCase = { code: string; errors: { messageId: string }[]; options?: unknown[] };

/** Run these cases under the name-only contract. */
const nameOnly = (cases: InvalidCase[]) =>
  cases.map((testCase) => ({ ...testCase, options: NAME_ONLY }));

describe('no-timing-unsafe-compare', () => {
  describe('Valid Code - Non-Secret Comparisons', () => {
    ruleTester.run('valid - false positive prevention', noTimingUnsafeCompare, {
      valid: [
        // An existence check is not a secret comparison — there is no
        // attacker-supplied operand, so there is nothing to time. Measured: the
        // rule fired on `if (firstKey !== undefined)` in a plain object walk.
        `if (firstKey !== undefined) { use(firstKey); }`,
        `if (token === undefined) return;`,
        `if (hash === null) throw new Error('missing');`,
        `if (signature.length === 0) return false;`,
        `if (apiKey !== null) init(apiKey);`,
      // A bare `key` is not a secret name. Substring-matched it hit every AST
      // walker in the repo — `key === 'text'`, `key === 'parts'` — 88 findings,
      // none of them secrets. The specific names still fire (see invalid).
      `if (key === 'messages') collect(value);`,
      `if (prop.key === 'text') return;`,
      `const first = keys.find((key) => key === wanted);`,
        // Regular non-secret comparisons
        { code: 'if (name === otherName) {}' },
        { code: 'if (count === 5) {}' },
        { code: 'if (userId === targetId) {}' },
        { code: 'if (status === "active") {}' },
        { code: 'if (index === 0) {}' },
        // Similar names that are NOT secrets (use specific non-matching names)
        { code: 'if (role === "admin") {}' },
        { code: 'if (method === "oauth") {}' },
        { code: 'if (length === 8) {}' },
        // Non-comparison operators with secrets (should NOT flag)
        { code: 'if (token.length > 0) {}' },
        { code: 'if (secret.includes("prefix")) {}' },
        // Assignment (not comparison)
        { code: 'token = newToken;' },
        // Computed property access (not detected - intentional precision choice)
        { code: 'if (obj["access-token"] === expected) {}' },
        // Object keys (not values being compared)
        { code: 'const obj = { token: generateToken() };' },
      ],
      invalid: [],
    });
  });

  // Every fixture below is a verbatim shape from the 8-repo corpus scan, kept
  // as a lock so the two guards that suppress them cannot be removed silently.
  // See the issue: "no-timing-unsafe-compare fires on string-literal and
  // boolean comparisons".
  describe('Valid Code - Comparisons Against Source Constants', () => {
    ruleTester.run('valid - constant operand cannot leak a secret', noTimingUnsafeCompare, {
      valid: [
        // okta/okta-auth-js lib/oidc/dpop.ts:185. `revokedToken` is a
        // `'access' | 'refresh'` union tag; it matched only because the name
        // contains `token`. Nothing on the right an attacker wants to learn.
        `if (revokedToken === 'access') { shouldClear = true; }`,
        `if (revokedToken === 'refresh' && refreshToken && !accessToken) { shouldClear = true; }`,
        // Same file, same line: a discriminant check on a member expression.
        `if (accessToken.tokenType === 'DPoP') { use(accessToken); }`,
        // A hardcoded credential compared to a literal is CWE-798, reported by
        // secure-coding/no-hardcoded-credentials. It is not a timing attack —
        // constant-time comparison against a secret printed in the source
        // protects nothing.
        `if (password === 'default_password') { warn(); }`,
        // A template literal with no interpolation is the same string constant
        // written longhand.
        'if (token === `access`) { done(); }',
      ],
      invalid: [],
    });
  });

  describe('Valid Code - Named Constants', () => {
    ruleTester.run('valid - enum members are source constants', noTimingUnsafeCompare, {
      valid: [
        // 73 of the 88 findings still standing after the constant-operand and
        // boolean-predicate guards were this one shape, all from
        // okta/okta-signin-widget and okta/okta-auth-js.
        `if (name === IDX_STEP.SELECT_AUTHENTICATOR_AUTHENTICATE) return;`,
        `if (authenticatorKey === AUTHENTICATOR_KEY.WEBAUTHN) enroll();`,
        `if (err.name === Enums.AUTH_STOP_POLL_INITIATION_ERROR) return;`,
        `if (err.errorCode === ErrorCodes.INVALID_TOKEN_EXCEPTION) retry();`,
        `if (relatesTo?.key === AuthenticatorKey.OKTA_PASSWORD) select();`,
      ],
      invalid: nameOnly([
        // BOTH halves must carry the convention: a namespace-cased object AND
        // a constant-cased property. Everything below has the property and is
        // still a finding, which is what stops the guard from swallowing live
        // secrets that happen to sit behind an upper-case key.
        //
        // A camelCase object is an ordinary runtime value, not a namespace.
        {
          code: 'if (userToken === credentials.API_TOKEN) grant();',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // process.env in both spellings. The bracket form used to slip past an
        // explicit `process.env` check that only understood dot notation.
        {
          code: 'if (userToken === process.env.API_TOKEN) grant();',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        {
          code: "if (userToken === process['env'].API_TOKEN) grant();",
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // Computed: `API_TOKEN` is a variable HOLDING the key, so the property
        // name is unknowable here and nothing has been proven constant.
        {
          code: 'if (userToken === secrets[API_TOKEN]) grant();',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // A BARE SCREAMING_SNAKE identifier stays a finding. `API_KEY` is both
        // constant-cased and a real secret — the casing alone is not evidence,
        // the namespace is. Locked so the guard is never widened to identifiers.
        { code: 'if (API_KEY === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // `this.ANY` has no namespace-cased Identifier object, so it is no
        // longer exempt — one corpus finding, traded for the three above.
        { code: 'if (this.auth !== this.ANY) deny();', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // A private name is not an Identifier property, so there is no name to
        // match even though the object is namespace-cased.
        {
          code: 'class Vault { static #TOKEN = 1; static check(V, userToken) { if (userToken === V.#TOKEN) return; } }',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
      ]),
    });
  });

  describe('Valid Code - Boolean Predicates', () => {
    ruleTester.run('valid - boolean predicate names are not secrets', noTimingUnsafeCompare, {
      valid: [
        // okta/okta-auth-js lib/core/AuthStateManager.ts:44 — matched because
        // `isAuthenticated` contains `auth`. Comparing two booleans leaks one
        // bit the caller already holds.
        `if (prevState.isAuthenticated === state.isAuthenticated) return true;`,
        `if (hasToken === cached.hasToken) {}`,
        `if (shouldRefreshToken === cached.shouldRefreshToken) {}`,
        // Same function, two lines down. Neither operand is an identifier or a
        // member expression, so this never reported — locked so it stays that
        // way if isSecretIdentifier ever learns to look through calls.
        `if (JSON.stringify(prevState.idToken) === JSON.stringify(state.idToken)) return true;`,
      ],
      invalid: nameOnly([
        // A boolean-predicate name on ONE side does not excuse the other. The
        // guard drops name-based evidence for that operand only.
        {
          code: 'if (isAuthenticated === storedToken) {}',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
      ]),
    });
  });

  describe('Invalid Code - All Comparison Operators', () => {
    ruleTester.run('invalid - strict equality', noTimingUnsafeCompare, {
      valid: [],
      invalid: nameOnly([
        // === operator
        { code: 'if (token === storedToken) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // == operator
        { code: 'if (secret == otherSecret) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // !== operator
        { code: 'if (apiKey !== expectedKey) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // != operator
        { code: 'if (password != userPassword) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
      ]),
    });
  });

  describe('Invalid Code - All Secret Patterns', () => {
    ruleTester.run('invalid - comprehensive secret patterns', noTimingUnsafeCompare, {
      valid: [],
      invalid: nameOnly([
        // Tokens
        { code: 'if (token === storedToken) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (accessToken === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (refreshToken === stored) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (bearerToken === auth) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (authToken === valid) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // Secrets
        { code: 'if (secret === otherSecret) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // Keys
        { code: 'if (apiKey === expectedKey) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (privateKey === loaded) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (encryptionKey === stored) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // Passwords
        { code: 'if (password === userPassword) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // Hashes and MACs
        { code: 'if (hash === computed) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (hmac === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (digest === stored) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (signature === valid) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (mac === computed) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // PII
        { code: 'if (ssn === storedSSN) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // Sessions
        { code: 'if (sessionId === current) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // CSRF
        { code: 'if (csrf === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (nonce === valid) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // JWT
        { code: 'if (jwt === stored) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // Credentials
        { code: 'if (credential === valid) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (bearer === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
      ]),
    });
  });

  describe('Invalid Code - Naming Conventions', () => {
    ruleTester.run('invalid - all naming conventions', noTimingUnsafeCompare, {
      valid: [],
      invalid: nameOnly([
        // camelCase
        { code: 'if (accessToken === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // snake_case
        { code: 'if (access_token === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // UPPER_CASE
        { code: 'if (API_KEY === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
      ]),
    });
  });

  describe('Invalid Code - Member Expressions', () => {
    ruleTester.run('invalid - member expressions', noTimingUnsafeCompare, {
      valid: [],
      invalid: nameOnly([
        // Property access
        { code: 'if (user.password === inputPassword) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (req.headers.authorization === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (config.secret === stored) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // Deep nesting
        { code: 'if (app.config.auth.token === valid) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
      ]),
    });
  });

  // ── The inversion ────────────────────────────────────────────────────────
  // A timing oracle needs an attacker on ONE side of the comparison and a
  // secret on the other. The rule used to check only the second. Every `valid`
  // case below is a verbatim shape from the 8-repo corpus scan and reported
  // before this change; every `invalid` case reported before it too, so the
  // block as a whole pins the trade in both directions.
  describe('Untrusted Operand Required', () => {
    ruleTester.run('secret name alone is not a timing oracle', noTimingUnsafeCompare, {
      valid: [
        // Shopify/cli packages/app/src/cli/services/app-context.ts:148 — two
        // config values a CLI compares on the developer's own machine.
        `const rightApp = remoteApp.apiKey === localApp.configuration.client_id;`,
        // Shopify/cli packages/app/src/cli/services/dev.ts:168.
        `const changed = remoteApp.apiKey !== previousAppId;`,
        // Shopify/cli .../websocket/handlers.ts:116.
        `if (payloadStoreApiKey !== eventAppApiKey) return;`,
        // okta/okta-auth-js lib/oidc/util/refreshToken.ts:5 — record equality.
        `function isEqual(a, b) { return (a.refreshToken === b.refreshToken); }`,
        // okta/okta-signin-widget src/v3/src/util/idxUtils.ts:233,240.
        `if (tx1AuthKey !== tx2AuthKey) return false;`,
        // okta/okta-auth-js lib/oidc/util/validateClaims.ts:29 and
        // lib/oidc/verifyToken.ts:62 — a browser SDK validating its own
        // response. There is no server here whose response time an attacker
        // could measure.
        `if (nonce && claims.nonce !== nonce) throw new Error('nonce');`,
        `if (hash !== token.claims.at_hash) throw new Error('at_hash');`,

        // auth0/express-openid-connect lib/context.js:616,634. The constant is
        // declared in-file as a plain string, so the comparison is against a
        // value that is already in the source — resolved through the binding,
        // NOT guessed from the SCREAMING_SNAKE name.
        `const SESSION_TRANSFER_TOKEN_IDENTIFIER = 'urn:x:session_transfer';
         if (exchanged.issued_token_type !== SESSION_TRANSFER_TOKEN_IDENTIFIER) throw new Error('x');`,
        // okta/okta-signin-widget ChallengeWebauthnFooter.js:62.
        `const OKTA_AUTHENTICATOR = 'Okta_Authenticator';
         if (app.name === OKTA_AUTHENTICATOR) return true;`,

        // auth0/express-openid-connect lib/context.js:155 — one value compared
        // against a reading of itself. No second value exists to be revealed.
        `function validate(token) { if (token !== token.trim()) throw new Error('ws'); }`,

        // okta/okta-signin-widget src/v1/LoginRouter.ts:165 — `hash` here is the
        // URL fragment the browser puts in the address bar, not a digest.
        'if (window.location.hash === `#${id}`) scroll();',
        // The same false friend with the receiver written as a bare identifier.
        'if (location.hash === wanted) scroll();',
        // Self-comparison where the derived side is a plain member read rather
        // than a call — memberRoot has to unwrap both shapes.
        'function f(token) { if (token !== token.raw) throw new Error("x"); }',
        // …and one whose chain bottoms out at something that is not an
        // identifier, so there is no root to match and the guard declines.
        'function f(token) { if (token !== this.token) throw new Error("x"); }',

        // okta/okta-auth-js .../routes/authenticator.js:187 — both operands are
        // the same user's own input. Exactly one side must be untrusted.
        `router.post('/x', (req, res) => {
           const { password, confirmPassword } = req.body;
           if (password !== confirmPassword) return;
         });`,
      ],
      invalid: [
        // The canonical CWE-208: attacker-supplied signature verified against a
        // server-held secret. Untrusted on the left, secret on the right.
        {
          code: `app.post('/hook', (req, res) => {
                   if (req.headers['x-signature'] === computedHmac) accept();
                 });`,
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // The secret side may be the env read — `process` is deliberately NOT
        // an untrusted root, so this stays a finding rather than becoming a
        // both-sides-tainted no-op.
        {
          code: `function check(req) { return req.query.token === process.env.ADMIN_TOKEN; }`,
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // Untrusted reached through a binding, not written inline.
        {
          code: `function check(req, stored) {
                   const supplied = req.body.apiKey;
                   return supplied === stored.apiKey;
                 }`,
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // A constant NAME is not enough — `API_KEY` here holds an env read, so
        // the binding does not resolve to a literal and the comparison stands.
        {
          code: `const API_KEY = process.env.API_KEY;
                 function check(req) { return req.headers.authorization === API_KEY; }`,
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // Self-comparison needs the SAME root. Two different properties of one
        // receiver are two values, and the guard must not swallow them.
        {
          code: `function check(req, vault) { return req.body.token === vault.token; }`,
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // A computed member is not a name at all, so the false-friend list
        // cannot apply and the comparison is judged on its operands.
        {
          code: `function f(req, o) { return req.body.sig === o[kind].hash; }`,
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // A `hash` read off something that is NOT a location is a digest again.
        {
          code: `function f(req, file) { return req.body.sig === file.hash; }`,
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // A receiver that is neither an identifier nor a member expression.
        {
          code: `function f(req) { return req.body.sig === get().hash; }`,
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // `untrustedSources` is configurable; a project whose handler argument
        // is named something else can say so.
        {
          code: `function handler(incoming, stored) { return incoming.token === stored.token; }`,
          options: [{ untrustedSources: ['incoming'] }],
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
      ],
    });
  });
});
