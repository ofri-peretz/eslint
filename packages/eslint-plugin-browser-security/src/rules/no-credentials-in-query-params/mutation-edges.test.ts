/**
 * Mutation-survivor kill fixtures for no-credentials-in-query-params.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noCredentialsInQueryParams } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('no-credentials-in-query-params', noCredentialsInQueryParams, {
  valid: [
    {
      name: 'a magiclink path (no hyphen) is an out-of-band flow, so its token= is exempt',
      code: "const link = '/magiclink?token=abc';",
    },
  ],
  invalid: [
    {
      name: 'a JSX attribute value is not an object property — no body exemption applies',
      code: 'const a = <a href="/login?token=abc">x</a>;',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a property key that is not a body name gets no body exemption',
      code: "fetch({ url: '/api/items?token=abc' });",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'new URL(...) builds a location, not a URLSearchParams body',
      code: "const u = new URL('https://api.example.com/items?token=abc');",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
