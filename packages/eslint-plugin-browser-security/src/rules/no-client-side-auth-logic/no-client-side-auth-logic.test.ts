/**
 * @fileoverview Tests for no-client-side-auth-logic
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noClientSideAuthLogic } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-client-side-auth-logic', noClientSideAuthLogic, {
  valid: [
    // Server-side auth checks
    { code: "if (await verifyToken(token)) { proceed() }" },
    { code: "const isAuth = await authService.verify()" },
    // Non-auth localStorage usage
    { code: "if (localStorage.getItem('theme')) { setTheme() }" },
    { code: "const x = 1" },
  ],

  invalid: [
    // Local storage auth checks
    { code: "if (localStorage.getItem('isAdmin')) { showAdmin() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (localStorage.getItem('authenticated')) { proceed() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (localStorage.getItem('role')) { checkRole() }", errors: [{ messageId: 'violationDetected' }] },
    // Password comparison
    { code: "if (user.password === input) { login() }", errors: [{ messageId: 'violationDetected' }] },
  ],
});
