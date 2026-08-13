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

    // --- A flag test is not an auth decision -------------------------------
    // Corpus: okta/okta-signin-widget
    // src/v2/ion/ui-schema/ion-string-handler.js:79 — `secret: true` marks a
    // form field for password rendering. Nothing is authorised here.
    { code: "if (ionFormField.secret === true) { Object.assign(uiSchema, getPasswordUiSchema(settings)) }" },
    { code: "if (field.secret === false) { renderPlain() }" },
    // Presence tests, same category.
    { code: "if (creds.password === null) { promptForPassword() }" },
    { code: "if (creds.token === undefined) { fetchToken() }" },
    { code: "if (undefined !== creds.token) { use(creds.token) }" },
  ],

  invalid: [
    // Local storage auth checks
    { code: "if (localStorage.getItem('isAdmin')) { showAdmin() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (localStorage.getItem('authenticated')) { proceed() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (localStorage.getItem('role')) { checkRole() }", errors: [{ messageId: 'violationDetected' }] },
    // Password comparison
    { code: "if (user.password === input) { login() }", errors: [{ messageId: 'violationDetected' }] },
    // The narrowing must not become an FN: a credential compared against a
    // real value is still a client-side auth decision, in either position and
    // against any non-flag operand.
    { code: "if (input === user.password) { login() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (user.secret === form.secret) { grant() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (user.token === 'abc123') { grant() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (user.password === getInput()) { login() }", errors: [{ messageId: 'violationDetected' }] },
  ],
});
