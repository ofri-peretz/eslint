import { describe, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noOverlyPermissiveIamPolicy } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester();

ruleTester.run('no-overly-permissive-iam-policy', noOverlyPermissiveIamPolicy, {
  valid: [
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
  ],
  invalid: [
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
  ],
});
