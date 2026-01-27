import { RuleTester } from '@typescript-eslint/rule-tester';
import { noPermissiveCorsResponse } from './index';

const ruleTester = new RuleTester();

ruleTester.run('no-permissive-cors-response', noPermissiveCorsResponse, {
  valid: [
    // ========== VALID: Specific origin ==========
    {
      code: `
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': 'https://example.com' },
          body: JSON.stringify(data)
        };
      `,
    },
    // ========== VALID: Dynamic origin from event ==========
    {
      code: `
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': event.headers.origin },
          body: JSON.stringify(data)
        };
      `,
    },
    // ========== VALID: No CORS header (API Gateway handles it) ==========
    {
      code: `
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        };
      `,
    },
    // ========== VALID: Test file with wildcard ==========
    {
      code: `
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: 'test'
        };
      `,
      filename: 'handler.test.ts',
    },
    // ========== VALID: Variable for origin ==========
    {
      code: `
        const allowedOrigin = getAllowedOrigin();
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': allowedOrigin },
          body: JSON.stringify(data)
        };
      `,
    },
    // ========== VALID: Non-Lambda response structure ==========
    {
      code: `
        return { data: '*', headers: { 'Access-Control-Allow-Origin': '*' } };
      `,
    },
  ],
  invalid: [
    // ========== INVALID: Wildcard origin in return ==========
    {
      code: `
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify(data)
        };
      `,
      output: `
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': "https://your-domain.com" },
          body: JSON.stringify(data)
        };
      `,
      errors: [{ messageId: 'permissiveCors' }],
    },
    // ========== INVALID: Response variable with wildcard ==========
    {
      code: `
        const response = {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: 'data'
        };
      `,
      output: `
        const response = {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': "https://your-domain.com" },
          body: 'data'
        };
      `,
      errors: [{ messageId: 'permissiveCors' }],
    },
    // ========== INVALID: 4xx response with wildcard ==========
    {
      code: `
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Bad request' })
        };
      `,
      output: `
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': "https://your-domain.com" },
          body: JSON.stringify({ error: 'Bad request' })
        };
      `,
      errors: [{ messageId: 'permissiveCors' }],
    },
    // ========== INVALID: Test file with allowInTests: false ==========
    {
      code: `
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: 'test'
        };
      `,
      output: `
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': "https://your-domain.com" },
          body: 'test'
        };
      `,
      filename: 'handler.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'permissiveCors' }],
    },
  ],
});
