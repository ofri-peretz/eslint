/**
 * Tests for no-unsafe-eval-csp rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnsafeEvalCsp } from './index';
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

ruleTester.run('no-unsafe-eval-csp', noUnsafeEvalCsp, {
  valid: [
    // Safe CSP without unsafe-eval
    { code: `const csp = "script-src 'self'";` },
    // With nonce
    { code: `const csp = "script-src 'self' 'nonce-abc123'";` },
    // No CSP content
    { code: `const message = "Some text";` },
    // Test files allowed
    { code: `const csp = "script-src 'unsafe-eval'";`, filename: 'csp.test.ts' },
  ],
  invalid: [
    // String literal with unsafe-eval
    {
      code: `const csp = "script-src 'unsafe-eval'";`,
      errors: [{ messageId: 'unsafeEval' }],
    },
    // Multiple directives
    {
      code: `const csp = "default-src 'self'; script-src 'unsafe-eval' 'self'";`,
      errors: [{ messageId: 'unsafeEval' }],
    },
    // Template literal
    {
      code: `const csp = \`script-src 'unsafe-eval'\`;`,
      errors: [{ messageId: 'unsafeEval' }],
    },
    // Combined with unsafe-inline
    {
      code: `const csp = "script-src 'unsafe-inline' 'unsafe-eval'";`,
      errors: [{ messageId: 'unsafeEval' }],
    },
    // Response header
    {
      code: `res.setHeader('Content-Security-Policy', "script-src 'unsafe-eval'");`,
      errors: [{ messageId: 'unsafeEval' }],
    },
    // Test file with allowInTests: false
    {
      code: `const csp = "script-src 'unsafe-eval'";`,
      filename: 'csp.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'unsafeEval' }],
    },
  ],
});

/**
 * Regression lock — the matcher must not carry state between calls.
 *
 * `/'unsafe-eval'/gi` was a MODULE-LEVEL regex used with `.test()`. The `/g`
 * flag makes `lastIndex` survive every call, so the search for the second
 * policy started wherever the first one ended: four identical unsafe policies
 * in one file produced two reports, and — because ESLint lints a whole project
 * through one Linter — a short policy linted after a longer one produced none
 * at all. Every case below FAILS on the unfixed rule.
 */
ruleTester.run('lock: every occurrence is reported, not every other one', noUnsafeEvalCsp, {
  valid: [],
  invalid: [
    {
      code: [
        `const a = "script-src 'unsafe-eval'";`,
        `const b = "worker-src 'unsafe-eval'";`,
        `const c = "style-src 'unsafe-eval'";`,
        `const d = "font-src 'unsafe-eval'";`,
      ].join('\n'),
      errors: [
        { messageId: 'unsafeEval' },
        { messageId: 'unsafeEval' },
        { messageId: 'unsafeEval' },
        { messageId: 'unsafeEval' },
      ],
    },
    // A long policy followed by a short one: the short match sits BEFORE the
    // offset the long one left behind.
    {
      code: [
        `const long = "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-eval'";`,
        `const short = "script-src 'unsafe-eval'";`,
      ].join('\n'),
      errors: [{ messageId: 'unsafeEval' }, { messageId: 'unsafeEval' }],
    },
  ],
});

/**
 * Regression lock — a policy is a GRAMMAR, not a printed token.
 *
 * Every CSP builder in the wild authors sources as bare keywords and adds the
 * apostrophes on serialisation, so the shipped header says
 * `script-src 'self' 'unsafe-eval'` while the source file contains that token
 * nowhere. Matching the printed form missed all of them.
 */
ruleTester.run('lock: bare source keywords in a directive source list', noUnsafeEvalCsp, {
  valid: [
    // The serialiser's VOCABULARY table grants nothing — it is the list of
    // names that need quoting, not a policy. Reporting it made the fix for the
    // finding itself a finding.
    {
      code: `const KEYWORDS = new Set(['self', 'none', 'unsafe-eval', 'unsafe-inline']);`,
    },
    // A bare keyword outside any source list is just a string.
    { code: `const mode = 'unsafe-eval';` },
  ],
  invalid: [
    // Helmet's directives object, camelCase, bare sources.
    {
      code: `app.use(helmet.contentSecurityPolicy({ directives: { scriptSrc: ['self', 'unsafe-eval'] } }));`,
      errors: [{ messageId: 'unsafeEval' }],
    },
    // The same in kebab-case, as a quoted property key.
    {
      code: `const directives = { 'script-src': ['self', 'unsafe-eval'] };`,
      errors: [{ messageId: 'unsafeEval' }],
    },
    // Already-quoted sources in a directive source list.
    {
      code: `const directives = { scriptSrc: ["'self'", "'unsafe-eval'"] };`,
      errors: [{ messageId: 'unsafeEval' }],
    },
    // A source array spliced into a template literal right after the
    // directive name it belongs to.
    {
      code: [
        `const sources = ["'self'", "'unsafe-eval'"];`,
        `const csp = \`default-src 'self'; script-src \${sources.join(' ')}\`;`,
      ].join('\n'),
      errors: [{ messageId: 'unsafeEval' }],
    },
  ],
});

