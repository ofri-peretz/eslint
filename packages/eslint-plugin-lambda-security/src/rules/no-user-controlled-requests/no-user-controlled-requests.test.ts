import { describe, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUserControlledRequests } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester();

ruleTester.run('no-user-controlled-requests', noUserControlledRequests, {
  valid: [
    // Safe: Static URL
    {
      code: `
        export const handler = async (event) => {
          const response = await fetch('https://api.trusted.com/data');
          return { statusCode: 200 };
        };
      `,
    },
    // Safe: Environment variable URL
    {
      code: `
        export const handler = async (event) => {
          const apiUrl = process.env.API_URL;
          const response = await fetch(apiUrl);
          return { statusCode: 200 };
        };
      `,
    },
    // Safe: Static URL with path from config
    {
      code: `
        const config = { apiUrl: 'https://api.example.com' };
        export const handler = async (event) => {
          const response = await axios.get(config.apiUrl);
          return { statusCode: 200 };
        };
      `,
    },
    // Not a Lambda handler
    {
      code: `
        export const util = async (data) => {
          const url = data.targetUrl;
          await fetch(url);
        };
      `,
    },
    // Test file (should be allowed by default)
    {
      code: `
        export const handler = async (event) => {
          const url = event.queryStringParameters.url;
          await fetch(url);
        };
      `,
      filename: 'handler.test.ts',
    },
  ],
  invalid: [
    // URL from query parameters
    {
      code: `
        export const handler = async (event) => {
          const targetUrl = event.queryStringParameters.targetUrl;
          const response = await fetch(targetUrl);
          return { statusCode: 200 };
        };
      `,
      errors: [{ messageId: 'ssrfVulnerability' }],
    },
    // Template literal with user input
    {
      code: `
        export const handler = async (event) => {
          const host = event.queryStringParameters.host;
          await fetch(\`https://\${host}/api/data\`);
        };
      `,
      errors: [{ messageId: 'ssrfVulnerability' }],
    },
    // Axios with user-controlled URL from body
    {
      code: `
        export const handler = async (event) => {
          const url = event.body;
          await axios.get(url);
        };
      `,
      errors: [{ messageId: 'ssrfVulnerability' }],
    },
    // http.request with user input
    {
      code: `
        import http from 'http';
        export const handler = async (event) => {
          const targetUrl = event.queryStringParameters.url;
          http.request(targetUrl);
        };
      `,
      errors: [{ messageId: 'ssrfVulnerability' }],
    },
    // Variable reassignment
    {
      code: `
        export const handler = async (event) => {
          let url = event.queryStringParameters.target;
          await fetch(url);
        };
      `,
      errors: [{ messageId: 'ssrfVulnerability' }],
    },
  ],
});
