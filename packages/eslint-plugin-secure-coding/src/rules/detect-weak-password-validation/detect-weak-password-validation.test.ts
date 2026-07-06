/**
 * @fileoverview Tests for detect-weak-password-validation
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { detectWeakPasswordValidation } from './index';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('detect-weak-password-validation', detectWeakPasswordValidation, {
  valid: [
        'const x = 42;',
        'const flag = true;',
    // Strong password requirements
    { code: "if (password.length >= 12) { valid() }" },
    { code: "if (pwd.length >= 8) { valid() }" },
    // Non-password length checks
    { code: "if (name.length >= 2) { valid() }" },
    { code: "const x = 1" },
    // Operator not in the tracked comparison set — false branch of the operator check
    { code: "if (password.length != 4) { accept() }" },
    // Left side is not a MemberExpression at all — false branch of that check
    { code: "if (password >= 4) { accept() }" },
    // Left side is a MemberExpression but the accessed property isn't `.length`
    { code: "if (password.value >= 4) { accept() }" },
    // Left side's object is not a plain Identifier (e.g. nested member expression)
    { code: "if (req.body.password.length >= 4) { accept() }" },
  ],

  invalid: [
    // Weak password requirements
    { code: "if (password.length >= 4) { accept() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (pwd.length >= 6) { proceed() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (pass.length > 3) { ok() }", errors: [{ messageId: 'violationDetected' }] },
  ],
});
