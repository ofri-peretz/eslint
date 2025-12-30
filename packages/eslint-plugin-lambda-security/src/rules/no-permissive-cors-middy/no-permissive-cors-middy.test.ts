import { describe, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noPermissiveCorsMidly } from './index';

const ruleTester = new RuleTester();

ruleTester.run('no-permissive-cors-middy', noPermissiveCorsMidly, {
  valid: [
    // ========== VALID: Specific origins ==========
    {
      code: `
        middy(handler).use(httpCors({ origins: ['https://example.com'] }));
      `,
    },
    {
      code: `
        middy(handler).use(cors({ origin: 'https://example.com' }));
      `,
    },
    // ========== VALID: Multiple allowed origins ==========
    {
      code: `
        middy(handler).use(httpCors({ 
          origins: ['https://example.com', 'https://app.example.com'] 
        }));
      `,
    },
    // ========== VALID: Dynamic origin function ==========
    {
      code: `
        middy(handler).use(httpCors({ 
          origins: (event) => validateOrigin(event.headers.origin) 
        }));
      `,
    },
    // ========== VALID: Test file ==========
    {
      code: `middy(handler).use(httpCors({ origin: '*' }));`,
      filename: 'handler.test.ts',
    },
    // ========== VALID: Other middleware (not CORS) ==========
    {
      code: `
        middy(handler)
          .use(validator({ eventSchema }))
          .use(httpSecurityHeaders());
      `,
    },
    // ========== VALID: Variable for origins ==========
    {
      code: `
        const allowedOrigins = getAllowedOrigins();
        middy(handler).use(httpCors({ origins: allowedOrigins }));
      `,
    },
  ],
  invalid: [
    // ========== INVALID: No arguments (defaults to permissive) ==========
    {
      code: `middy(handler).use(httpCors());`,
      errors: [{ messageId: 'permissiveCors' }],
    },
    {
      code: `middy(handler).use(cors());`,
      errors: [{ messageId: 'permissiveCors' }],
    },
    // ========== INVALID: Wildcard origin string ==========
    {
      code: `middy(handler).use(httpCors({ origin: '*' }));`,
      errors: [{ messageId: 'permissiveCors' }],
    },
    {
      code: `middy(handler).use(cors({ origins: '*' }));`,
      errors: [{ messageId: 'permissiveCors' }],
    },
    // ========== INVALID: Wildcard in origins array ==========
    {
      code: `
        middy(handler).use(httpCors({ origins: ['*'] }));
      `,
      errors: [{ messageId: 'permissiveCors' }],
    },
    {
      code: `
        middy(handler).use(httpCors({ origins: ['https://example.com', '*'] }));
      `,
      errors: [{ messageId: 'permissiveCors' }],
    },
    // ========== INVALID: Test file with allowInTests: false ==========
    {
      code: `middy(handler).use(httpCors());`,
      filename: 'handler.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'permissiveCors' }],
    },
  ],
});