/**
 * Regression lock — naming the directive is not granting it.
 *
 * The strongest anti-eval code in a repo is the build guard that refuses to
 * ship the directive, and it necessarily spells it out. So does a docs page.
 * Both were CVSS 8.1 findings.
 */
ruleTester.run('lock: prose about a directive is not a policy', noUnsafeEvalCsp, {
  valid: [
    {
      code: `if (policy.includes("'unsafe-eval'")) throw new Error("Refusing a policy containing 'unsafe-eval'.");`,
    },
    { code: `const faq = { q: "Why did you remove 'unsafe-eval' from our CSP?" };` },
    // 'wasm-unsafe-eval' is its OWN keyword and the recommended narrow
    // remediation for WebAssembly. Matching loosely turns the fix into a
    // finding.
    {
      code: `const csp = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'";`,
    },
  ],
  invalid: [
    // The counter-control: the same words, arranged as an actual policy.
    {
      code: `const csp = "script-src 'self' 'unsafe-eval'";`,
      errors: [{ messageId: 'unsafeEval' }],
    },
  ],
});

/** Edge shapes the policy grammar and the source-list proof must survive. */
ruleTester.run('edge shapes', noUnsafeEvalCsp, {
  valid: [
    // Not a string.
    { code: `const n = 42;` },
    // Empty and whitespace-only segments.
    { code: `const c = ';;  ;';` },
    // A directive name with no sources.
    { code: `const c = 'upgrade-insecure-requests';` },
    // A segment whose first token is not a directive name.
    { code: `const c = 'hello world; goodbye world';` },
    // An array element that is the keyword but sits in no source list.
    { code: `const a = ['unsafe-eval'];` },
    // An element of an array owned by a call, not a directive property.
    { code: `const s = new Set(['self', 'unsafe-eval']);` },
    // An element whose owning property key is computed.
    { code: `const d = { [k]: ["'unsafe-eval'"] };` },
    // An element whose owning property key is neither a directive name nor a
    // recognisable key at all.
    { code: `const d = { sources: ["'unsafe-eval'"] };` },
    { code: `const d = { 42: ["'unsafe-eval'"] };` },
    { code: `const d = { [1 + 1]: ["'unsafe-eval'"] };` },
    // A destructuring pattern, not a source list.
    { code: `const [x = "'unsafe-eval'"] = list;` },
    // Bound to a name that is never spliced after a directive.
    { code: `const s = ["'unsafe-eval'"]; use(s.join(' '));` },
    // Spliced into a template, but not after a directive name.
    {
      code: 'const s = ["\'unsafe-eval\'"]; const t = `allowed: ${s.join(" ")}`;',
    },
    // Spliced after an EMPTY quasi.
    { code: 'const s = ["\'unsafe-eval\'"]; const t = `${s.join(" ")}`;' },
    // A reference that precedes the declaration cannot be its splice site.
    { code: 'const t = `script-src ${later}`; const later = ["\'unsafe-eval\'"];' },
    // A quoted-but-unknown source expression.
    { code: `const d = { scriptSrc: ["'made-up-keyword'"] };` },
    // The lone apostrophe is not a quoted keyword.
    { code: `const d = { scriptSrc: ["'"] };` },
  ],
  invalid: [
    // A directive name in the camelCase spelling, as Helmet takes it.
    {
      code: `const d = { 'script-src-elem': ['self', 'unsafe-eval'] };`,
      errors: [{ messageId: 'unsafeEval' }],
    },
    // Directive names are case-insensitive.
    {
      code: `const c = "DEFAULT-SRC 'self'; SCRIPT-SRC 'UNSAFE-EVAL'";`,
      errors: [{ messageId: 'unsafeEval' }],
    },
    // A template whose interpolation sits between two static chunks.
    {
      code: 'const c = `script-src ${host} \'unsafe-eval\'`;',
      errors: [{ messageId: 'unsafeEval' }],
    },
  ],
});
