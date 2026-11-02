/**
 * Fixtures implied by surviving Stryker mutants (docs/MUTATION_TESTING.md).
 *
 * Each case pins a branch no other fixture told apart from its mutant. The
 * `FP:` cases are wrong verdicts the triage found: they fail on the rule as it
 * was before this file.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { noMissingCorsCheck } from './index';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const missing = [{ messageId: 'missingCorsCheck' as const }];
const REFLECT =
  "res.setHeader('Access-Control-Allow-Origin', req.headers.origin)";

ruleTester.run('no-missing-cors-check — mutation edges', noMissingCorsCheck, {
  valid: [
    {
      name: 'a wildcard origin handed to a non-CORS call is not a CORS finding',
      code: "io.configure({ origin: '*' });",
    },
    {
      name: 'a cors from another module is not the cors package, for the wildcard either',
      code: "import cors from './my-cors'; app.use(cors({ origin: '*' }));",
    },
    {
      name: 'any one trusted library silences the wildcard',
      code: "app.use(cors({ origin: '*' }));",
      options: [{ trustedLibraries: ['koa', 'cors'] }],
    },
    {
      name: 'a header call with no value sets nothing',
      code: "res.setHeader('Access-Control-Allow-Origin');",
    },
    {
      name: 'a header named at runtime is not judged',
      code: 'res.setHeader(headerName, headerValue);',
    },
    // @found Stryker mutation-survivor triage, 2026-11-02: every `'*'` inside
    // a call whose text mentioned `cors(` was reported as a wildcard ORIGIN.
    {
      // @found mutation testing
      name: 'FP: a wildcard under a non-origin cors option is not an origin finding',
      code: "app.use(cors({ origin: allowedOrigins, methods: '*' }));",
    },
    {
      // @found mutation testing
      name: 'FP: a wildcard argument beside a cors() middleware is not its origin',
      code: "app.use(cors({ origin: allowedOrigins }), serveStatic('*'));",
    },
    {
      name: 'a reflected origin behind a ternary is validated',
      code: `app.use((req, res) => allowed.has(req.headers.origin) ? ${REFLECT} : null);`,
    },
    {
      name: 'a reflected origin behind a short-circuit is validated',
      code: `app.use((req, res) => { allowed.has(req.headers.origin) && ${REFLECT}; });`,
    },
    {
      name: 'a wildcard header in a test file is skipped under allowInTests',
      code: "res.setHeader('Access-Control-Allow-Origin', '*');",
      filename: 'server.test.ts',
      options: [{ allowInTests: true }],
    },
    {
      // @found mutation testing
      name: 'FP: a trusted library silences a wildcard origin outside app.use too',
      code: "export const mw = cors({ origin: '*' });",
      options: [{ trustedLibraries: ['cors'] }],
    },
    {
      // @found mutation testing
      name: 'FP: a header whose name only contains Access-Control-Allow-Origin is not the CORS header',
      code: "res.setHeader('X-Access-Control-Allow-Origin-Note', '*');",
    },
  ],
  invalid: [
    {
      name: 'an invalid ignore pattern ignores nothing',
      code: "app.use(cors({ origin: '*' }));",
      options: [{ ignorePatterns: ['['] }],
      errors: missing,
    },
    {
      name: 'a wildcard handed to cors() as the whole argument',
      code: "app.use(cors('*'));",
      errors: missing,
    },
    {
      name: 'a wildcard under a runtime-chosen key may be the origin',
      code: "app.use(cors({ [k]: '*' }));",
      errors: missing,
    },
    {
      name: 'a wildcard under a non-origin key of options with no origin is a missing origin',
      code: "const c = cors({ methods: '*' });",
      errors: missing,
    },
    {
      // @found mutation testing
      name: 'FN: a bound config is resolved from an expression-bodied arrow too',
      code: "const corsOpts = { origin: '*' };\nconst setup = (app) => app.use(cors(corsOpts));",
      errors: missing,
    },
    {
      name: 'a test file is still linted by default',
      code: "res.setHeader('Access-Control-Allow-Origin', '*');",
      filename: 'server.test.ts',
      errors: missing,
    },
    {
      name: 'an inline wildcard origin is reported where it is written',
      code: "app.use(cors({ origin: '*' }));",
      errors: [{ messageId: 'missingCorsCheck', column: 24 }],
    },
    {
      name: 'a check outside the arrow handler does not guard its reflection',
      code: `if (enabled) { app.use((req, res) => { ${REFLECT}; }); }`,
      errors: missing,
    },
    {
      name: 'a check outside a function-expression handler does not guard its reflection',
      code: `if (enabled) { app.use(function (req, res) { ${REFLECT}; }); }`,
      errors: missing,
    },
    {
      name: 'a check outside a declared handler does not guard its reflection',
      code: `if (enabled) { function handle(req, res) { ${REFLECT}; } }`,
      errors: missing,
    },
    {
      name: 'the bracketed setter sets the same wildcard header',
      code: "res['setHeader']('Access-Control-Allow-Origin', '*');",
      errors: missing,
    },
    {
      // @found mutation testing
      name: 'FN: a template-literal wildcard is the same wildcard header',
      code: 'res.header(`Access-Control-Allow-Origin`, `*`);',
      errors: missing,
    },
    {
      name: 'the bracketed use installs the same wildcard cors middleware',
      code: "app['use'](cors({ origin: '*' }));",
      errors: missing,
    },
    {
      name: 'a cors middleware imported under another name is the same wildcard',
      code: "import corsMiddleware from 'cors'; app.use(corsMiddleware({ origin: '*' }));",
      errors: missing,
    },
    {
      // @found mutation testing
      name: 'FN: a wildcard origin through a bound config outside app.use',
      code: "const opts = { origin: '*' }; enable(cors(opts));",
      errors: [{ messageId: 'missingCorsCheck', column: 43 }],
    },
    {
      name: 'a trusted library does not silence a different cors factory',
      code: "app.use(cors({ origin: '*' }));",
      options: [{ trustedLibraries: ['koa'] }],
      errors: missing,
    },
    {
      name: 'an ignore pattern that does not match leaves the finding',
      code: "res.setHeader('Access-Control-Allow-Origin', '*');",
      options: [{ ignorePatterns: ['safeRes'] }],
      errors: missing,
    },
  ],
});
