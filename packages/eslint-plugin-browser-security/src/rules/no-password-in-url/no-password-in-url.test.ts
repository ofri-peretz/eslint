/**
 * @fileoverview Tests for no-password-in-url
 * 
 * Coverage: Comprehensive test suite with valid and invalid cases
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noPasswordInUrl } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-password-in-url', noPasswordInUrl, {
  valid: [
    { code: "const url = 'https://example.com/api'" },
    { code: "fetch('https://api.example.com')" }
  ],

  invalid: [
    { code: "const url = 'https://user:password@example.com'", errors: [{ messageId: 'violationDetected' }] },
    { code: "fetch('https://admin:secret123@api.com')", errors: [{ messageId: 'violationDetected' }] }
  ],
});
