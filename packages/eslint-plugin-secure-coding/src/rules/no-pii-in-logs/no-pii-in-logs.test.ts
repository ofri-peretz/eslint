/**
 * @fileoverview Tests for no-pii-in-logs
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { noPiiInLogs } from './index';

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

ruleTester.run('no-pii-in-logs', noPiiInLogs, {
  valid: [
        'const x = 42;',
        'const flag = true;',
        'function noop() {}',
        'const items = [];',
    { code: "console.log('Status:', status)" },
    { code: "console.info('Count:', count)" }
  ],

  invalid: [
    { code: "console.log(user.email)", errors: [{ messageId: 'violationDetected' }] },
    { code: "console.log('email:', value)", errors: [{ messageId: 'violationDetected' }] },
    { code: "console.log(data.ssn)", errors: [{ messageId: 'violationDetected' }] }
  ],
});
