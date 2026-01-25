/**
 * @fileoverview Tests for require-secure-deletion
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireSecureDeletion } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-secure-deletion', requireSecureDeletion, {
  valid: [
    // Secure deletion patterns
    { code: "secureDelete(file)" },
    { code: "data = null; gc()" },
    { code: "const x = 1" },
  ],

  invalid: [
    // Using delete operator (doesn't securely wipe)
    { code: "delete user.password", errors: [{ messageId: 'violationDetected' }] },
    { code: "delete sensitiveData.token", errors: [{ messageId: 'violationDetected' }] },
    { code: "delete obj.secret", errors: [{ messageId: 'violationDetected' }] },
  ],
});
