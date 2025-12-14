/**
 * @fileoverview Tests for detect-weak-password-validation
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { detectWeakPasswordValidation } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('detect-weak-password-validation', detectWeakPasswordValidation, {
  valid: [
    // Strong password requirements
    { code: "if (password.length >= 12) { valid() }" },
    { code: "if (pwd.length >= 8) { valid() }" },
    // Non-password length checks
    { code: "if (name.length >= 2) { valid() }" },
    { code: "const x = 1" },
  ],

  invalid: [
    // Weak password requirements
    { code: "if (password.length >= 4) { accept() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (pwd.length >= 6) { proceed() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (pass.length > 3) { ok() }", errors: [{ messageId: 'violationDetected' }] },
  ],
});
