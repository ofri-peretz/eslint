import { RuleTester } from '@typescript-eslint/rule-tester';
import { noClientSideAuthLogic } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

/**
 * Found linting an open-source analytics app's settings page: the confirm
 * password field of a form was reported as a client-side authentication
 * decision. Two fields of the SAME form object compared with each other
 * authorise nothing. A stored credential lives on another object than the value
 * typed against it, which stays reported.
 */
ruleTester.run(
  'no-client-side-auth-logic (confirm password)',
  noClientSideAuthLogic,
  {
    valid: [
      {
        name: 'a confirm-password field compared with the password field',
        code: 'if (form.password !== form.repeat) { errors.repeat = "mismatch"; }',
      },
      {
        name: 'the confirm field on the left, the password on the right',
        code: 'if (form.confirm === form.password) { submit(); }',
      },
      {
        name: 'two token fields of one state object in a ternary',
        code: 'const msg = state.token !== state.tokenAgain ? "no" : null;',
      },
    ],
    invalid: [
      {
        name: 'a credential on a different object than the input is a client-side check',
        code: 'if (user.password === form.password) { login(); }',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'the same field of the same object is not a pair of fields',
        code: 'if (user.password === user.password) { login(); }',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a receiver that is not a plain identifier is not known to be one form',
        code: 'if (this.password === this.input) { login(); }',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a call result is not one object read twice',
        code: 'if (getUser().password === getUser().input) { login(); }',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a credential against a bare value',
        code: 'if (form.password === typed) { login(); }',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a computed property is not a name',
        code: 'if (user.password === user[key]) { login(); }',
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  },
);
