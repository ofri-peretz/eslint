/**
 * @fileoverview Tests for no-hardcoded-session-tokens
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import { noHardcodedSessionTokens } from './index';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-hardcoded-session-tokens', noHardcodedSessionTokens, {
  valid: [
        'const x = 42;',
        'const flag = true;',
    // Environment variables
    { code: "const token = process.env.JWT_TOKEN" },
    { code: "const session = getSession()" },
    // Short strings (not tokens)
    { code: "const id = 'abc'" },
    { code: "const x = 1" },
    // Starts with 'eyJ' and is long enough, but has no dots at all
    // (exercises the `match(...) || []` null-match fallback branch).
    { code: `const x = 'eyJ${'a'.repeat(60)}'` },
    // A bare string literal not inside a VariableDeclarator at all
    // (exercises the `parent?.type === 'VariableDeclarator'` false branch).
    { code: "['abcdefghijklmnop'];" },
    // A bare string literal used as a call argument (parent is CallExpression,
    // not VariableDeclarator) - additional coverage for the same branch.
    { code: "console.log('abcdefghijklmnop');" },
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
