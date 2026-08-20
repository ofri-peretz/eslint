/**
 * Tests for no-jwt-in-storage rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noJwtInStorage } from './index';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

// Example JWT for testing
const EXAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

ruleTester.run('no-jwt-in-storage', noJwtInStorage, {
  valid: [
    // Non-sensitive storage
    { code: `localStorage.setItem('theme', 'dark');` },
    { code: `sessionStorage.setItem('locale', 'en-US');` },
    { code: `localStorage.setItem('preference', 'compact');` },
    // Reading storage is fine
    { code: `const theme = localStorage.getItem('theme');` },
    // Not the storage API
    { code: `myStorage.setItem('token', jwt);` },
    // Test files allowed by default
    { code: `localStorage.setItem('token', jwt);`, filename: 'auth.test.ts' },
    {
      code: `sessionStorage.setItem('accessToken', token);`,
      filename: 'token.spec.js',
    },
    // A COUNT of tokens is not a token.
    { code: `localStorage.setItem('tokenCount', '5');` },
    { code: `localStorage.setItem('sessionTimeout', '900');` },

    // --- whole-word, not substring ------------------------------------------
    // Reproduced against the shipped rule: /token$/i matched `tokenizer`,
    // /auth/i matched `author`.
    { code: `localStorage.setItem('tokenizer-config', cfg);` },
    { code: `localStorage.setItem('article-author', name);` },
    { code: `sessionStorage.setItem('last-accessed', ts);` },

    // --- the partition: non-bearer secrets belong to the medium rules -------
    { code: `localStorage.setItem('user_password', pw);` },
    { code: `sessionStorage.setItem('ssn', v);` },
    { code: `localStorage.setItem('api_key', k);` },

    // A key that cannot be resolved to a string says nothing.
    { code: `localStorage.setItem(makeKey(id), value);` },
    // No arguments at all.
    { code: `localStorage.setItem();` },
    // Not a member-expression assignment target.
    { code: `[a] = b;` },

    // A `.` triple that is not a JWT.
    { code: `localStorage.setItem('build', '1.2.3');` },
    { code: `localStorage.setItem('pkg', 'com.example.app');` },
  ],
  invalid: [
    // Bearer-credential keys — localStorage
    {
      code: `localStorage.setItem('jwt', token);`,
      errors: [
        { messageId: 'jwtInStorage', data: { key: 'jwt', storage: 'localStorage' } },
      ],
    },
    {
      code: `localStorage.setItem('token', authToken);`,
      errors: [
        { messageId: 'jwtInStorage', data: { key: 'token', storage: 'localStorage' } },
      ],
    },
    {
      code: `localStorage.setItem('accessToken', result.token);`,
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'accessToken', storage: 'localStorage' },
        },
      ],
    },
    {
      code: `localStorage.setItem('access_token', response.access_token);`,
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'access_token', storage: 'localStorage' },
        },
      ],
    },
    {
      code: `localStorage.setItem('refreshToken', refresh);`,
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'refreshToken', storage: 'localStorage' },
        },
      ],
    },
    {
      code: `localStorage.setItem('id_token', idToken);`,
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'id_token', storage: 'localStorage' },
        },
      ],
    },
    // Bearer-credential keys — sessionStorage
    {
      code: `sessionStorage.setItem('jwt', token);`,
      errors: [
        { messageId: 'jwtInStorage', data: { key: 'jwt', storage: 'sessionStorage' } },
      ],
    },
    {
      code: `sessionStorage.setItem('authToken', auth.token);`,
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'authToken', storage: 'sessionStorage' },
        },
      ],
    },
    // A key we cannot read at all, but the value proves itself.
    {
      code: `localStorage.setItem(k[0], 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');`,
      errors: [
        { messageId: 'jwtInStorage', data: { key: '<dynamic>', storage: 'localStorage' } },
      ],
    },
    // Value proof, innocuous key
    {
      code: `localStorage.setItem('data', '${EXAMPLE_JWT}');`,
      errors: [
        { messageId: 'jwtInStorage', data: { key: 'data', storage: 'localStorage' } },
      ],
    },
    // Direct assignment
    {
      code: `localStorage['token'] = jwt;`,
      errors: [
        { messageId: 'jwtInStorage', data: { key: 'token', storage: 'localStorage' } },
      ],
    },
    {
      code: `sessionStorage['accessToken'] = token;`,
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'accessToken', storage: 'sessionStorage' },
        },
      ],
    },
    {
      code: `localStorage.setItem('bearer', authBearer);`,
      errors: [
        { messageId: 'jwtInStorage', data: { key: 'bearer', storage: 'localStorage' } },
      ],
    },
    // Test file with allowInTests: false
    {
      code: `localStorage.setItem('jwt', token);`,
      filename: 'auth.test.ts',
      options: [{ allowInTests: false }],
      errors: [
        { messageId: 'jwtInStorage', data: { key: 'jwt', storage: 'localStorage' } },
      ],
    },
    // Unresolvable identifier key falls back to its spelling — the only
    // evidence left once the binding is unknowable.
    {
      code: `localStorage.setItem(accessToken, value);`,
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'accessToken', storage: 'localStorage' },
        },
      ],
    },
    {
      code: `localStorage.jwt = tokenValue;`,
      errors: [
        { messageId: 'jwtInStorage', data: { key: 'jwt', storage: 'localStorage' } },
      ],
    },
    {
      code: `sessionStorage.setItem(refreshToken, value);`,
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'refreshToken', storage: 'sessionStorage' },
        },
      ],
    },
    {
      code: `localStorage['userData'] = '${EXAMPLE_JWT}';`,
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'userData', storage: 'localStorage' },
        },
      ],
    },
  ],
});

/**
 * Regression lock — `window.localStorage` is `localStorage`.
 *
 * The rule matched only the bare identifier, so spelling the global out — the
 * form every no-implicit-globals lint rule asks for — hid the token entirely.
 */
