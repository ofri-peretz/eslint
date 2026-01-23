/**
 * @fileoverview Tests for no-exposed-debug-endpoints (Lambda)
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noExposedDebugEndpoints } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-exposed-debug-endpoints', noExposedDebugEndpoints, {
  valid: [
    {
      code: "if (event.path === '/api/user') {}"
    },
    {
      code: "const ok = '/status-check'"
    }
  ],

  invalid: [
    {
      code: "if (event.path === '/debug') {}",
      errors: [{ messageId: 'violationDetected' }]
    },
    {
      code: "if (event.rawPath.includes('/admin')) {}",
      errors: [{ messageId: 'violationDetected' }]
    },
    {
      code: "const p = '/__debug__'",
      errors: [{ messageId: 'violationDetected' }]
    },
    {
      code: `
        export const serverlessConfig = {
          functions: {
            debug: {
              events: [{ http: { path: '/debug' } }]
            }
          }
        }
      `,
      errors: [{ messageId: 'violationDetected' }]
    }
  ],
});
