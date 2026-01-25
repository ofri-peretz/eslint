/**
 * @fileoverview Tests for no-credentials-in-query-params
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noCredentialsInQueryParams } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-credentials-in-query-params', noCredentialsInQueryParams, {
  valid: [
    // Safe URLs without credentials
    { code: "const url = 'https://api.example.com/data'" },
    { code: "const url = 'https://api.example.com?user=john'" },
    { code: "fetch('https://api.example.com/users')" },
    { code: "const x = 1" },
  ],

  invalid: [
    // URLs with credentials in query params
    { code: "const url = 'https://api.example.com?password=secret123'", errors: [{ messageId: 'violationDetected' }] },
    { code: "const url = 'https://api.example.com?token=abc123'", errors: [{ messageId: 'violationDetected' }] },
    { code: "fetch('https://api.example.com?apikey=xyz789')", errors: [{ messageId: 'violationDetected' }] },
    { code: "const url = 'https://api.com?user=john&password=xyz'", errors: [{ messageId: 'violationDetected' }] },
    // Template literals with credentials
    { code: "const url = `https://api.com?token=${token}`", errors: [{ messageId: 'violationDetected' }] },
  ],
});