ruleTester.run('lock: the global may be spelled out', noJwtInStorage, {
  valid: [
    // A wrapper that merely CONTAINS the word is not the global.
    { code: 'myLocalStorageWrapper.setItem("access_token", jwt);' },
    {
      code: 'const store = { localStorage: fake }; store.localStorage.setItem("access_token", jwt);',
    },
    // `top` and `parent` name a DIFFERENT window; reading storage off them is
    // a cross-origin access, not this sink.
    { code: 'top.localStorage.setItem("access_token", jwt);' },
    { code: 'parent.sessionStorage.setItem("access_token", jwt);' },
    // A computed read proves nothing about which global it lands on.
    { code: 'window[storageName].setItem("access_token", jwt);' },
  ],
  invalid: [
    {
      code: 'window.localStorage.setItem("access_token", jwt);',
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'access_token', storage: 'localStorage' },
        },
      ],
    },
    {
      code: 'globalThis.localStorage.setItem("refresh_token", jwt);',
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'refresh_token', storage: 'localStorage' },
        },
      ],
    },
    {
      code: 'self.sessionStorage.setItem("id_token", jwt);',
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'id_token', storage: 'sessionStorage' },
        },
      ],
    },
    {
      code: 'window.localStorage.authToken = jwt;',
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'authToken', storage: 'localStorage' },
        },
      ],
    },
    {
      code: 'globalThis.sessionStorage["jwt"] = value;',
      errors: [
        { messageId: 'jwtInStorage', data: { key: 'jwt', storage: 'sessionStorage' } },
      ],
    },
  ],
});

/**
 * Regression lock — the sink reached by a computed key or optional chaining.
 *
 * `storage['setItem'](…)` is the same call as `storage.setItem(…)`, and
 * `window.localStorage?.setItem(…)` is what a defensive SSR-safe wrapper
 * actually writes. Both were invisible.
 */
ruleTester.run('lock: computed and optional-chained sinks', noJwtInStorage, {
  valid: [
    // A computed method name that is not `setItem`.
    { code: `localStorage['getItem']('access_token');` },
    // A computed method name we cannot read.
    { code: `localStorage[method]('access_token', jwt);` },
  ],
  invalid: [
    {
      code: `localStorage['setItem']('refresh_token', t);`,
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'refresh_token', storage: 'localStorage' },
        },
      ],
    },
    {
      code: `window.localStorage?.setItem('access_token', t);`,
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'access_token', storage: 'localStorage' },
        },
      ],
    },
    {
      code: `sessionStorage?.['setItem']('jwt', t);`,
      errors: [
        { messageId: 'jwtInStorage', data: { key: 'jwt', storage: 'sessionStorage' } },
      ],
    },
  ],
});

