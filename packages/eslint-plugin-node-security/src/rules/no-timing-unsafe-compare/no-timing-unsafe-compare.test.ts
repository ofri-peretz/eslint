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
        `if (this.auth !== this.ANY) deny();`,
      ],
      invalid: [
        // A BARE SCREAMING_SNAKE identifier stays a finding. `API_KEY` is both
        // constant-cased and a real secret — the casing alone is not evidence,
        // the namespace is. Locked so the guard is never widened to identifiers.
        { code: 'if (API_KEY === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // process.env is the one SCREAMING_SNAKE member that holds a live
        // secret rather than a constant. Suppressing it would drop the
        // archetypal true positive this rule exists for.
        {
          code: 'if (userToken === process.env.API_TOKEN) grant();',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
      ],
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
      invalid: [
        // A boolean-predicate name on ONE side does not excuse the other. The
        // guard drops name-based evidence for that operand only.
        {
          code: 'if (isAuthenticated === storedToken) {}',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
      ],
    });
  });

  describe('Invalid Code - All Comparison Operators', () => {
    ruleTester.run('invalid - strict equality', noTimingUnsafeCompare, {
      valid: [],
      invalid: [
        // === operator
        { code: 'if (token === storedToken) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // == operator
        { code: 'if (secret == otherSecret) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // !== operator
        { code: 'if (apiKey !== expectedKey) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // != operator
        { code: 'if (password != userPassword) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
      ],
    });
  });

  describe('Invalid Code - All Secret Patterns', () => {
    ruleTester.run('invalid - comprehensive secret patterns', noTimingUnsafeCompare, {
      valid: [],
      invalid: [
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
      ],
    });
  });

  describe('Invalid Code - Naming Conventions', () => {
    ruleTester.run('invalid - all naming conventions', noTimingUnsafeCompare, {
      valid: [],
      invalid: [
        // camelCase
        { code: 'if (accessToken === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // snake_case
        { code: 'if (access_token === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // UPPER_CASE
        { code: 'if (API_KEY === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
      ],
    });
  });

  describe('Invalid Code - Member Expressions', () => {
    ruleTester.run('invalid - member expressions', noTimingUnsafeCompare, {
      valid: [],
      invalid: [
        // Property access
        { code: 'if (user.password === inputPassword) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (req.headers.authorization === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (config.secret === stored) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // Deep nesting
        { code: 'if (app.config.auth.token === valid) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
      ],
    });
  });
});
