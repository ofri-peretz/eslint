/**
 * Mutation-survivor kill fixtures for no-client-side-auth-logic.
 *
 * The storage-read walk carries a depth budget for two reasons: it bounds the
 * walk over a long condition, and it terminates a binding whose initialiser
 * reads itself (`var x = x || …`, the legacy default idiom).
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
    {
      name: 'a self-referencing initialiser on the left of || terminates',
      code: 'var allowed = allowed || ready; if (allowed) { show(); }',
    },
    {
      name: 'a self-referencing initialiser on the right of || terminates',
      code: 'var allowed = ready || allowed; if (allowed) { show(); }',
    },
  ],
  invalid: [
    {
      name: 'a storage read six levels down a && chain is still found',
      code: "if (localStorage.getItem('role') === 'admin' && a && b && c && d && e) { show(); }",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
