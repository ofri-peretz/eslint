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

type InvalidCase = {
  code: string;
  errors: { messageId: string }[];
  options?: unknown[];
};

/** Run these cases under the name-only contract. */
const nameOnly = (cases: InvalidCase[]) =>
  cases.map((testCase) => ({ ...testCase, options: NAME_ONLY }));

describe('no-timing-unsafe-compare', () => {
  describe('Valid Code - Non-Secret Comparisons', () => {
    ruleTester.run('valid - false positive prevention', noTimingUnsafeCompare, {
      valid: [
        // An AST discriminant is not a credential. flint-fyi/flint compares
        // `operatorToken.kind` against a SyntaxKind inside its own lint rule; the
        // identifier carries `token`, the value is an enum member.
        {
          // @source flint-fyi/flint packages/ts/src/rules/errorSubclassProperties.ts:56
          // @found real-source scan
          name: 'FP: an AST discriminant is not a credential — 11 findings in the wild',
          code: 'if (statement.expression.operatorToken.kind === SyntaxKind.EqualsToken) { return; }',
        },
        {
          // This is a real timing leak and the rule stays quiet. The detection
          // is a NAME heuristic, so a secret held in an unnamed variable is
          // invisible to it — the litmus test is renaming every identifier to
          // `a`/`b` and asking whether the rule still fires. It does not, and
          // widening the word list does not fix the general case. A `valid`
          // case is the honest place to say so: this is what ships today.
          // @found no word list fixes the general case; the consumer vocabulary option is the escape hatch
          name: 'GAP: a secret compared through an anonymous name is not detected',
          code: 'if (a === b) { grant(); }',
        },
        'if (node.type === expectedType) { return; }',
        'if (symbol.flags === SymbolFlags.Property) { return; }',
        // The plural tail is a separate entry: only the LAST word is tested, so
        // `kind` does not cover `tokenKinds`. Removing `kinds` from
        // DEFAULT_NON_SECRET_TAILS makes this report, because the identifier
        // still carries `token`.
        'if (tokenKinds === allowedKinds) { return; }',
        // Same for `category` — `secretCategory` is a classification label the
        // program assigns, not a value an attacker guesses a byte at a time.
        // Removing `category` makes this report on the `secret` pattern.
        "if (secretCategory === 'rotating') { return; }",
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
        { name: 'two names compared, which is not a secret', code: 'if (name === otherName) {}' },
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
    ruleTester.run(
      'valid - constant operand cannot leak a secret',
      noTimingUnsafeCompare,
      {
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
      },
    );
  });

  describe('Valid Code - Named Constants', () => {
    ruleTester.run(
      'valid - enum members are source constants',
      noTimingUnsafeCompare,
      {
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
            name: 'an API token compared with ===',
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
          {
            code: 'if (API_KEY === expected) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          // `this.ANY` has no namespace-cased Identifier object, so it is no
          // longer exempt — one corpus finding, traded for the three above.
          {
            code: 'if (this.auth !== this.ANY) deny();',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          // A private name is not an Identifier property, so there is no name to
          // match even though the object is namespace-cased.
          {
            code: 'class Vault { static #TOKEN = 1; static check(V, userToken) { if (userToken === V.#TOKEN) return; } }',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
        ]),
      },
    );
  });

  describe('Valid Code - Boolean Predicates', () => {
    ruleTester.run(
      'valid - boolean predicate names are not secrets',
      noTimingUnsafeCompare,
      {
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
      },
    );
  });

  describe('Invalid Code - All Comparison Operators', () => {
    ruleTester.run('invalid - strict equality', noTimingUnsafeCompare, {
      valid: [],
      invalid: nameOnly([
        // === operator
        {
          code: 'if (token === storedToken) {}',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // == operator
        {
          code: 'if (secret == otherSecret) {}',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // !== operator
        {
          code: 'if (apiKey !== expectedKey) {}',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // != operator
        {
          code: 'if (password != userPassword) {}',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
      ]),
    });
  });

  describe('Invalid Code - All Secret Patterns', () => {
    ruleTester.run(
      'invalid - comprehensive secret patterns',
      noTimingUnsafeCompare,
      {
        valid: [],
        invalid: nameOnly([
          // Tokens
          {
            code: 'if (token === storedToken) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          {
            code: 'if (accessToken === expected) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          {
            code: 'if (refreshToken === stored) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          {
            code: 'if (bearerToken === auth) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          {
            code: 'if (authToken === valid) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          // Secrets
          {
            code: 'if (secret === otherSecret) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          // Keys
          {
            code: 'if (apiKey === expectedKey) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          {
            code: 'if (privateKey === loaded) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          {
            code: 'if (encryptionKey === stored) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          // Passwords
          {
            code: 'if (password === userPassword) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          // Hashes and MACs
          {
            code: 'if (hash === computed) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          {
            code: 'if (hmac === expected) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          {
            code: 'if (digest === stored) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          {
            code: 'if (signature === valid) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          {
            code: 'if (mac === computed) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          // PII
          {
            code: 'if (ssn === storedSSN) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          // Sessions
          {
            code: 'if (sessionId === current) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          // CSRF
          {
            code: 'if (csrf === expected) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          {
            code: 'if (nonce === valid) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          // JWT
          {
            code: 'if (jwt === stored) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          // Credentials
          {
            code: 'if (credential === valid) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
          {
            code: 'if (bearer === expected) {}',
            errors: [{ messageId: 'timingUnsafeCompare' }],
          },
        ]),
      },
    );
  });

  describe('Invalid Code - Naming Conventions', () => {
    ruleTester.run('invalid - all naming conventions', noTimingUnsafeCompare, {
      valid: [],
      invalid: nameOnly([
        // camelCase
        {
          code: 'if (accessToken === expected) {}',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // snake_case
        {
          code: 'if (access_token === expected) {}',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // UPPER_CASE
        {
          code: 'if (API_KEY === expected) {}',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
      ]),
    });
  });

  describe('Invalid Code - Member Expressions', () => {
    ruleTester.run('invalid - member expressions', noTimingUnsafeCompare, {
      valid: [],
      invalid: nameOnly([
        // Property access
        {
          code: 'if (user.password === inputPassword) {}',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        {
          code: 'if (req.headers.authorization === expected) {}',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        {
          code: 'if (config.secret === stored) {}',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // Deep nesting
        {
          code: 'if (app.config.auth.token === valid) {}',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
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
    ruleTester.run(
      'secret name alone is not a timing oracle',
      noTimingUnsafeCompare,
      {
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
      },
    );
  });
});

/**
 * REGRESSION LOCK — TypeScript casts must not hide taint.
 *
 * `req.query.x` is typed `string | string[] | ParsedQs | undefined` by Express,
 * so a TypeScript handler CANNOT pass it where a string is expected without
 * `as string`. Every taint walker in this repo dispatched on `node.type` and
 * fell through to its null/false default for `TSAsExpression`, so this rule
 * reported NOTHING on TypeScript Express code while its suite stayed green —
 * there was not one cast anywhere in these tests.
 *
 * The cast is erased at compile time and changes no value, so unwrapping it is
 * always sound for provenance. Fixed by `unwrapTypeSyntax` in @interlace/eslint-devkit.
 *
 * This block FAILS on the pre-fix rule. Verify with:
 *   git stash && npx vitest run <this file>   # expect a failure
 */
ruleTester.run(
  'no-timing-unsafe-compare-ts-cast-taint',
  noTimingUnsafeCompare,
  {
    valid: [
      `const mode = req.headers['x-mode'] as string; if (mode === 'json') { ok(); }`,
    ],
    invalid: [
      {
        code: `const sig = req.headers['x-hub-signature-256'] as string; if (sig === process.env.GH_SIGNATURE) { ok(); }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
    ],
  },
);

/**
 * THE DEFAULT IDIOM — `req.headers['x'] || ''`.
 *
 * The same class of hole as the cast block above, one node type over.
 * `makeReadsTaintSource` had no `LogicalExpression` case, so the single
 * commonest way a header is read in Node — with the defensive `|| ''` that
 * keeps `undefined` away from `.trim()` — fell through to `default: return
 * false` and the header was judged clean. Writing DEFENSIVE code switched the
 * rule off; writing the same handler carelessly kept it on.
 *
 * Measured on `benchmarks/rule-corpus/node-security__no-timing-unsafe-compare`:
 * 19/25 -> 24/25 true positives, recall 76.0% -> 96.0%, precision unchanged at
 * 100%. Two fixtures written to isolate this exact hop —
 * `vulnerable/16-header-default-idiom.js` and
 * `vulnerable/07-intermediate-const.js` — were sitting in the corpus as misses.
 *
 * The valid cases are the precision half, and they are why this is not a
 * blanket widening: `contentType` is not a secret name, the `.length` compare
 * leaks a length that is fixed and public, and `token !== token.trim()`
 * compares a value against a reading of itself. All three carry the `|| ''`
 * and all three must stay quiet.
 *
 * This block FAILS on the pre-fix rule. Verify by deleting the
 * `LogicalExpression` / `ConditionalExpression` cases from
 * `utils/provenance.ts` and re-running this file.
 */
ruleTester.run(
  'no-timing-unsafe-compare-default-idiom-taint',
  noTimingUnsafeCompare,
  {
    valid: [
      // Protocol negotiation on a header the client already knows.
      `function f(req) { const contentType = String(req.headers['content-type'] || '').split(';')[0]; if (contentType === 'application/json') { ok(); } }`,
      // A `.length` comparison leaks a length that is fixed and public.
      `function f(req) { const provided = Buffer.from(req.headers['x-signature'] || '', 'hex'); if (provided.length !== expectedSignature.length) { bail(); } }`,
      // A format assertion against a reading of the value ITSELF.
      `function f(req) { const token = String(req.headers.authorization || '').replace(/^Bearer /, ''); if (token !== token.trim()) { bail(); } }`,
    ],
    invalid: [
      // The headline: `|| ''` on the header, compared against an env secret.
      {
        code: `const serviceApiKey = process.env.SERVICE_API_KEY; function authorize(req) { const providedKey = req.headers['x-service-key'] || ''; if (providedKey === serviceApiKey) { return { ok: true }; } return { ok: false }; }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // The same idiom one hop deeper, inside the wrapper that made it necessary
      // in the first place: `String(raw || '').trim()`.
      {
        code: `const serviceApiKey = process.env.SERVICE_API_KEY; function authorize(req) { const raw = req.headers['x-service-key']; const providedKey = String(raw || '').trim(); if (providedKey === serviceApiKey) { return { ok: true }; } return { ok: false }; }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // `??`, which a TypeScript codebase reaches for instead of `||`.
      {
        code: `function authorize(req) { const providedKey = req.headers['x-service-key'] ?? ''; if (providedKey === process.env.SERVICE_API_KEY) { return true; } return false; }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // The ternary spelling of the same default.
      {
        code: `function authorize(req) { const providedKey = req.headers['x-service-key'] ? req.headers['x-service-key'] : ''; if (providedKey === process.env.SERVICE_API_KEY) { return true; } return false; }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
    ],
  },
);

/**
 * `secretPatterns` — the option no test had ever set, so the branch that
 * compiles a user vocabulary shipped unexecuted.
 *
 * The pairs below are the same source under the default and under the option,
 * with opposite verdicts. Both directions are covered, because this option can
 * make the rule stricter OR quieter and both are things a project does:
 *
 *  - WIDENING. `key` is deliberately absent from the defaults — substring
 *    matched it hits `firstKey`, `keys` and every AST walker's
 *    `key === 'text'`, 88 findings on this repo alone. A project whose `key`
 *    really is a secret adds it back here, which is exactly what the note on
 *    DEFAULT_SECRET_PATTERNS says the option is for.
 *  - NARROWING. Replacing the list with a shorter one drops names the defaults
 *    carried.
 *
 * `secretPatterns` REPLACES the built-in list rather than extending it — the
 * narrowing case is what pins that, and it is the behaviour a reader has to
 * know before writing a config.
 */
ruleTester.run(
  'no-timing-unsafe-compare — secretPatterns',
  noTimingUnsafeCompare,
  {
    valid: [
      // CONTROL for widening: `key` is not a default pattern, so the untainted-
      // side name is not read as a secret and nothing is reported.
      `const supplied = req.headers['x-key']; if (supplied === accountKey) { ok(); }`,
      // NARROWING: a list without `token` silences a comparison the defaults
      // report — proof the option REPLACES rather than extends.
      {
        code: `const supplied = req.headers['x-token']; if (supplied === sessionToken) { ok(); }`,
        options: [{ secretPatterns: ['passphrase'] }],
      },
    ],
    invalid: [
      // WIDENING: adding `key` makes the identical first valid case report.
      {
        code: `const supplied = req.headers['x-key']; if (supplied === accountKey) { ok(); }`,
        options: [{ secretPatterns: ['key'] }],
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // CONTROL for narrowing: identical source, default options.
      {
        code: `const supplied = req.headers['x-token']; if (supplied === sessionToken) { ok(); }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
    ],
  },
);

/**
 * Regression locks from the CWE-208 rule corpus
 * (benchmarks/rule-corpus/node-security__no-timing-unsafe-compare).
 *
 * The corpus opened at 13.3% recall: the rule was silent on its own headline
 * shape, the webhook HMAC check, because the expected signature is an HMAC OF
 * THE REQUEST BODY and the taint reader therefore marked both operands
 * attacker-controlled. Every case below fails on the rule as it stood then.
 */
describe('no-timing-unsafe-compare rule-corpus regressions', () => {
  ruleTester.run('no-timing-unsafe-compare', noTimingUnsafeCompare, {
    valid: [
      // Name collisions. `auth` must keep matching `authorization`, so the
      // subtraction is by WORD and by TAIL, never by loosening the pattern.
      { code: 'if (req.body.authorId !== post.authorId) { deny(); }' },
      {
        code: 'if (req.body.postAuthorId !== comment.postAuthorId) { deny(); }',
      },
      { code: 'if (req.body.macAddress !== device.macAddress) { deny(); }' },
      { code: 'if (req.body.tokenCount !== usage.tokenCount) { deny(); }' },
      {
        code: 'if (req.body.promptTokenLimit !== plan.promptTokenLimit) { deny(); }',
      },
      // The new comparison-API surface must not fire on a literal prefix.
      {
        code: "if (String(req.headers.authorization).startsWith('Bearer ')) { ok(); }",
      },
      { code: "if (req.path.startsWith('/internal/')) { deny(); }" },
      // A CORRECT constant-time comparison: it never puts one input on each
      // side of an equality operator, and its `.length` guard is excluded.
      {
        code: `function constantTimeEquals(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) { diff |= a.charCodeAt(i) ^ b.charCodeAt(i); }
  return diff === 0;
}
const presentedToken = req.headers['x-auth-token'];
constantTimeEquals(presentedToken, storedToken);`,
      },
      // A real timingSafeEqual wrapper — no equality operator at all.
      {
        code: `const safeEq = (a, b) => timingSafeEqual(Buffer.from(a), Buffer.from(b));
const presentedToken = req.headers['x-auth-token'];
safeEq(presentedToken, storedToken);`,
      },
      // The user's own input against the user's own input: both operands read
      // the request and neither crossed a server boundary.
      {
        code: 'const { password, confirmPassword } = req.body; if (password !== confirmPassword) { deny(); }',
      },
      // Past the hop budget on the server-derivation walk: the answer is
      // "no visible evidence", never a crash and never a guess.
      { code: 'if (req.body.apiKey === req.a.b.c.d.e.apiKey) { ok(); }' },
      // A private-method callee is not a comparison API.
      {
        code: `class Gate {
  #eq(a, b) { return a === b; }
  check(req, storedToken) { return this.#eq(req.headers.x, storedToken); }
}`,
      },
      // An equality wrapper whose comparison has a non-identifier operand.
      {
        code: 'function eq(a, b) { return "x" === b; } const presentedToken = req.headers.x; eq(presentedToken, storedToken);',
      },
      {
        code: 'function eq(a, b) { return a === "x"; } const presentedToken = req.headers.x; eq(presentedToken, storedToken);',
      },
      // Both operands read the request and neither is a value the server made.
      { code: 'if (req.body.sessionToken === `x${req.query.y}`) { ok(); }' },
      // A pure transform of the request is still the request: a bare-function
      // callee is no evidence of a server boundary.
      {
        code: 'const stored = decode(req.params.id); if (req.body.apiKey === stored.apiKey) { ok(); }',
      },
      // Callees that are not comparisons.
      {
        code: 'const presentedToken = req.headers.x; format(presentedToken, storedToken);',
      },
      {
        code: 'const presentedToken = req.headers.x; isEqual(presentedToken);',
      },
      {
        code: 'const presentedToken = req.headers.x; isEqual(...presentedToken);',
      },
      {
        code: 'const presentedToken = req.headers.x; obj[fn](presentedToken, storedToken);',
      },
      {
        code: 'const presentedToken = req.headers.x; presentedToken.slice(storedToken);',
      },
      {
        code: 'const presentedToken = req.headers.x; Buffer.concat(presentedToken, storedToken);',
      },
      {
        code: 'const presentedToken = req.headers.x; Other.compare(presentedToken, storedToken);',
      },
      {
        code: 'const presentedToken = req.headers.x; presentedToken.equals(a, b);',
      },
      // A local function with fewer than two parameters, and one whose
      // parameters are destructured rather than named.
      {
        code: 'function eq(a) { return a === b; } const presentedToken = req.headers.x; eq(presentedToken, storedToken);',
      },
      {
        code: 'function eq({ a }, b) { return a === b; } const presentedToken = req.headers.x; eq(presentedToken, storedToken);',
      },
      // A local function that compares one parameter to itself.
      {
        code: 'function eq(a, b) { return a === a.trim(); } const presentedToken = req.headers.x; eq(presentedToken, storedToken);',
      },
      // An equality wrapper called with too few arguments to map onto.
      {
        code: 'function eq(a, b) { return a === b; } const presentedToken = req.headers.x; eq(presentedToken);',
      },
      // A callee that resolves to something that is not a function.
      {
        code: 'const eq = 42; const presentedToken = req.headers.x; eq(presentedToken, storedToken);',
      },
      {
        code: 'let eq; const presentedToken = req.headers.x; eq(presentedToken, storedToken);',
      },
      {
        code: 'import { eq } from "x"; const presentedToken = req.headers.x; eq(presentedToken, storedToken);',
      },
      // Bracket access whose key is not a string literal.
      { code: 'if (creds[keyName] === req.headers.x) { ok(); }' },
      // `window.location.hash` read with bracket notation is still the URL
      // fragment, not a digest.
      { code: "if (window.location['hash'] === req.query.frag) { ok(); }" },
    ],
    invalid: [
      // THE headline shape: an HMAC of the request body compared with `!==`.
      {
        code: `import { createHmac } from 'node:crypto';
const signature = req.headers['x-hub-signature-256'];
const expectedSignature = \`sha256=\${createHmac('sha256', process.env.S).update(req.rawBody).digest('hex')}\`;
if (signature !== expectedSignature) { deny(); }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // …and the same finding with both operands renamed to nothing. The
      // right-hand side is a secret because of what it IS, not what it is
      // called.
      {
        code: `import { createHmac } from 'node:crypto';
const v = req.headers['x-sig'];
const expected = createHmac('sha256', process.env.S).update(req.rawBody).digest('hex');
if (v === expected) { ok(); }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // A value that came back from a store: the request chose the row.
      {
        code: `const record = await store.lookup(req.cookies.sid);
if (req.cookies.sessionId === record.sessionId) { ok(); }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // …and the synchronous spelling, where there is no `await` to see.
      {
        code: `const stored = cache.getSync(req.params.id);
if (req.body.apiKey !== stored.apiKey) { deny(); }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // Both operands under `req`: `req.session` is server state.
      {
        code: 'if (req.body._csrf !== req.session.csrfToken) { deny(); }',
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // The Koa spelling.
      {
        code: "if (ctx.state.apiToken !== ctx.request.headers['x-api-token']) { deny(); }",
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // Optional chaining — a ChainExpression wrapper hid every operand.
      {
        code: `const account = await accounts.byId(req.params.tenantId);
if (req.body?.apiKey !== account?.apiKey) { deny(); }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // Bracket access to the secret property.
      {
        code: `const creds = await vault.fetch(req.params.id);
if (creds['apiKey'] === req.headers['x-integration-key']) { ok(); }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // Comparison APIs that are memcmp in disguise.
      {
        code: `import { createHmac } from 'node:crypto';
const provided = Buffer.from(req.headers['x-signature'], 'hex');
const expectedDigest = createHmac('sha256', process.env.K).update(req.rawBody).digest();
if (!provided.equals(expectedDigest)) { deny(); }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        code: `import { createHmac } from 'node:crypto';
const sigBuf = Buffer.from(req.headers['x-sig'], 'base64');
const expectedSigBuf = createHmac('sha512', process.env.K).update(req.rawBody).digest();
if (Buffer.compare(sigBuf, expectedSigBuf) === 0) { ok(); }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        code: `const presented = String(req.headers.authorization);
const storedToken = await tokenStore.currentToken();
if (presented.localeCompare(storedToken) === 0) { ok(); }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        code: `const submitted = String(req.query.licence);
if (submitted.startsWith(licenceSecretPrefix)) { ok(); }`,
        options: [{ reportUnverifiedComparisons: true }],
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        code: `import { createHash } from 'node:crypto';
const providedDigest = createHash('sha256').update(req.body.payload).digest('hex');
if (isEqual(providedDigest, storedDigest)) { ok(); }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        code: `import { createHash } from 'node:crypto';
const providedDigest = createHash('sha256').update(req.body.payload).digest('hex');
if (_.isEqual(providedDigest, storedDigest)) { ok(); }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // A LOCAL function wearing the trusted name, whose body is `a === b`.
      {
        code: `const timingSafeEqual = (a, b) => a === b;
const providedToken = req.headers['x-auth-token'];
const storedToken = await tokenStore.current();
timingSafeEqual(providedToken, storedToken);`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // The FAKE constant-time helper: a loop that early-returns.
      {
        code: `function constantTimeEquals(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) { if (a.charCodeAt(i) !== b.charCodeAt(i)) return false; }
  return true;
}
const presentedKey = String(req.headers['x-api-key']);
constantTimeEquals(presentedKey, storedApiKey);`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // …with a third argument, and the compared parameters second and third.
      {
        code: `function safeCompare(label, a, b) {
  metrics.increment(label);
  for (let i = 0; i < a.length; i += 1) { if (a[i] !== b[i]) return false; }
  return true;
}
const presentedToken = req.headers['x-auth-token'];
const storedToken = await tokenStore.current();
safeCompare('auth', presentedToken, storedToken);`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // A named function EXPRESSION bound to a const resolves the same way.
      {
        code: `const eq = function compare(a, b) { return a === b; };
const providedToken = req.headers['x-auth-token'];
const storedToken = await tokenStore.current();
eq(providedToken, storedToken);`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // Callee shapes that are NOT crypto derivations: the finding here comes
      // from the header NAME, and the point is that the derivation test says
      // "no" to a bracket-called method and to a private one.
      {
        code: "const expected = hasher['digest']('hex'); const signature = req.headers.x; if (signature === expected) { deny(); }",
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        code: `class Signer {
  #compute() { return ''; }
  check(req) {
    const expected = this.#compute();
    const signature = req.headers.x;
    if (signature === expected) { deny(); }
  }
}`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // The derivation written inline, behind the `as string` cast a typed
      // handler needs.
      {
        code: `import { createHmac } from 'node:crypto';
const signature = req.headers['x-sig'];
if (signature !== (createHmac('sha256', process.env.S).update(req.rawBody).digest('hex') as string)) { deny(); }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // …and inline without the cast.
      {
        code: `import { createHmac } from 'node:crypto';
if (req.headers['x-sig'] !== createHmac('sha256', process.env.S).update(req.rawBody).digest('hex')) { deny(); }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // The HMAC concatenated with `+` rather than interpolated.
      {
        code: `import { createHmac } from 'node:crypto';
const signature = req.headers['x-sig'];
const expectedSignature = 'sha256=' + createHmac('sha256', process.env.S).update(req.rawBody).digest('hex');
if (signature !== expectedSignature) { deny(); }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // The store itself hangs off `req` — the receiver is server state, so
      // the value it returned is too.
      {
        code: `const stored = req.app.locals.vault.fetch(req.params.id);
if (req.body.apiKey === stored.apiKey) { ok(); }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // A KDF output compared against a stored hash: both server-derived, and
      // the finding stands because at least one crossed a boundary.
      {
        code: `import { pbkdf2Sync } from 'node:crypto';
const account = await db.users.findByEmail(req.body.email);
const passwordHash = account.passwordHash;
const candidate = pbkdf2Sync(req.body.password, account.salt, 210000, 32, 'sha256').toString('hex');
if (candidate === passwordHash) { ok(); }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
    ],
  });
});

/**
 * The two EXCLUSION vocabularies, made overridable.
 *
 * `secretPatterns` — the list that says "this IS a secret" — has always been
 * the user's. `nonSecretWords` and `nonSecretTails`, which say "…except when",
 * were baked in, and that asymmetry is what these two suites close: a
 * publishing domain has real secrets with `author` in the name, and a project
 * that adds `key` to `secretPatterns` needs a matching way to keep
 * `keyIndex` out.
 *
 * Each suite pins the DEFAULT in one direction and the OVERRIDE in the other,
 * on identical source, so neither can pass by accident.
 */
ruleTester.run(
  'no-timing-unsafe-compare — nonSecretWords',
  noTimingUnsafeCompare,
  {
    valid: [
      // DEFAULT: `author` is a non-secret word, so `authorId` — which matches
      // the `auth` pattern by collision — is excluded.
      'function h(req){ const authorId = req.query.a; if (authorId === expected) {} }',
      // WIDENING: a domain word of the consumer's own.
      {
        code: 'function h(req){ const casseroleToken = req.query.a; if (casseroleToken === expected) {} }',
        options: [{ nonSecretWords: ['casserole'] }],
      },
    ],
    invalid: [
      // NARROWING: emptying the list restores the `auth` ⊂ `authorId` collision,
      // which is the behaviour the guard exists to remove.
      {
        code: 'function h(req){ const authorId = req.query.a; if (authorId === expected) {} }',
        options: [{ nonSecretWords: [] }],
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // CONTROL for the widening case: identical source, default word list.
      {
        code: 'function h(req){ const casseroleToken = req.query.a; if (casseroleToken === expected) {} }',
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
    ],
  },
);

ruleTester.run(
  'no-timing-unsafe-compare — nonSecretTails',
  noTimingUnsafeCompare,
  {
    valid: [
      // DEFAULT: `count` is a non-secret tail, so an LLM usage counter is not a
      // credential however it is spelled.
      'function h(req){ const tokenCount = req.query.a; if (tokenCount === expected) {} }',
      // WIDENING: a unit noun this domain uses as a quantity.
      {
        code: 'function h(req){ const tokenChapter = req.query.a; if (tokenChapter === expected) {} }',
        options: [{ nonSecretTails: ['chapter'] }],
      },
    ],
    invalid: [
      // NARROWING: with no tails excluded, `tokenCount` matches `token` again.
      {
        code: 'function h(req){ const tokenCount = req.query.a; if (tokenCount === expected) {} }',
        options: [{ nonSecretTails: [] }],
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      // CONTROL for the widening case: identical source, default tail list.
      {
        code: 'function h(req){ const tokenChapter = req.query.a; if (tokenChapter === expected) {} }',
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
    ],
  },
);

/**
 * LOCK — `isCryptoDerivation()` recursion terminates on the deepest input that
 * can reach it.
 *
 * The rule ledger flags this function as `unguarded-recursion`. Probed, it is a
 * FALSE ALARM on both counts:
 *
 * 1. It cannot CYCLE. Its two recursive edges are `unwrapTypeSyntax(node)`,
 *    which strictly strips a wrapper, and `isCryptoDerivation(callee.object)`,
 *    which strictly descends the AST. Neither follows a binding, so the
 *    ledger's suggested `let a = b; let b = a;` probe cannot reach it — and
 *    that snippet was run: both this rule and `require-https-only` stayed
 *    quiet, with no RangeError.
 * 2. It cannot out-recurse the PARSER. Measured on
 *    @typescript-eslint/parser: a 200-link call chain
 *    (`createHmac(...).q().q()…`) lints normally and reports; at 400 the parser
 *    throws "Maximum call stack size exceeded" and the rule never runs.
 *
 * No depth guard was added: reachable only above the parser's own ceiling, it
 * would be an uncoverable branch in a package pinned at 100%.
 *
 * 100 links, well inside the ceiling, so a parser upgrade cannot make this
 * flaky. The finding still lands, which proves the walk reached the
 * `createHmac` at the bottom rather than bailing out early.
 */
ruleTester.run(
  'no-timing-unsafe-compare — deep call chain terminates',
  noTimingUnsafeCompare,
  {
    valid: [],
    invalid: [
      {
        code: `const sig = req.headers['x-sig'];
const expected = createHmac('sha256', S)${'.q()'.repeat(100)};
if (sig === expected) { ok(); }`,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
    ],
  },
);
