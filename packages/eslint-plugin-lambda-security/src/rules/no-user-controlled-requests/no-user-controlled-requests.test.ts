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
    // String concatenation with user input (binary expression)
    {
      code: `
        export const handler = async (event) => {
          const path = event.pathParameters.proxy;
          await fetch('https://internal.service/' + path);
        };
      `,
      errors: [{ messageId: 'ssrfVulnerability' }],
    },
    // Object config with tainted url property
    {
      code: `
        export const handler = async (event) => {
          const target = event.queryStringParameters.endpoint;
          await axios({ url: target, method: 'GET' });
        };
      `,
      errors: [{ messageId: 'ssrfVulnerability' }],
    },
    // Assignment expression (not just declaration)
    {
      code: `
        export const handler = async (event) => {
          let endpoint;
          endpoint = event.body;
          await fetch(endpoint);
        };
      `,
      errors: [{ messageId: 'ssrfVulnerability' }],
    },
    // Direct event.body access as URL (no intermediate variable)
    {
      code: `
        export const handler = async (event) => {
          await fetch(event.body);
        };
      `,
      errors: [{ messageId: 'ssrfVulnerability' }],
    },
    // event.rawPath used as URL
    {
      code: `
        export const handler = async (event) => {
          const url = event.rawPath;
          await fetch(url);
        };
      `,
      errors: [{ messageId: 'ssrfVulnerability' }],
    },
    // event.rawQueryString used as URL
    {
      code: `
        export const handler = async (event) => {
          const url = event.rawQueryString;
          await fetch(url);
        };
      `,
      errors: [{ messageId: 'ssrfVulnerability' }],
    },
    // got HTTP client
    {
      code: `
        export const handler = async (event) => {
          const target = event.queryStringParameters.url;
          await got(target);
        };
      `,
      errors: [{ messageId: 'ssrfVulnerability' }],
    },
    // Chained method call (.post)
    {
      code: `
        export const handler = async (event) => {
          const url = event.body;
          await client.post(url, { data: 'test' });
        };
      `,
      errors: [{ messageId: 'ssrfVulnerability' }],
    },
    // Headers as source of user input
    {
      code: `
        export const handler = async (event) => {
          const webhookUrl = event.headers;
          await fetch(webhookUrl);
        };
      `,
      errors: [{ messageId: 'ssrfVulnerability' }],
    },
    // Object config with uri property
    {
      code: `
        export const handler = async (event) => {
          const target = event.queryStringParameters.callback;
          await request({ uri: target });
        };
      `,
      errors: [{ messageId: 'ssrfVulnerability' }],
    },
  ],
});