/**
 * Regression lock — a JWT is PROVEN, not spelled.
 *
 * The old value test was `/^eyJ…\.eyJ…\..+$/`. This one base64url-decodes the
 * header and requires an `alg` claim, so a dotted version string is not a JWT
 * and a JWT whose header is not `{"alg"…}`-first still is.
 */
ruleTester.run('lock: JWT value evidence', noJwtInStorage, {
  valid: [
    { code: `localStorage.setItem('v', '1.2.3');` },
    { code: `localStorage.setItem('path', 'a.b.c');` },
    // Three base64url segments whose header is valid JSON but not a JOSE header.
    { code: `localStorage.setItem('x', 'eyJhIjoxfQAA.eyJhIjoxfQ.sig');` },
  ],
  invalid: [
    // A JWT whose header does not start with "alg" — the old prefix regex still
    // caught this one, but only because every JSON object starts `eyJ`.
    {
      code: `localStorage.setItem('x', 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhIjoxfQ.sig');`,
      errors: [
        { messageId: 'jwtInStorage', data: { key: 'x', storage: 'localStorage' } },
      ],
    },
    // Resolved through a binding.
    {
      code: `
        const value = '${EXAMPLE_JWT}';
        localStorage.setItem('x', value);
      `,
      errors: [
        { messageId: 'jwtInStorage', data: { key: 'x', storage: 'localStorage' } },
      ],
    },
    // Expression-free template.
    {
      code: `localStorage.setItem('x', \`${EXAMPLE_JWT}\`);`,
      errors: [
        { messageId: 'jwtInStorage', data: { key: 'x', storage: 'localStorage' } },
      ],
    },
    // A call into a module that mints JWTs.
    {
      code: `
        import jwt from 'jsonwebtoken';
        localStorage.setItem('x', jwt.sign(claims, key));
      `,
      errors: [
        { messageId: 'jwtInStorage', data: { key: 'x', storage: 'localStorage' } },
      ],
    },
  ],
});

/**
 * FN lock — detection must not die when the identifiers are renamed.
 *
 * The false-negative direction: take genuinely vulnerable code and give every
 * variable an innocuous name. The KEY is the evidence, and it is still there.
 */
ruleTester.run('lock: renaming the variables changes nothing', noJwtInStorage, {
  valid: [
    // KNOWN LIMITATION, locked so it cannot regress silently: when the key
    // itself arrives as a parameter, the rule has no string to judge and
    // abstains. Inter-procedural key flow is a different instrument.
    {
      code: `
        function persist(a, b) { localStorage.setItem(a, b); }
        persist('access_token', response.data.value);
      `,
    },
  ],
  invalid: [
    {
      code: `
        const q = await fetch('/login');
        const z = await q.json();
        localStorage.setItem('access_token', z.value);
      `,
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'access_token', storage: 'localStorage' },
        },
      ],
    },
    {
      code: `
        const k = 'refresh_token';
        localStorage.setItem(k, value);
      `,
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'refresh_token', storage: 'localStorage' },
        },
      ],
    },
  ],
});

/**
 * ADVERSARIAL WAVE — the four shapes that took this rule from 100% to 77.8%
 * recall on `benchmarks/rule-corpus/browser-security__no-jwt-in-storage`, plus
 * the one false positive the same wave produced.
 *
 * Each is a real front-end idiom, not a puzzle: a resolved method name, a
 * namespaced key, a concatenated key, and the SSR-safety destructure.
 */
