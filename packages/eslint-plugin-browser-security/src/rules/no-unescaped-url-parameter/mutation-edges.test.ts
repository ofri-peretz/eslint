/**
 * Fixtures implied by surviving Stryker mutants (docs/MUTATION_TESTING.md).
 *
 * Each case pins a branch no other fixture told apart from its mutant. The
 * `FN:` cases are wrong verdicts the triage found: they fail on the rule as it
 * was before this file.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnescapedUrlParameter } from './index';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const ERROR = [{ messageId: 'unescapedUrlParameter' as const }];
const API = 'https://a.example.com/v1/s';

ruleTester.run(
  'no-unescaped-url-parameter — mutation edges',
  noUnescapedUrlParameter,
  {
    valid: [
      // ── trustedLibraries ─────────────────────────────────────────────────
      {
        name: 'a call into a default-trusted module is that library’s responsibility',
        code: `import { unescape } from 'querystring'; const u = \`${API}?q=\${unescape(location.hash)}\`;`,
      },
      {
        name: 'a node: specifier names the same trusted module',
        code: `import { unescape } from 'node:querystring'; const u = \`${API}?q=\${unescape(location.hash)}\`;`,
      },
      // ── URL sinks ────────────────────────────────────────────────────────
      {
        name: 'a relative URL handed to an unknown global function is not a sink',
        code: 'send(`/api/s?q=${location.hash}`);',
      },
      {
        name: 'a relative URL handed to an unknown constructor is not a URL',
        code: 'new Route(`/api/s?q=${location.hash}`);',
      },
      {
        name: 'a relative URL bound to a name that only reaches a logger is not a URL',
        code: 'const path = `/api/s?q=${location.hash}`; log(path);',
      },
      // ── what the holes carry ─────────────────────────────────────────────
      {
        name: 'a unary-plus operand in a URL chain is one numeric hole',
        code: `const u = '${API}?page=' + +location.hash;`,
      },
      {
        name: 'a comparison operand in a URL chain is a boolean, not its operands',
        code: `const u = '${API}?m=' + (location.hash === '#x');`,
      },
      {
        name: 'a comparison involving inbound text is a boolean',
        code: `const u = \`${API}?m=\${location.hash === '#x'}\`;`,
      },
      {
        name: 'a concatenation of constants is not inbound text',
        code: `const SUFFIX = 'v'; const u = \`${API}?q=\${'x' + SUFFIX}\`;`,
      },
      {
        name: 'a module-private option with a constant fallback is not inbound text',
        code: `function f(opts) { return \`${API}?lang=\${opts.lang || 'en'}\`; }`,
      },
      {
        name: 'a ternary between constants is not inbound text',
        code: `function f(flag) { return \`${API}?o=\${flag ? 'asc' : 'desc'}\`; }`,
      },
      {
        name: 'a non-text property of a DOM element is not user text',
        code: `const el = document.getElementById('q'); const u = \`${API}?id=\${el.id}\`;`,
      },
      {
        name: 'the target of an event object that is not a handler parameter is not a DOM element',
        code: `const ev = getEvent(); const u = \`${API}?q=\${ev.target.value}\`;`,
      },
      {
        name: 'a callback to a plain function is not an event handler',
        code: `subscribe((e) => \`${API}?q=\${e.target.value}\`);`,
      },
      {
        name: 'a callback to a non-listener method is not an event handler',
        code: `items.forEach((e) => \`${API}?q=\${e.target.value}\`);`,
      },
      {
        name: 'a function assigned to a plain variable is not installed as a handler',
        code: `let handler; handler = (e) => \`${API}?q=\${e.target.value}\`;`,
      },
      {
        name: 'a custom event detail is not the event target',
        code: `window.addEventListener('search', (e) => \`${API}?q=\${e.detail.value}\`);`,
      },
      {
        name: 'a .current on a ref from an unknown factory is not a DOM element',
        code: `const r = makeRef(); const u = \`${API}?q=\${r.current.value}\`;`,
      },
      {
        name: 'a get() on a module-private parameter is not a FormData read',
        code: `function s(form) { return \`${API}?q=\${form.get('q')}\`; }`,
      },
      {
        name: 'a configured global with no declaration is not a parameter',
        code: `const u = \`${API}?q=\${someGlobal}\`;`,
        languageOptions: { globals: { someGlobal: 'readonly' } },
      },
      {
        name: 'an exported parameter typed as a single string literal is closed',
        code: `export function s(dir: 'asc') { return \`${API}?o=\${dir}\`; }`,
      },
    ],
    invalid: [
      {
        name: 'a test file is still linted by default',
        code: `const u = \`${API}?q=\${location.hash}\`;`,
        filename: 'src/search.test.ts',
        errors: ERROR,
      },
      {
        name: 'a configured browser global fetch is still the global',
        code: 'fetch(`/api/s?q=${location.hash}`);',
        languageOptions: { globals: { fetch: 'readonly' } },
        errors: ERROR,
      },
      {
        name: 'a configured browser global document is still the global',
        code: `const u = \`${API}?q=\${document.getElementById('q').value}\`;`,
        languageOptions: { globals: { document: 'readonly' } },
        errors: ERROR,
      },
      {
        name: 'a three-piece URL chain is reported once, from its outermost node',
        code: `const u = '${API}?q=' + location.hash + '&page=1';`,
        errors: ERROR,
      },
      {
        name: 'a URL template inside a + chain is reported once',
        code: `const u = \`${API}?q=\${location.hash}\` + '&page=1';`,
        errors: ERROR,
      },
      {
        name: 'an absolute URL template compared with === is still checked',
        code: `if (current === \`${API}?q=\${location.hash}\`) go();`,
        errors: ERROR,
      },
      {
        name: 'a protocol-relative URL is absolute wherever it is written',
        code: 'const src = `//cdn.example.com/s?q=${location.hash}`;',
        errors: ERROR,
      },
      {
        name: 'an interpolation in the path is an encoding position',
        code: 'const u = `https://api.example.com/users/${location.hash}`;',
        errors: ERROR,
      },
      {
        name: 'a query straight after the host is an encoding position',
        code: 'const u = `https://api.example.com?q=${location.hash}`;',
        errors: ERROR,
      },
      {
        name: 'a fragment straight after the host is an encoding position',
        code: 'const u = `https://api.example.com#${location.hash}`;',
        errors: ERROR,
      },
      {
        name: 'a URL chain with a numeric piece is still text',
        code: `const u = '${API}?page=' + 1 + '&q=' + location.hash;`,
        errors: ERROR,
      },
      {
        name: 'a URL template plus a number is still text',
        code: `const u = \`${API}?page=\${p}\` + 1 + '&q=' + location.hash;`,
        errors: ERROR,
      },
      {
        name: 'a template that interpolates one inbound value carries it',
        code: `const VERSION = '1'; const tag = \`\${location.hash}-\${VERSION}\`; const u = \`${API}?t=\${tag}\`;`,
        errors: ERROR,
      },
      {
        name: 'satisfies is syntax, not a value change',
        code: `const u = \`${API}?q=\${location.hash satisfies string}\`;`,
        errors: ERROR,
      },
      {
        name: 'a JSX input handler reads the typed value',
        code: `const C = () => <input onInput={(e) => fetch(\`/api/s?q=\${e.target.value}\`)} />;`,
        errors: ERROR,
      },
      {
        name: 'a handler installed by a member write reads the typed value',
        code: `el.oninput = (e) => fetch(\`/api/s?q=\${e.target.value}\`);`,
        errors: ERROR,
      },
      {
        name: 'a parameter of a default-exported function is unknowable',
        code: `export default function (q) { return \`${API}?q=\${q}\`; }`,
        errors: ERROR,
      },
      {
        name: 'a parameter of an exported class method is unknowable',
        code: `export class Api { build(q) { return \`${API}?q=\${q}\`; } }`,
        errors: ERROR,
      },
      {
        name: 'a template-literal type has a hole in it',
        code: `export function s(id: \`id-\${string}\`) { return \`${API}?q=\${id}\`; }`,
        errors: ERROR,
      },
      {
        name: 'a union with an open member is open',
        code: `export function s(dir: 'asc' | string) { return \`${API}?o=\${dir}\`; }`,
        errors: ERROR,
      },
      {
        // @found mutation testing
        name: 'FN: a path-relative URL without a leading slash is a URL at fetch',
        code: 'fetch(`api/s?q=${location.hash}`);',
        errors: ERROR,
      },
    ],
  },
);
