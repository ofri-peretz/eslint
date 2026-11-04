import { RuleTester } from '@typescript-eslint/rule-tester';
import { noHardcodedCredentialsSdk } from './index';

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


const ruleTester = new RuleTester();

ruleTester.run('no-hardcoded-credentials-sdk', noHardcodedCredentialsSdk, {
  valid: lambda([
    // ========== VALID: Credential Provider Chain ==========
    {
      name: "the provider chain resolves the role's credentials",
      code: `
        import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
        const client = new S3Client({ credentials: fromNodeProviderChain() });
      `,
    },
    {
      code: `
        import { fromEnv } from '@aws-sdk/credential-providers';
        const client = new DynamoDBClient({ credentials: fromEnv() });
      `,
    },
    // ========== VALID: No Credentials (uses default chain) ==========
    {
      code: `const client = new S3Client({ region: 'us-east-1' });`,
    },
    {
      code: `const client = new DynamoDBClient({});`,
    },
    // ========== VALID: Using Variables (not literals) ==========
    {
      code: `
        const accessKeyId = getFromVault();
        const secretAccessKey = getFromVault();
        const client = new S3Client({ 
          credentials: { accessKeyId, secretAccessKey } 
        });
      `,
    },
    // ========== VALID: Using process.env (runtime values) ==========
    {
      code: `
        const client = new S3Client({ 
          credentials: { 
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY 
          } 
        });
      `,
    },
    // ========== VALID: Test file with hardcoded credentials (allowed) ==========
    {
      code: `
        const client = new S3Client({ 
          credentials: { accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' } 
        });
      `,
      filename: 'test.spec.ts',
    },
    // ========== VALID: Short placeholder values (FP reduction) ==========
    {
      code: `
        const client = new S3Client({ 
          credentials: { accessKeyId: 'key', secretAccessKey: 'secret' } 
        });
      `,
    },
    // ========== VALID: Non-AWS accessKeyId value ==========
    {
      code: `
        const client = new S3Client({ 
          credentials: { accessKeyId: 'test123', secretAccessKey: 'short' } 
        });
      `,
    },
    {
      name: 'SDK v2 with LocalStack placeholder keys at the top level',
      code: `
        import AWS from 'aws-sdk';
        const s3 = new AWS.S3({ endpoint: 'http://localhost:4566', accessKeyId: 'test', secretAccessKey: 'test' });
      `,
    },
    {
      name: 'SDK v2 credentials from the environment',
      code: `
        import AWS from 'aws-sdk';
        AWS.config.update({ accessKeyId: process.env.KEY, secretAccessKey: process.env.SECRET });
        AWS.config.credentials = new AWS.Credentials(process.env.KEY, process.env.SECRET);
      `,
    },
    {
      name: 'a config.update on something that is not the SDK',
      code: `
        import settings from './settings';
        settings.config.update({ accessKeyId: 'AKIAIOSFODNN7EXAMPLE' });
        other.config.update({ accessKeyId: 'AKIAIOSFODNN7EXAMPLE' });
        AWS.config.update({ accessKeyId: 'AKIAIOSFODNN7EXAMPLE' });
      `,
    },
    {
      name: 'SDK v2 config.update with no options object',
      code: `
        import AWS from 'aws-sdk';
        AWS.config.update(loadConfig());
        AWS.config.set('region', 'us-east-1');
      `,
    },
    {
      name: 'a non-SDK class constructed off a member',
      code: `
        import * as http from './http';
        const vendors = require('./vendors');
        const fromCall = makeFactory();
        const client = new http.ApiClient({ credentials: { accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' } });
        const v = new vendors.Credentials('AKIAIOSFODNN7EXAMPLE', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
        const w = new fromCall.Credentials('AKIAIOSFODNN7EXAMPLE', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
        const x = new (getClass())({ accessKeyId: 'AKIAIOSFODNN7EXAMPLE' });
        const y = new (getFactory()).Credentials('AKIAIOSFODNN7EXAMPLE', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
      `,
    },
    {
      name: 'a class required from a computed specifier',
      code: `
        const { Credentials } = require(sdkName);
        const c = new Credentials('AKIAIOSFODNN7EXAMPLE', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
      `,
    },
    // ========== VALID: Non-AWS client (HttpClient) ==========
    {
      code: `
        const client = new HttpClient({ 
          credentials: { accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'secret123456789012345678' } 
        });
      `,
    },
    // ========== VALID: Function calls for credentials ==========
    {
      code: `
        const client = new S3Client({ 
          credentials: async () => ({ accessKeyId: getKey(), secretAccessKey: getSecret() })
        });
      `,
    },
  ]),
  invalid: lambda([
    {
      name: 'the credentials key and the service read by string subscript',
      code: `
        const AWS = require('aws-sdk');
        const db = new AWS['DynamoDB']['DocumentClient']({ ['credentials']: { accessKeyId: 'AKIAIOSFODNN7EXAMPLE' } });
      `,
      errors: [{ messageId: 'hardcodedCredentials' }],
    },
    {
      name: 'credential keys spelled as quoted and computed keys',
      code: `
        const client = new S3Client({ credentials: { 'accessKeyId': 'AKIAIOSFODNN7EXAMPLE', ['secretAccessKey']: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', [dynamic]: 'x' } });
      `,
      errors: [
        { messageId: 'hardcodedCredentials' },
        { messageId: 'hardcodedCredentials' },
      ],
    },
    {
      name: 'SDK v2 service client with the keys at the top level',
      code: `
        import AWS from 'aws-sdk';
        const s3 = new AWS.S3({ accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' });
      `,
      errors: [
        { messageId: 'hardcodedCredentials' },
        { messageId: 'hardcodedCredentials' },
      ],
    },
    {
      name: 'SDK v2 DocumentClient required from aws-sdk',
      code: `
        const AWS = require('aws-sdk');
        const db = new AWS.DynamoDB.DocumentClient({ credentials: { accessKeyId: 'AKIAIOSFODNN7EXAMPLE' } });
      `,
      errors: [{ messageId: 'hardcodedCredentials' }],
    },
    {
      name: 'SDK v2 service picked by a computed name',
      code: `
        import AWS from 'aws-sdk';
        const c = new AWS[service]({ accessKeyId: 'AKIAIOSFODNN7EXAMPLE' });
      `,
      errors: [{ messageId: 'hardcodedCredentials' }],
    },
    {
      name: 'SDK v2 global config.update',
      code: `
        import AWS from 'aws-sdk';
        AWS.config.update({ region: 'us-east-1', accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' });
      `,
      errors: [
        { messageId: 'hardcodedCredentials' },
        { messageId: 'hardcodedCredentials' },
      ],
    },
    {
      name: 'SDK v2 Credentials constructor takes the keys positionally',
      code: `
        import AWS from 'aws-sdk';
        AWS.config.credentials = new AWS.Credentials('AKIAIOSFODNN7EXAMPLE', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', 'EXAMPLE-SESSION-TOKEN');
      `,
      errors: [
        { messageId: 'hardcodedCredentials' },
        { messageId: 'hardcodedCredentials' },
        { messageId: 'hardcodedCredentials' },
      ],
    },
    {
      name: 'a renamed v3 client import',
      code: `
        import { S3Client as Storage } from '@aws-sdk/client-s3';
        const client = new Storage({ credentials: { accessKeyId: 'AKIAIOSFODNN7EXAMPLE', awsSecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' } });
      `,
      errors: [
        { messageId: 'hardcodedCredentials' },
        { messageId: 'hardcodedCredentials' },
      ],
    },
    {
      name: 'a v3 client through a namespace import',
      code: `
        import * as s3 from '@aws-sdk/client-s3';
        const client = new s3.S3Client({ credentials: { awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE' } });
      `,
      errors: [{ messageId: 'hardcodedCredentials' }],
    },
    // ========== INVALID: Real AWS access key pattern ==========
    {
      name: 'an access key pair written into the client construction',
      code: `
        const client = new S3Client({ 
          credentials: { 
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
          } 
        });
      `,
      errors: [
        { messageId: 'hardcodedCredentials' },
        { messageId: 'hardcodedCredentials' },
      ],
    },
    // ========== INVALID: STS temporary credentials ==========
    {
      code: `
        const client = new DynamoDBClient({ 
          credentials: { 
            accessKeyId: 'ASIAIOSFODNN7EXAMPLE',
            secretAccessKey: 'secretKey123456789012345678901234567890'
          } 
        });
      `,
      errors: [
        { messageId: 'hardcodedCredentials' },
        { messageId: 'hardcodedCredentials' },
      ],
    },
    // ========== INVALID: Various SDK clients ==========
    {
      code: `
        const client = new LambdaClient({ 
          credentials: { 
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            secretAccessKey: 'mySecretAccessKey12345678901234567890123'
          } 
        });
      `,
      errors: [
        { messageId: 'hardcodedCredentials' },
        { messageId: 'hardcodedCredentials' },
      ],
    },
    // ========== INVALID: Session token included ==========
    {
      code: `
        const client = new STSClient({ 
          credentials: { 
            accessKeyId: 'ASIAIOSFODNN7EXAMPLE',
            secretAccessKey: 'longSecretAccessKeyValueHere1234567890',
            sessionToken: 'FwoGZXIvYXdzEBYaDL...'
          } 
        });
      `,
      errors: [
        { messageId: 'hardcodedCredentials' },
        { messageId: 'hardcodedCredentials' },
        { messageId: 'hardcodedCredentials' },
      ],
    },
    // ========== INVALID: Template literal credentials ==========
    {
      code: `
        const client = new S3Client({ 
          credentials: { 
            accessKeyId: \`AKIA\${prefix}EXAMPLE\`,
            secretAccessKey: \`secret-\${suffix}\`
          } 
        });
      `,
      errors: [
        { messageId: 'hardcodedCredentials' },
        { messageId: 'hardcodedCredentials' },
      ],
    },
    // ========== INVALID: Test file with allowInTests: false ==========
    {
      code: `
        const client = new S3Client({ 
          credentials: { accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'secret12345678901234567890' } 
        });
      `,
      filename: 'test.spec.ts',
      options: [{ allowInTests: false }],
      errors: [
        { messageId: 'hardcodedCredentials' },
        { messageId: 'hardcodedCredentials' },
      ],
    },
  ]),
});
