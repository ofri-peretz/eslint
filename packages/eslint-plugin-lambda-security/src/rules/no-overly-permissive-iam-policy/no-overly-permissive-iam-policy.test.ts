import { describe, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noOverlyPermissiveIamPolicy } from './index';

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

ruleTester.run('no-overly-permissive-iam-policy', noOverlyPermissiveIamPolicy, {
  valid: lambda([
    // Specific resource (multi-line)
    {
      code: `
        const policy = {
          Effect: 'Allow',
          Action: 's3:GetObject',
          Resource: 'arn:aws:s3:::my-bucket/*'
        };
      `,
    },
    // Specific resource (single-line, compact)
    {
      code: `const policy = { Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::my-bucket/*' };`,
    },
    // Specific resource (different indentation)
    {
      code: `const policy={Effect:'Allow',Action:'s3:GetObject',Resource:'arn:aws:s3:::my-bucket/*'};`,
    },
    // Specific actions array
    {
      code: `
        const policy = {
          Effect: 'Allow',
          Action: ['s3:GetObject', 's3:PutObject'],
          Resource: 'arn:aws:s3:::my-bucket/*'
        };
      `,
    },
    // Quoted property names (JSON-style)
    {
      code: `
        const policy = {
          "Effect": "Allow",
          "Action": "s3:GetObject",
          "Resource": "arn:aws:s3:::my-bucket/*"
        };
      `,
    },
    // Specific principal object
    {
      code: `
        const policy = {
          Effect: 'Allow',
          Principal: { AWS: 'arn:aws:iam::123456789:role/my-role' },
          Action: 's3:GetObject'
        };
      `,
    },
    // Service-specific wildcard (s3:* is more acceptable)
    {
      code: `
        const policy = {
          Effect: 'Allow',
          Action: 's3:*',
          Resource: 'arn:aws:s3:::my-bucket/*'
        };
      `,
    },
    // Deny statement with wildcard is OK (restricting, not allowing)
    // Note: Our current rule doesn't check Effect, this is a potential enhancement
    // Test file (allowed)
    {
      code: `const policy = { Effect: 'Allow', Action: '*', Resource: '*' };`,
      filename: 'policy.test.ts',
    },
    // ARN with account ID (not overly permissive)
    {
      code: `
        const policy = {
          Resource: 'arn:aws:s3:us-west-2:123456789012:accesspoint/my-access-point/*'
        };
      `,
    },
  ]),
  invalid: lambda([
    // Wildcard Resource (multi-line format)
    {
      code: `
        const policy = {
          Effect: 'Allow',
          Action: 's3:GetObject',
          Resource: '*'
        };
      `,
      errors: [{ messageId: 'permissivePolicy' }],
    },
    // Wildcard Resource (single-line, compact)
    {
      code: `const policy = { Effect: 'Allow', Action: 's3:GetObject', Resource: '*' };`,
      errors: [{ messageId: 'permissivePolicy' }],
    },
    // Wildcard Resource (no whitespace)
    {
      code: `const policy={Effect:'Allow',Action:'s3:GetObject',Resource:'*'};`,
      errors: [{ messageId: 'permissivePolicy' }],
    },
    // Wildcard with quoted property names
    {
      code: `const policy = { "Effect": "Allow", "Action": "s3:GetObject", "Resource": "*" };`,
      errors: [{ messageId: 'permissivePolicy' }],
    },
    // Wildcard Action
    {
      code: `
        const policy = {
          Effect: 'Allow',
          Action: '*',
          Resource: 'arn:aws:s3:::my-bucket/*'
        };
      `,
      errors: [{ messageId: 'permissivePolicy' }],
    },
    // Both wildcards (2 errors)
    {
      code: `
        const policy = {
          Effect: 'Allow',
          Action: '*',
          Resource: '*'
        };
      `,
      errors: [
        { messageId: 'permissivePolicy' },
        { messageId: 'permissivePolicy' },
      ],
    },
    // Wildcard in array
    {
      code: `
        const policy = {
          Effect: 'Allow',
          Action: ['s3:GetObject', '*'],
          Resource: 'arn:aws:s3:::my-bucket/*'
        };
      `,
      errors: [{ messageId: 'permissivePolicy' }],
    },
    // Wildcard Principal
    {
      code: `
        const policy = {
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject'
        };
      `,
      errors: [{ messageId: 'permissivePolicy' }],
    },
    // Custom authorizer returning overly permissive policy (nested)
    {
      code: `
        export const handler = async (event) => {
          return {
            principalId: 'user',
            policyDocument: {
              Statement: [{
                Effect: 'Allow',
                Action: 'execute-api:Invoke',
                Resource: '*'
              }]
            }
          };
        };
      `,
      errors: [{ messageId: 'permissivePolicy' }],
    },
    // Deep nesting with compact format
    {
      code: `const doc = { Statement: [{ Resource: '*' }] };`,
      errors: [{ messageId: 'permissivePolicy' }],
    },
    // Multiple wildcards in array
    {
      code: `
        const policy = {
          Action: ['*', 's3:*'],
          Resource: ['*', 'arn:*:*:*:*:*']
        };
      `,
      errors: [
        { messageId: 'permissivePolicy' },
        { messageId: 'permissivePolicy' },
        { messageId: 'permissivePolicy' },
      ],
    },
  ]),
});
