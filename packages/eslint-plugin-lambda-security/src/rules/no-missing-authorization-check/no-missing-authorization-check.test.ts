import { describe, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noMissingAuthorizationCheck } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester();

ruleTester.run('no-missing-authorization-check', noMissingAuthorizationCheck, {
  valid: [
    // Test file (allowed by default)
    {
      code: `
        export const handler = async (event) => {
          await db.query('DELETE FROM users');
        };
      `,
      filename: 'handler.test.ts',
    },
    // Handler with requestContext.authorizer check
    {
      code: `
        export const handler = async (event) => {
          const claims = event.requestContext.authorizer.claims;
          if (!claims.sub) return { statusCode: 401 };
          await db.query('SELECT * FROM users');
        };
      `,
    },
    // Handler with Authorization header check
    {
      code: `
        export const handler = async (event) => {
          const token = event.headers.Authorization;
          if (!token) return { statusCode: 401, body: 'Unauthorized' };
          await db.delete({ id: event.pathParameters.id });
        };
      `,
    },
    // Handler with 401 return (indicates auth check)
    {
      code: `
        export const handler = async (event) => {
          if (!event.headers.token) {
            return { statusCode: 401 };
          }
          await db.query('DELETE FROM orders');
        };
      `,
    },
    // Handler with 403 return (indicates auth check)
    {
      code: `
        export const handler = async (event) => {
          if (!isAdmin) {
            return { statusCode: 403 };
          }
          await db.delete({ id: '123' });
        };
      `,
    },
    // Handler with userId check
    {
      code: `
        export const handler = async (event) => {
          const userId = event.requestContext.authorizer.userId;
          await db.query('SELECT * FROM orders WHERE user = userId');
        };
      `,
    },
    // Handler with permissions check
    {
      code: `
        export const handler = async (event) => {
          const permissions = event.requestContext.authorizer.permissions;
          await db.update({ id: '123', status: 'active' });
        };
      `,
    },
    // Handler with claims.sub check
    {
      code: `
        export const handler = async (event) => {
          const sub = event.requestContext.authorizer.claims.sub;
          await db.putItem({ userId: sub, data: 'test' });
        };
      `,
    },
    // Handler with isAuthenticated check
    {
      code: `
        export const handler = async (event) => {
          const isAuthenticated = verifyToken(event.headers.Authorization);
          await client.send(new PutItemCommand(params));
        };
      `,
    },
    // Handler without sensitive operations — no auth needed
    {
      code: `
        export const handler = async (event) => {
          return { statusCode: 200, body: 'hello' };
        };
      `,
    },
    // Non-handler function — should not trigger
    {
      code: `
        function processData(data) {
          db.query('DELETE FROM logs');
        }
      `,
    },
    // Handler using 'req' as event param with auth header
    {
      code: `
        export const handler = async (req) => {
          const auth = req.headers.authorization;
          await db.query('SELECT * FROM users');
        };
      `,
    },
  ],

  invalid: [
    // Lambda handler with DB query but no auth check (classic FN)
    {
      code: `
        export const handler = async (event) => {
          await db.query('DELETE FROM users');
        };
      `,
      errors: [{ messageId: 'missingAuthCheck' }],
    },
    // Lambda handler with put operation, no auth
    {
      code: `
        export const handler = async (event) => {
          await db.put({ TableName: 'users', Item: { id: '123' } });
        };
      `,
      errors: [{ messageId: 'missingAuthCheck' }],
    },
    // Lambda handler with delete operation, no auth
    {
      code: `
        export const handler = async (event) => {
          await db.delete({ TableName: 'users', Key: { id: '123' } });
        };
      `,
      errors: [{ messageId: 'missingAuthCheck' }],
    },
    // Lambda handler with update operation, no auth
    {
      code: `
        export const handler = async (event) => {
          await db.update({ id: '123', status: 'deleted' });
        };
      `,
      errors: [{ messageId: 'missingAuthCheck' }],
    },
    // Lambda handler with AWS SDK send (putItem), no auth
    {
      code: `
        export const handler = async (event) => {
          await client.send(new PutItemCommand(params));
        };
      `,
      errors: [{ messageId: 'missingAuthCheck' }],
    },
    // Lambda handler with deleteItem, no auth
    {
      code: `
        export const handler = async (event) => {
          await docClient.deleteItem({ TableName: 'users', Key: { id: '123' } });
        };
      `,
      errors: [{ messageId: 'missingAuthCheck' }],
    },
    // Lambda handler with getObject (S3), no auth
    {
      code: `
        export const handler = async (event) => {
          await s3.getObject({ Bucket: 'private', Key: 'secret.pdf' });
        };
      `,
      errors: [{ messageId: 'missingAuthCheck' }],
    },
    // Multiple sensitive operations — should report each
    {
      code: `
        export const handler = async (event) => {
          await db.query('SELECT * FROM users');
          await db.delete({ id: '123' });
        };
      `,
      errors: [
        { messageId: 'missingAuthCheck' },
        { messageId: 'missingAuthCheck' },
      ],
    },
    // Handler using 'evt' as event param
    {
      code: `
        export const handler = async (evt) => {
          await db.query('SELECT * FROM users');
        };
      `,
      errors: [{ messageId: 'missingAuthCheck' }],
    },
    // FunctionDeclaration handler
    {
      code: `
        async function handler(event) {
          await db.invoke(lambdaParams);
        }
      `,
      errors: [{ messageId: 'missingAuthCheck' }],
    },
  ],
});
