/**
 * @fileoverview Tests for no-verbose-error-messages
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noVerboseErrorMessages } from '../../rules/operability/no-verbose-error-messages';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-verbose-error-messages', noVerboseErrorMessages, {
  valid: [
    // Safe error responses
    { code: "res.send('Error occurred')" },
    { code: "res.json({ error: 'Internal error' })" },
    { code: "res.json({ message: 'Something went wrong' })" },
    // Non-response calls
    { code: 'console.log(error.stack)' },
    { code: 'logger.error(err.stack)' },
  ],

  invalid: [
    // Exposing stack directly
    {
      code: 'res.send(error.stack)',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'res.json(err.stack)',
      errors: [{ messageId: 'violationDetected' }],
    },
    // Exposing stack in object
    {
      code: 'res.json({ stack: error.stack })',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'res.send({ error: err.stack })',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
