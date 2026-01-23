/**
 * @fileoverview Tests for no-exposed-debug-endpoints (NestJS)
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
      code: `
        class MyController {
          @Get('/api/v1/profile')
          getProfile() {}
        }
      `
    },
    {
      code: `
        class MyController {
          @Post('login')
          login() {}
        }
      `
    }
  ],

  invalid: [
    {
      code: `
        class MyController {
          @Get('/debug')
          getDebug() {}
        }
      `,
      errors: [{ messageId: 'violationDetected' }]
    },
    {
      code: `
        class MyController {
          @Post('admin')
          getAdmin() {}
        }
      `,
      errors: [{ messageId: 'violationDetected' }]
    },
    {
      code: "const path = '/health'",
      errors: [{ messageId: 'violationDetected' }]
    }
  ],
});
