/**
 * @fileoverview Tests for require-data-minimization
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireDataMinimization } from '../../rules/operability/require-data-minimization';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-data-minimization', requireDataMinimization, {
  valid: [
    // Small objects are fine
    { name: 'two fields is within the threshold', code: "const user = { name: 'John', email: 'john@example.com' }" },
    { code: 'const data = { a: 1, b: 2, c: 3 }' },
    // Large objects without PII
    {
      code: 'const config = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10, k: 11 }',
    },
  ],

  invalid: [
    // Large object with user data fields (>10 properties with PII)
    {
      name: 'eleven personal fields in one object is more than the call needs',
      code: 'const userData = { email: e, name: n, age: a, city: c, zip: z, phone: p, address: addr, country: co, state: s, company: comp, job: j }',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