ruleTester.run('lock: adversarial wave', noJwtInStorage, {
  valid: [
    // The FP the wave found. `localStorage` here is a PARAMETER holding a test
    // double, not the browser global. Scope analysis is the only thing that can
    // tell those apart; the spelling cannot.
    {
      code: `export function seed(localStorage) { localStorage.setItem('access_token', 'fake'); }`,
    },
    // A method whose name merely CONTAINS setItem.
    { code: `localStorage.unsetItem('access_token');` },
    { code: `localStorage.setItemIfAbsent('access_token', t);` },
    // A destructure off something that is not the global object.
    {
      code: `const { localStorage: store } = fakeWindow; store.setItem('access_token', t);`,
    },
    // A destructure whose PARAMETER pattern is not a variable declaration.
    {
      code: `export function seed({ localStorage }) { localStorage.setItem('access_token', t); }`,
    },
    // A quoted key and a rest element in the destructure — neither binds the
    // global to a name we can prove.
    {
      code: `const { 'localStorage': store, ...rest } = window; store.setItem('access_token', t);`,
    },
    // A nested destructure: the property value is a pattern, not an identifier.
    {
      code: `const { localStorage: { x } } = window; x.setItem('access_token', t);`,
    },
    // A destructure that names a DIFFERENT global.
    {
      code: `const { crypto: store } = window; store.setItem('access_token', t);`,
    },
    // A plain (non-destructuring) local binding named after the global.
    { code: `const localStorage = fakeStore; localStorage.setItem('access_token', t);` },
    // A composed key behind a binding that resolves to nothing.
    { code: `const K = a() + b(); localStorage.setItem(K, t);` },
    // Both sides of a concatenated key are unresolvable.
    { code: `localStorage.setItem(prefix() + suffix(), t);` },
    // A method binding that does not resolve to a string.
    {
      code: `const WRITE = compute(); localStorage[WRITE]('access_token', t);`,
    },
  ],
  invalid: [
    // 1. The METHOD name arrives through a binding.
    {
      code: `const WRITE = 'setItem'; localStorage[WRITE]('access_token', token);`,
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'access_token', storage: 'localStorage' },
        },
      ],
    },
    // 2. A namespaced key built with a template literal — the multi-tenant idiom.
    {
      code: 'localStorage.setItem(`${tenantId}:access_token`, token);',
      errors: [{ messageId: 'jwtInStorage' }],
    },
    // A key with an interpolated middle span on both sides of the evidence.
    {
      code: `localStorage.setItem('user.' + id + '.access_token', t);`,
      errors: [{ messageId: 'jwtInStorage' }],
    },
    // A COMPOSED key behind a binding: the const holds a template or a
    // concatenation, not a literal, so the one-hop literal resolver alone
    // cannot see through it.
    {
      code: 'const K = `${tenantId}:access_token`; localStorage.setItem(K, t);',
      errors: [{ messageId: 'jwtInStorage' }],
    },
    {
      code: `const K = 'app.' + 'refresh_token'; localStorage.setItem(K, t);`,
      errors: [{ messageId: 'jwtInStorage' }],
    },
    // The unresolvable span comes LAST.
    {
      code: `localStorage.setItem('access_token_' + userId(), t);`,
      errors: [{ messageId: 'jwtInStorage' }],
    },
    // The unresolvable span comes FIRST.
    {
      code: `localStorage.setItem(userId() + '_access_token', t);`,
      errors: [{ messageId: 'jwtInStorage' }],
    },
    // 3. A key built by concatenation.
    {
      code: `const PREFIX = 'app.'; localStorage.setItem(PREFIX + 'refresh_token', token);`,
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'app.refresh_token', storage: 'localStorage' },
        },
      ],
    },
    // 4. The SSR-safety destructure. The binding IS the global.
    {
      code: `const { localStorage: store } = window; store.setItem('id_token', token);`,
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'id_token', storage: 'localStorage' },
        },
      ],
    },
    {
      code: `const { sessionStorage } = globalThis; sessionStorage.setItem('jwt', t);`,
      errors: [
        {
          messageId: 'jwtInStorage',
          data: { key: 'jwt', storage: 'sessionStorage' },
        },
      ],
    },
  ],
});

/**
 * The vocabulary is the caller's, with an explicit default — see the matching
 * lock in `no-cookie-auth-tokens`. The value path (`hasProvableJwtValue`) is
 * independent of the list and keeps reporting either way.
 */
ruleTester.run('lock: bearerPatterns replaces the default vocabulary', noJwtInStorage, {
  valid: [
    {
      code: `localStorage.setItem('access_token', t);`,
      options: [{ bearerPatterns: ['handle'] }],
    },
  ],
  invalid: [
    {
      code: `localStorage.setItem('handle', h);`,
      options: [{ bearerPatterns: ['handle'] }],
      errors: [{ messageId: 'jwtInStorage' }],
    },
    {
      code: `localStorage.setItem('access_token', t);`,
      errors: [{ messageId: 'jwtInStorage' }],
    },
  ],
});
