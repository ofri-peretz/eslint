import { describe, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noMissingAuthorizationCheck } from './index';

/**
 * Every fixture carries the Lambda handler shape, because the rules now abstain
 * in files that are not Lambda code. Wrapping the arrays rather than editing
 * each fixture means one cannot be left behind — a fixture missing the shape
 * would pass vacuously on the gate instead of exercising the detection it was
 * written for.
 */
const asLambda = (code: string): string =>
  `import type { Handler } from 'aws-lambda';\n${code}`;
type Suggestion = { output?: string | null };
type Case = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly Suggestion[] } | string>;
};
const lambda = <T,>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asLambda(c) as T;
    const test = c as Case;
    return {
      ...c,
      code: asLambda(test.code),
      // Autofix and suggestion fixtures assert the WHOLE file back, so every
      // `output` needs the same prefix or each fixable rule fails on the header
      // alone — including the ones nested under errors[].suggestions[].
      ...(typeof test.output === 'string' ? { output: asLambda(test.output) } : {}),
      ...(test.errors
        ? {
            errors: test.errors.map((e) =>
              typeof e === 'string' || !e.suggestions
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asLambda(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });


RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester();

ruleTester.run('no-missing-authorization-check', noMissingAuthorizationCheck, {
  valid: lambda([
    // Test file (allowed by default)
    {
      name: 'a test file is exempt',
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
  ]),

  invalid: lambda([
    // Lambda handler with DB query but no auth check (classic FN)
    {
      name: 'a handler that deletes rows without checking who asked',
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
  ]),
});

// Regression lock — function-exit `:exit` selector (ESLint 9 "Unknown class
// name: exit" crash). The exit report fires from three SEPARATE listeners after
// the fix split the comma-joined
// 'ArrowFunctionExpression:exit, FunctionExpression:exit, FunctionDeclaration:exit'
// key (ESLint strips only a trailing ':exit', so the comma form leaks ':exit'
// into esquery and throws). Exercise all three function node types: a
// reintroduced comma-joined selector crashes here, and a dropped per-node-type
// listener stops that case reporting.
ruleTester.run(
  'no-missing-authorization-check (function-exit selector regression)',
  noMissingAuthorizationCheck,
  {
    valid: lambda([
      // Clean handler of each node type — exit listeners run, no crash, no FP.
      {
        code: `export const handler = async (event) => {
          return { statusCode: 200, body: 'ok' };
        };`,
      },
      {
        code: `export const handler = async function (event) {
          return { statusCode: 200, body: 'ok' };
        };`,
      },
      {
        code: `async function handler(event) {
          return { statusCode: 200, body: 'ok' };
        }`,
      },
    ]),
    invalid: lambda([
      // Sensitive op + no auth check reports once per node type.
      {
        code: `export const handler = async (event) => {
          await db.query('DELETE FROM users');
        };`,
        errors: [{ messageId: 'missingAuthCheck' }],
      },
      {
        code: `export const handler = async function (event) {
          await db.query('DELETE FROM users');
        };`,
        errors: [{ messageId: 'missingAuthCheck' }],
      },
      {
        code: `async function handler(event) {
          await db.query('DELETE FROM users');
        }`,
        errors: [{ messageId: 'missingAuthCheck' }],
      },
    ]),
  },
);
