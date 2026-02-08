import { describe, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noErrorSwallowing } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester();

ruleTester.run('no-error-swallowing', noErrorSwallowing, {
  valid: [
    // Rethrows the error — not swallowed
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          throw error;
        }
      `,
    },
    // console.error logging
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          console.error('Failed:', error);
        }
      `,
    },
    // console.log logging
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          console.log('Error', error);
        }
      `,
    },
    // console.warn logging
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          console.warn('Warning:', error);
        }
      `,
    },
    // Logger: logger.error
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          logger.error('Operation failed', { error });
        }
      `,
    },
    // Logger: winston.error
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          winston.error(error);
        }
      `,
    },
    // Logger: pino.error
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          pino.error(error);
        }
      `,
    },
    // Logger: bunyan.error
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          bunyan.error('Failed', error);
        }
      `,
    },
    // Logger: log.error
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          log.error('Failed', error);
        }
      `,
    },
    // Direct function call matching log/error/warn patterns
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          logError(error);
        }
      `,
    },
    // Return with 500 status (error response) — acceptable error handling
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          return { statusCode: 500, body: 'Internal error' };
        }
      `,
    },
    // Test file (allowed by default)
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {}
      `,
      filename: 'handler.test.ts',
    },
    // Empty catch with intentional comment
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          // intentional - we don't care about this error
        }
      `,
    },
    // Empty catch with "ignore" comment
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          // Ignore this error
        }
      `,
    },
    // Empty catch with "suppress" comment
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          /* suppress error */
        }
      `,
    },
    // Empty catch with "handled" comment
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          // Error is handled elsewhere
        }
      `,
    },
    // Empty catch with "expected" comment
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          // expected behavior
        }
      `,
    },
  ],

  invalid: [
    // Empty catch block — classic error swallowing (has suggestion with fix)
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {}
      `,
      errors: [{
        messageId: 'emptyCatchBlock',
        suggestions: [{
          messageId: 'addErrorLogging',
          output: `
        try {
          riskyOperation();
        } catch (error) { console.error('Error:', error); }
      `,
        }],
      }],
    },
    // Catch block with code but no logging (no suggestion)
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          const x = 1;
        }
      `,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    // Catch block with return but no error context (no suggestion)
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          return { statusCode: 200, body: 'ok' };
        }
      `,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    // Catch block with return null — no error context (no suggestion)
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          return null;
        }
      `,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    // Empty catch without param name (has suggestion, defaults to 'error')
    {
      code: `
        try {
          riskyOperation();
        } catch {
        }
      `,
      errors: [{
        messageId: 'emptyCatchBlock',
        suggestions: [{
          messageId: 'addErrorLogging',
          output: `
        try {
          riskyOperation();
        } catch { console.error('Error:', error); }
      `,
        }],
      }],
    },
    // Catch with only a non-logging function call (no suggestion)
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          doSomething();
        }
      `,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    // allowWithComment: false should flag commented empty catch (has suggestion)
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          // intentional
        }
      `,
      options: [{ allowWithComment: false }],
      errors: [{
        messageId: 'emptyCatchBlock',
        suggestions: [{
          messageId: 'addErrorLogging',
          output: `
        try {
          riskyOperation();
        } catch (error) { console.error('Error:', error); }
      `,
        }],
      }],
    },
  ],
});
