import { RuleTester } from '@typescript-eslint/rule-tester';
import { noHardcodedCredentialsSdk } from './index';

const ruleTester = new RuleTester();

ruleTester.run('no-hardcoded-credentials-sdk', noHardcodedCredentialsSdk, {
  valid: [
    // ========== VALID: Credential Provider Chain ==========
    {
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
  ],
  invalid: [
    // ========== INVALID: Real AWS access key pattern ==========
    {
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
  ],
});
