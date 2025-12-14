/**
 * @fileoverview Tests for no-pii-in-logs
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noPiiInLogs } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-pii-in-logs', noPiiInLogs, {
  valid: [
    { code: "console.log('Status:', status)" },
    { code: "console.info('Count:', count)" }
  ],

  invalid: [
    { code: "console.log(user.email)", errors: [{ messageId: 'violationDetected' }] },
    { code: "console.log('email:', value)", errors: [{ messageId: 'violationDetected' }] },
    { code: "console.log(data.ssn)", errors: [{ messageId: 'violationDetected' }] }
  ],
});
