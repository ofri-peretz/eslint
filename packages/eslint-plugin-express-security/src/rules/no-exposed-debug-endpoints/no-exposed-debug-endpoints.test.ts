/**
 * @fileoverview Tests for no-exposed-debug-endpoints
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
    // Safe endpoints
    { code: "app.get('/api/users', handler)" },
    { code: "router.post('/login', authenticate)" },
    // Non-route code
    { code: "const x = 1" },
  ],

  invalid: [
    // Debug endpoints (now caught once)
    { 
      code: "app.get('/debug', debugHandler)", 
      errors: [{ messageId: 'violationDetected' }]
    },
    // Debug path literals only
    { 
      code: "const path = '/debug'", 
      errors: [{ messageId: 'violationDetected' }]
    },
    { 
      code: "const endpoint = '/admin'", 
      errors: [{ messageId: 'violationDetected' }]
    },
  ],
});
