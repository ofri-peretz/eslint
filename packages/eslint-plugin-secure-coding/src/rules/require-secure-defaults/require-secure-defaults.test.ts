/**
 * @fileoverview Tests for require-secure-defaults
 * 
 * Coverage: Comprehensive test suite with valid and invalid cases
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireSecureDefaults } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-secure-defaults', requireSecureDefaults, {
  valid: [
    { code: "const config = { secure: true, httpOnly: true }" },
    { code: "cookie({ secure: true })" }
  ],

  invalid: [
    { code: "cookie({ secure: false })", errors: [{ messageId: 'violationDetected' }] }
  ],
});
