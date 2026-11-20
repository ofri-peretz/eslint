/**
 * A security value is named by the slot it lands in, not only by a variable.
 *
 * Measured by reading framework docs (results tracked privately): the rule stayed
 * silent on a CSRF header built from `Math.random()` (`headers.set('X-SRF-TOKEN',
 * Math.random()…)`) and on an OAuth `state` built the same way. Both are
 * CWE-338. In the first the security meaning is carried by a string literal in
 * the call, not by any identifier; in the second by the OAuth request the value
 * ends up in, and `state` is far too ordinary a name to count on its own.
 *
 * Every report below has a lookalike that must stay quiet: UI state, shuffles,
 * jitter, colours, DOM keys, correlation ids.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMathRandomCrypto } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const weak = [{ messageId: 'mathRandomCrypto' as const }];

ruleTester.run(
  'no-math-random-crypto: security values named by their slot',
  noMathRandomCrypto,
  {
    valid: [
      // ---- OAuth `state` is a word, not a verdict ----
      {
        name: 'a boolean called state',
        code: 'const state = Math.random() > 0.5;',
      },
      {
        name: 'UI state seeded with a draw, never sent anywhere',
        code: `const state = Math.random().toString(36).slice(2);
          setState(state);`,
      },
      {
        name: 'an object called state, rendered',
        code: `const state = Math.random();
          render({ state });`,
      },
      {
        name: 'a state= in a URL that is not an OAuth request still needs the draw to be state',
        code: `const page = Math.floor(Math.random() * 10);
          const url = base + '?state=open&page=' + page;`,
      },
      {
        name: 'a class field called state',
        code: 'this.state = { n: Math.random() };',
      },
      // ---- slots whose name is not a security value ----
      {
        name: 'a correlation header',
        code: "headers.set('X-Request-Id', Math.random().toString(36).slice(2));",
      },
      {
        name: 'retry jitter in a header',
        code: "res.setHeader('Retry-After', String(Math.round(Math.random() * 5)));",
      },
      {
        name: 'the draw is the NAME of the entry, not the value',
        code: "cache.set(Math.random(), 'token');",
      },
      {
        name: 'a count of tokens is a number, not a token',
        code: "stats.set('token-count', Math.floor(Math.random() * 100));",
      },
      {
        name: 'a theme cookie',
        code: "res.cookie('theme', Math.random() > 0.5 ? 'dark' : 'light');",
      },
      {
        name: 'an object key that is only an attribute name',
        code: "const attrs = { 'data-index': Math.random() };",
      },
      // ---- UI randomness ----
      {
        name: 'a shuffle by comparator',
        code: 'const shuffled = items.sort(() => Math.random() - 0.5);',
      },
      {
        name: 'a shuffle whose result is called keys',
        code: 'const shuffledKeys = keys.sort(() => Math.random() - 0.5);',
      },
      {
        name: 'a toSorted shuffle with a function expression',
        code: 'const tokens = list.toSorted(function () { return Math.random() - 0.5; });',
      },
      {
        name: 'a random colour',
        code: "const colorKey = '#' + Math.random().toString(16).slice(2, 8);",
      },
      {
        name: 'a DOM key for a list row',
        code: "const domKey = 'row-' + Math.random().toString(36).slice(2);",
      },
      {
        name: 'a React list item key',
        code: 'const itemKey = `item-${Math.random().toString(36).slice(2)}`;',
      },
      {
        name: 'backoff jitter in a variable named after auth',
        code: 'const authBackoff = 200 * 2 ** attempt + Math.random() * 100;',
      },
      {
        name: 'a state after a non-matching left operand',
        code: `const state = Math.random().toString(36);
          const label = prefix + state;`,
      },
      {
        name: 'a state after a numeric literal',
        code: `const state = Math.random().toString(36);
          const label = 5 + state;`,
      },
      {
        name: 'a slot named by a variable cannot be judged',
        code: 'headers.set(headerName, Math.random().toString(36));',
      },
      {
        name: 'a state parameter on a receiver that is not named like query params',
        code: "getEntries().set('state', Math.random().toString(36));",
      },
      {
        name: 'a computed key cannot name a slot',
        code: 'const o = { [dynamicKey]: Math.random() };',
      },
    ],
    invalid: [
      // ---- the slot is a string literal in the call ----
      {
        name: 'a CSRF header built with headers.set',
        code: "headers.set('X-SRF-TOKEN', Math.random().toString(36).replace('0.', ''));",
        errors: weak,
      },
      {
        name: 'a CSRF header built with setHeader',
        code: "res.setHeader('X-CSRF-Token', Math.random().toString(36).slice(2));",
        errors: weak,
      },
      {
        name: 'a session cookie value',
        code: "res.cookie('session', Math.random().toString(36));",
        errors: weak,
      },
      {
        name: 'a token written to storage',
        code: "localStorage.setItem('authToken', String(Math.random()));",
        errors: weak,
      },
      {
        name: 'a nonce query parameter',
        code: "url.searchParams.set('nonce', Math.random().toString(36).slice(2));",
        errors: weak,
      },
      {
        name: 'a state query parameter',
        code: "url.searchParams.append('state', Math.random().toString(36).slice(2));",
        errors: weak,
      },
      {
        name: 'an object key spelled as a string',
        code: "const headers = { 'X-CSRF-Token': Math.random().toString(36) };",
        errors: weak,
      },
      // ---- OAuth state, by where the value goes ----
      {
        name: 'state interpolated into an authorize URL',
        code: `const state = Math.random().toString(36).slice(2);
          const url = \`\${authorizeUrl}?client_id=\${id}&state=\${state}\`;`,
        errors: weak,
      },
      {
        name: 'state concatenated onto an authorize URL',
        code: `const state = Math.random().toString(36);
          const url = base + '&state=' + state;`,
        errors: weak,
      },
      {
        name: 'state wrapped in encodeURIComponent',
        code: `const state = Math.random().toString(36);
          const url = base + '&state=' + encodeURIComponent(state);`,
        errors: weak,
      },
      {
        name: 'state set on the query params',
        code: `const state = Math.random().toString(36);
          params.set('state', state);`,
        errors: weak,
      },
      {
        name: 'state in an object that looks like an authorize request',
        code: `const state = Math.random().toString(36);
          const query = { client_id: id, redirect_uri: redirect, response_type: 'code', state };`,
        errors: weak,
      },
      {
        name: 'state drawn inline in an authorize request',
        code: `const query = { clientId: id, redirectUri: redirect, scope: 'openid', state: Math.random().toString(36) };`,
        errors: weak,
      },
      {
        name: 'state after a template literal ending in state=',
        code: `const state = Math.random().toString(36);
          const url = base + \`&state=\` + state;`,
        errors: weak,
      },
      {
        name: 'a spread beside the authorize-request members',
        code: `const q = { ...base, client_id: id, state: Math.random().toString(36) };`,
        errors: weak,
      },
    ],
  },
);
