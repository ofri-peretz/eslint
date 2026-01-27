import { RuleTester } from '@typescript-eslint/rule-tester';
import { noSecretsInEnv } from './index';

const ruleTester = new RuleTester();

ruleTester.run('no-secrets-in-env', noSecretsInEnv, {
  valid: [
    // ========== VALID: Reading from process.env ==========
    {
      code: `const password = process.env.DB_PASSWORD;`,
    },
    {
      code: `const apiKey = process.env.API_KEY;`,
    },
    // ========== VALID: Using Secrets Manager ==========
    {
      code: `
        const password = await secretsClient.send(
          new GetSecretValueCommand({ SecretId: 'db-password' })
        );
      `,
    },
    // ========== VALID: Non-secret env vars ==========
    {
      code: `
        const envConfig = {
          NODE_ENV: 'production',
          AWS_REGION: 'us-east-1',
          LOG_LEVEL: 'info'
        };
      `,
    },
    // ========== VALID: Short placeholder values ==========
    {
      code: `
        const config = {
          DB_PASSWORD: 'xxx'
        };
      `,
    },
    // ========== VALID: Variables (not literals) ==========
    {
      code: `
        const envConfig = {
          API_KEY: getFromVault(),
          DB_PASSWORD: secrets.password
        };
      `,
    },
    // ========== VALID: Test file ==========
    {
      code: `
        const envConfig = {
          API_KEY: 'test-api-key-12345678901234567890',
          DB_PASSWORD: 'test-password-12345678901234567890'
        };
      `,
      filename: 'config.test.ts',
    },
    // ========== VALID: Not in env/config variable ==========
    {
      code: `
        const userData = {
          password: 'user-provided-password-12345678901234'
        };
      `,
    },
  ],
  invalid: [
    // ========== INVALID: Direct process.env assignment ==========
    {
      code: `process.env.DB_PASSWORD = 'my-secret-password-12345678901234';`,
      errors: [{ messageId: 'secretsInEnv' }],
    },
    {
      code: `process.env.API_KEY = 'sk-1234567890abcdef1234567890abcdef';`,
      errors: [{ messageId: 'secretsInEnv' }],
    },
    // ========== INVALID: Environment config object ==========
    {
      code: `
        const envConfig = {
          DB_PASSWORD: 'my-secret-password-12345'
        };
      `,
      errors: [{ messageId: 'secretsInEnv' }],
    },
    {
      code: `
        const config = {
          API_SECRET: 'secret-value-here-12345678901235'
        };
      `,
      errors: [{ messageId: 'secretsInEnv' }],
    },
    // ========== INVALID: JWT secret ==========
    {
      code: `
        const envConfig = {
          JWT_SECRET: 'my-jwt-signing-secret-12345678901234567890'
        };
      `,
      errors: [{ messageId: 'secretsInEnv' }],
    },
    // ========== INVALID: Test file with allowInTests: false ==========
    {
      code: `process.env.DB_PASSWORD = 'test-secret-password-12345';`,
      filename: 'setup.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'secretsInEnv' }],
    },
    // ========== INVALID: Bracket notation for process.env ==========
    {
      code: `process.env['API_SECRET'] = 'my-bracket-secret-123456';`,
      errors: [{ messageId: 'secretsInEnv' }],
    },
    {
      code: `process.env['PASSWORD'] = 'my-bracket-password-123456';`,
      errors: [{ messageId: 'secretsInEnv' }],
    },
    // ========== INVALID: Bracket notation for property keys ==========
    {
      code: `
        const envConfig = {
          'DB_PASSWORD': 'string-key-secret-12345'
        };
      `,
      errors: [{ messageId: 'secretsInEnv' }],
    },
    {
      code: `
        const config = {
          'CLIENT_SECRET': 'another-string-secret-123456'
        };
      `,
      errors: [{ messageId: 'secretsInEnv' }],
    },
    // ========== INVALID: Template literals with secrets ==========
    {
      code: 'process.env.DB_PASSWORD = `my-template-secret-${version}-12345`;',
      errors: [{ messageId: 'secretsInEnv' }],
    },
    {
      code: `
        const envConfig = {
          API_KEY: \`hardcoded-template-key-12345\`
        };
      `,
      errors: [{ messageId: 'secretsInEnv' }],
    },
    // ========== INVALID: Custom patterns with additionalPatterns ==========
    {
      code: `
        const settings = {
          MY_CUSTOM_CREDENTIAL: 'custom-cred-value-12345678'
        };
      `,
      options: [{ additionalPatterns: ['custom_credential'] }],
      errors: [{ messageId: 'secretsInEnv' }],
    },
  ],
});
