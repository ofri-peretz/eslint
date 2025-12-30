import { describe, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noExposedErrorDetails } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester();

ruleTester.run('no-exposed-error-details', noExposedErrorDetails, {
  valid: [
    // Generic error message
    {
      code: `
        export const handler = async (event) => {
          try {
            await riskyOperation();
          } catch (error) {
            console.error(error);
            return { statusCode: 500, body: JSON.stringify({ message: 'Internal error' }) };
          }
        };
      `,
    },
    // Sanitized error (only message, not stack)
    {
      code: `
        export const handler = async (event) => {
          try {
            await riskyOperation();
          } catch (error) {
            return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
          }
        };
      `,
    },
    // Not in API response
    {
      code: `
        function logError(error) {
          console.log(error.stack);
        }
      `,
    },
    // Test file (allowed)
    {
      code: `
        export const handler = async (event) => {
          return { statusCode: 500, body: JSON.stringify({ stack: error.stack }) };
        };
      `,
      filename: 'handler.test.ts',
    },
  ],
  invalid: [
    // Exposed stack trace
    {
      code: `
        export const handler = async (event) => {
          try {
            await riskyOperation();
          } catch (error) {
            return { statusCode: 500, body: JSON.stringify({ stack: error.stack }) };
          }
        };
      `,
      errors: [{ messageId: 'exposedErrorDetails' }],
    },
    // JSON.stringify entire error
    {
      code: `
        export const handler = async (event) => {
          try {
            await riskyOperation();
          } catch (error) {
            return { statusCode: 500, body: JSON.stringify(error) };
          }
        };
      `,
      errors: [{ messageId: 'exposedErrorDetails' }],
    },
    // Exposed cause
    {
      code: `
        export const handler = async (event) => {
          try {
            await riskyOperation();
          } catch (err) {
            return { statusCode: 500, body: JSON.stringify({ cause: err.cause }) };
          }
        };
      `,
      errors: [{ messageId: 'exposedErrorDetails' }],
    },
  ],
});
