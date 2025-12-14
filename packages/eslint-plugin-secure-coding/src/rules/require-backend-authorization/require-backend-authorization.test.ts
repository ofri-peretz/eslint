/**
 * @fileoverview Tests for require-backend-authorization
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireBackendAuthorization } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-backend-authorization', requireBackendAuthorization, {
  valid: [
    // Server-side checks
    { code: "const response = await api.checkPermission(userId, resource)" },
    { code: "if (isEnabled) { showFeature() }" },
    // Non-auth checks
    { code: "const x = 1" },
  ],

  invalid: [
    // Client-side role checks
    { code: "if (user.role === 'admin') { showAdmin() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (user.isAdmin) { deleteUser() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (currentUser.permissions === 'write') { save() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (account.admin === true) { proceed() }", errors: [{ messageId: 'violationDetected' }] },
  ],
});
