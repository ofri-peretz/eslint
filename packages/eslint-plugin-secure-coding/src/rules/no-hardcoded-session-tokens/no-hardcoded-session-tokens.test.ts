/**
 * @fileoverview Tests for no-hardcoded-session-tokens
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noHardcodedSessionTokens } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-hardcoded-session-tokens', noHardcodedSessionTokens, {
  valid: [
    // Environment variables
    { code: "const token = process.env.JWT_TOKEN" },
    { code: "const session = getSession()" },
    // Short strings (not tokens)
    { code: "const id = 'abc'" },
    { code: "const x = 1" },
  ],

  invalid: [
    // JWT tokens
    { 
      code: "const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.Rq8IjqGXVV'",
      errors: [{ messageId: 'violationDetected' }]
    },
    // Bearer tokens
    { 
      code: "const auth = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'",
      errors: [{ messageId: 'violationDetected' }]
    },
    // Session tokens in variables
    { 
      code: "const sessionToken = 'abc123def456ghi789'",
      errors: [{ messageId: 'violationDetected' }]
    },
  ],
});
