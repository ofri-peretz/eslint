/**
 * @fileoverview Tests for require-backend-authorization
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import { requireBackendAuthorization } from './index';

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

ruleTester.run('require-backend-authorization', requireBackendAuthorization, {
  valid: [
        'const x = 42;',
        'const flag = true;',
    // Server-side checks
    { code: "const response = await api.checkPermission(userId, resource)" },
    { code: "if (isEnabled) { showFeature() }" },
    // Non-auth checks
    { code: "const x = 1" },
    // BinaryExpression whose operands are not auth-property member accesses on
    // either side — exercises the `checkMember` false path for both `left`
    // and `right` (neither short-circuits the `||` to `true`).
    { code: "if (count === total) { finish() }" },
    // BinaryExpression where the left side is a MemberExpression but the
    // property name is not in the auth-property set — still exercises the
    // `checkMember(left)` false path before falling through to `right`.
    { code: "if (user.name === otherName) { rename() }" },
  ],

  invalid: [
    // Client-side role checks
    { code: "if (user.role === 'admin') { showAdmin() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (user.isAdmin) { deleteUser() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (currentUser.permissions === 'write') { save() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (account.admin === true) { proceed() }", errors: [{ messageId: 'violationDetected' }] },
  ],
});
