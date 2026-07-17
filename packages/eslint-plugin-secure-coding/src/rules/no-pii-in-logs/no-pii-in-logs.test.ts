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
    { code: "console.info('Count:', count)" },
    // Callee is not a MemberExpression at all — fails the first condition
    // of the console.log/error/warn/info type-guard chain.
    { code: "log(user.email)" },
    // MemberExpression callee, but the object is not `console`.
    { code: "logger.log(user.email)" },
    // `console` object, but the method is not one of log/error/warn/info.
    { code: "console.debug(user.email)" },
    // MemberExpression argument whose property name matches none of the
    // PII keywords — exercises the `piiProps.some(...)` false outcome.
    { code: "console.log(user.name)" },
  ],

  invalid: [
    { code: "console.log(user.email)", errors: [{ messageId: 'violationDetected' }] },
    { code: "console.log('email:', value)", errors: [{ messageId: 'violationDetected' }] },
    { code: "console.log(data.ssn)", errors: [{ messageId: 'violationDetected' }] }
  ],
});
