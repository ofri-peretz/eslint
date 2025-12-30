import { describe, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnvalidatedEventBody } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester();

ruleTester.run('no-unvalidated-event-body', noUnvalidatedEventBody, {
  valid: [
    // Validation with Zod
    {
      code: `
        import { z } from 'zod';
        const schema = z.object({ name: z.string() });
        export const handler = async (event) => {
          const data = schema.parse(JSON.parse(event.body));
          return { statusCode: 200 };
        };
      `,
    },
    // Validation with Joi
    {
      code: `
        const Joi = require('joi');
        export const handler = async (event) => {
          const { value } = schema.validate(event.body);
          return { statusCode: 200 };
        };
      `,
    },
    // Middy with validator middleware
    {
      code: `
        import middy from '@middy/core';
        import { validator } from '@middy/validator';
        const handler = middy(baseHandler).use(validator({ inputSchema }));
      `,
    },
    // Safe: typeof check
    {
      code: `
        export const handler = async (event) => {
          if (typeof event.body === 'string') {
            console.log('body is string');
          }
        };
      `,
    },
    // Safe: null check in if statement
    {
      code: `
        export const handler = async (event) => {
          if (event.body) {
            console.log('has body');
          }
        };
      `,
    },
    // Safe: console.log for debugging
    {
      code: `
        export const handler = async (event) => {
          console.log(event.body);
          return { statusCode: 200 };
        };
      `,
    },
    // Not a Lambda handler parameter name
    {
      code: `
        export const handler = async (data) => {
          const result = data.body;
          return { statusCode: 200 };
        };
      `,
    },
    // Optional chaining (safe pattern)
    {
      code: `
        export const handler = async (event) => {
          const name = event.body?.name;
          return { statusCode: 200 };
        };
      `,
    },
    // Test file (allowed by default)
    {
      code: `
        export const handler = async (event) => {
          const body = event.body;
        };
      `,
      filename: 'handler.test.ts',
    },
  ],
  invalid: [
    // Direct use of event.body in variable assignment
    {
      code: `
        export const handler = async (event) => {
          const data = event.body;
          return { statusCode: 200 };
        };
      `,
      errors: [{ messageId: 'unvalidatedInput' }],
    },
    // Direct use of queryStringParameters
    {
      code: `
        export const handler = async (event) => {
          const params = event.queryStringParameters;
          return { statusCode: 200 };
        };
      `,
      errors: [{ messageId: 'unvalidatedInput' }],
    },
    // Direct use of pathParameters
    {
      code: `
        export const handler = async (event) => {
          const path = event.pathParameters;
          return { statusCode: 200 };
        };
      `,
      errors: [{ messageId: 'unvalidatedInput' }],
    },
    // 'req' alias for event
    {
      code: `
        export const handler = async (req) => {
          const data = req.body;
          return { statusCode: 200 };
        };
      `,
      errors: [{ messageId: 'unvalidatedInput' }],
    },
  ],
});
