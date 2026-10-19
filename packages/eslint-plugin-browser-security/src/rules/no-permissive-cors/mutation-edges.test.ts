/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-10-19).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noPermissiveCors } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-permissive-cors (mutation edges)', noPermissiveCors, {
  valid: [
    {
      name: 'a numeric computed key on a headers bag is not the origin',
      code: "res.setHeader('Access-Control-Allow-Origin', req.headers[1]);",
    },
    {
      name: 'an .origin read off something other than headers is not reflection',
      code: "res.setHeader('Access-Control-Allow-Origin', config.cors.origin);",
    },
    {
      name: 'a header object naming one origin is not a wildcard',
      code: "const h = { 'Access-Control-Allow-Origin': 'https://app.acme-corp.io' };",
    },
    {
      name: 'a name/value entry is not the key/value entry shape',
      code: "const e = { name: 'Access-Control-Allow-Origin', value: '*' };",
    },
    {
      name: 'a key that does not fold to text is not the CORS header',
      code: "const e = { key: headerName, value: '*' };",
    },
    {
      name: 'a header call with no arguments',
      code: 'res.setHeader();',
    },
    {
      name: 'a header call with no value',
      code: "res.setHeader('Access-Control-Allow-Origin');",
    },
    {
      name: 'a cors-shaped call under another name',
      code: "app.use(corsLike({ origin: '*' }));",
    },
    {
      name: 'a member call named cors is not the cors package',
      code: "app.use(lib.cors({ origin: '*' }));",
    },
    {
      name: 'a template with a substitution is not a known wildcard',
      code: "res.setHeader('Access-Control-Allow-Origin', `${allowed}`);",
    },
    {
      name: 'a template naming one origin is not a wildcard',
      code: 'app.use(cors({ origin: `https://app.acme-corp.io` }));',
    },
  ],
  invalid: [
    {
      name: 'a spread before the wildcard origin in cors()',
      code: "app.use(cors({ ...base, origin: '*' }));",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a spread before a key/value wildcard entry',
      code: "const e = { ...base, key: 'Access-Control-Allow-Origin', value: '*' };",
      errors: [{ messageId: 'violationDetected' }],
    },
    // @found Stryker mutation-survivor triage, 2026-10-19
    {
      name: 'FN: a template-literal wildcard is the same string as the quoted one',
      code: "res.setHeader('Access-Control-Allow-Origin', `*`);",
      errors: [{ messageId: 'violationDetected' }],
    },
    // @found Stryker mutation-survivor triage, 2026-10-19
    {
      name: 'FN: a template-literal header name is the same header',
      code: "res.setHeader(`Access-Control-Allow-Origin`, '*');",
      errors: [{ messageId: 'violationDetected' }],
    },
    // @found Stryker mutation-survivor triage, 2026-10-19
    {
      name: 'FN: a template-literal wildcard in a header object',
      code: "const headers = { 'Access-Control-Allow-Origin': `*` };",
      errors: [{ messageId: 'violationDetected' }],
    },
    // @found Stryker mutation-survivor triage, 2026-10-19
    {
      name: 'FN: a template-literal wildcard as the cors() origin',
      code: 'app.use(cors({ origin: `*` }));',
      errors: [{ messageId: 'violationDetected' }],
    },
    // @found Stryker mutation-survivor triage, 2026-10-19
    {
      name: 'FN: a cors() origin bound to a wildcard constant',
      code: "const ANY = '*'; app.use(cors({ origin: ANY }));",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
