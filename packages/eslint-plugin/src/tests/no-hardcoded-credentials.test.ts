/**
 * Comprehensive tests for no-hardcoded-credentials rule
 * CWE-798: Use of Hard-coded Credentials
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noHardcodedCredentials } from '../rules/security/no-hardcoded-credentials';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('no-hardcoded-credentials', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - no hardcoded credentials', noHardcodedCredentials, {
      valid: [
        // Environment variables
        {
          code: 'const apiKey = process.env.API_KEY;',
        },
        {
          code: 'const password = process.env.DATABASE_PASSWORD;',
        },
        {
          code: 'const config = { apiKey: process.env.API_KEY };',
        },
        // Short strings (below minLength)
        {
          code: 'const key = "short";',
        },
        {
          code: 'const pass = "1234567";', // 7 chars, below default minLength of 8
        },
        // Non-credential strings
        {
          code: 'const message = "Hello, world!";',
        },
        {
          code: 'const url = "https://example.com/api";',
        },
        // Ignored patterns
        {
          code: 'const testKey = "test-api-key-12345";',
          options: [{ ignorePatterns: ['^test-'] }],
        },
        // Test files (when allowInTests is true)
        {
          code: 'const apiKey = "sk_test_FAKE_TEST_KEY_FOR_TESTING_PURPOSES_ONLY_1234567890";',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
        {
          code: 'const password = "test-password-123";',
          filename: '__tests__/config.test.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - API Keys', () => {
    ruleTester.run('invalid - API keys', noHardcodedCredentials, {
      valid: [],
      invalid: [
        {
          code: 'const apiKey = "sk_live_FAKE_LIVE_KEY_FOR_TESTING_PURPOSES_ONLY_1234567890";',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const apiKey = process.env.API_KEY || \'sk_live_FAKE_LIVE_KEY_FOR_TESTING_PURPOSES_ONLY_1234567890\';',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const apiKey = await getSecret(\'api_key\');',
                },
              ],
            },
          ],
        },
        {
          code: 'const key = "AKIAIOSFODNN7EXAMPLE";',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const key = process.env.KEY || \'AKIAIOSFODNN7EXAMPLE\';',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const key = await getSecret(\'key\');',
                },
              ],
            },
          ],
        },
        {
          code: 'const awsKey = "AKIA1234567890ABCDEF";',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const awsKey = process.env.AWS_KEY || \'AKIA1234567890ABCDEF\';',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const awsKey = await getSecret(\'aws_key\');',
                },
              ],
            },
          ],
        },
        {
          code: 'const config = { apiKey: "sk_test_FAKE_TEST_KEY_FOR_TESTING_PURPOSES_ONLY_ABCDEF" };',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const config = { apiKey: process.env.API_KEY || \'sk_test_FAKE_TEST_KEY_FOR_TESTING_PURPOSES_ONLY_ABCDEF\' };',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const config = { apiKey: await getSecret(\'api_key\') };',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Tokens', () => {
    ruleTester.run('invalid - tokens', noHardcodedCredentials, {
      valid: [],
      invalid: [
        {
          code: 'const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const token = process.env.TOKEN || \'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c\';',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const token = await getSecret(\'token\');',
                },
              ],
            },
          ],
        },
        {
          code: 'const authToken = "ghp_1234567890123456789012345678901234567890";',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const authToken = process.env.AUTH_TOKEN || \'ghp_1234567890123456789012345678901234567890\';',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const authToken = await getSecret(\'auth_token\');',
                },
              ],
            },
          ],
        },
        {
          code: 'const token = "gho_1234567890123456789012345678901234567890";',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const token = process.env.TOKEN || \'gho_1234567890123456789012345678901234567890\';',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const token = await getSecret(\'token\');',
                },
              ],
            },
          ],
        },
        {
          code: 'const token = "ghu_1234567890123456789012345678901234567890";',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const token = process.env.TOKEN || \'ghu_1234567890123456789012345678901234567890\';',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const token = await getSecret(\'token\');',
                },
              ],
            },
          ],
        },
        {
          code: 'const token = "ghs_1234567890123456789012345678901234567890";',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const token = process.env.TOKEN || \'ghs_1234567890123456789012345678901234567890\';',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const token = await getSecret(\'token\');',
                },
              ],
            },
          ],
        },
        {
          code: 'const token = "ghr_1234567890123456789012345678901234567890";',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const token = process.env.TOKEN || \'ghr_1234567890123456789012345678901234567890\';',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const token = await getSecret(\'token\');',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Passwords', () => {
    ruleTester.run('invalid - passwords', noHardcodedCredentials, {
      valid: [],
      invalid: [
        {
          code: 'const password = "password123";',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const password = process.env.PASSWORD || \'password123\';',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const password = await getSecret(\'password\');',
                },
              ],
            },
          ],
        },
        {
          code: 'const pwd = "admin";',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const pwd = process.env.PWD || \'admin\';',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const pwd = await getSecret(\'pwd\');',
                },
              ],
            },
          ],
        },
        {
          code: 'const pass = "123456";',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const pass = process.env.PASS || \'123456\';',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const pass = await getSecret(\'pass\');',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Database Connection Strings', () => {
    ruleTester.run('invalid - database strings', noHardcodedCredentials, {
      valid: [],
      invalid: [
        {
          code: 'const dbUrl = "mysql://user:password@localhost:3306/dbname";',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const dbUrl = process.env.DB_URL || \'mysql://user:password@localhost:3306/dbname\';',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const dbUrl = await getSecret(\'db_url\');',
                },
              ],
            },
          ],
        },
        {
          code: 'const mongoUri = "mongodb://admin:secret123@localhost:27017/mydb";',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const mongoUri = process.env.MONGO_URI || \'mongodb://admin:secret123@localhost:27017/mydb\';',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const mongoUri = await getSecret(\'mongo_uri\');',
                },
              ],
            },
          ],
        },
        {
          code: 'const connString = "postgres://user:pass@localhost:5432/db";',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const connString = process.env.CONN_STRING || \'postgres://user:pass@localhost:5432/db\';',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const connString = await getSecret(\'conn_string\');',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Secret Keys', () => {
    ruleTester.run('invalid - secret keys', noHardcodedCredentials, {
      valid: [],
      invalid: [
        {
          code: 'const secret = "dGhpcyBpcyBhIHNlY3JldCBrZXkgdGhhdCBpcyB2ZXJ5IGxvbmc=";',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const secret = process.env.SECRET || \'dGhpcyBpcyBhIHNlY3JldCBrZXkgdGhhdCBpcyB2ZXJ5IGxvbmc=\';',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const secret = await getSecret(\'secret\');',
                },
              ],
            },
          ],
        },
        {
          code: 'const key = "abcdef1234567890abcdef1234567890abcdef12";',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const key = process.env.KEY || \'abcdef1234567890abcdef1234567890abcdef12\';',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const key = await getSecret(\'key\');',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Template Literals', () => {
    ruleTester.run('template literals', noHardcodedCredentials, {
      valid: [],
      invalid: [
        {
          code: 'const query = `sk_live_FAKE_LIVE_KEY_FOR_TESTING_PURPOSES_ONLY_123456`;',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const query = process.env.API_KEY || `sk_live_FAKE_LIVE_KEY_FOR_TESTING_PURPOSES_ONLY_123456`;',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const query = await getSecret(\'api_key\');',
                },
              ],
            },
          ],
        },
        {
          code: 'const query = `${someVar}_sk_live_FAKE_LIVE_KEY_FOR_TESTING_PURPOSES_ONLY_123456_suffix`;',
          errors: [
            {
              messageId: 'hardcodedCredential',
              // Template literals with interpolations don't have suggestions
            },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options testing', noHardcodedCredentials, {
      valid: [
        // Ignore patterns
        {
          code: 'const key = "test-api-key-12345678901234567890";',
          options: [{ ignorePatterns: ['^test-'] }],
        },
        // Custom minLength
        {
          code: 'const key = "short123";',
          options: [{ minLength: 10 }],
        },
        // Disable API key detection
        {
          code: 'const key = "sk_live_FAKE_LIVE_KEY_FOR_TESTING_PURPOSES_ONLY_1234567890";',
          options: [{ detectApiKeys: false }],
        },
        // Disable password detection
        {
          code: 'const password = "password123";',
          options: [{ detectPasswords: false }],
        },
        // Disable token detection
        {
          code: 'const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";',
          options: [{ detectTokens: false }],
        },
        // Disable database string detection
        {
          code: 'const dbUrl = "mysql://user:password@localhost:3306/dbname";',
          options: [{ detectDatabaseStrings: false }],
        },
      ],
      invalid: [
        // Test file but allowInTests is false
        {
          code: 'const apiKey = "sk_test_FAKE_TEST_KEY_FOR_TESTING_PURPOSES_ONLY_1234567890";',
          filename: 'test.spec.ts',
          options: [{ allowInTests: false }],
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const apiKey = process.env.API_KEY || \'sk_test_FAKE_TEST_KEY_FOR_TESTING_PURPOSES_ONLY_1234567890\';',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const apiKey = await getSecret(\'api_key\');',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noHardcodedCredentials, {
      valid: [
        // Non-string literals
        {
          code: 'const num = 12345;',
        },
        {
          code: 'const bool = true;',
        },
        {
          code: 'const obj = { key: "value" };',
        },
      ],
      invalid: [
        // Variable in object property
        {
          code: 'const config = { apiKey: "sk_live_FAKE_LIVE_KEY_FOR_TESTING_PURPOSES_ONLY_123456" };',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const config = { apiKey: process.env.API_KEY || \'sk_live_FAKE_LIVE_KEY_FOR_TESTING_PURPOSES_ONLY_123456\' };',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const config = { apiKey: await getSecret(\'api_key\') };',
                },
              ],
            },
          ],
        },
        // Variable declaration
        {
          code: 'const myApiKey = "sk_live_FAKE_LIVE_KEY_FOR_TESTING_PURPOSES_ONLY_123456";',
          errors: [
            {
              messageId: 'hardcodedCredential',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  output: 'const myApiKey = process.env.MY_API_KEY || \'sk_live_FAKE_LIVE_KEY_FOR_TESTING_PURPOSES_ONLY_123456\';',
                },
                {
                  messageId: 'useSecretManager',
                  output: 'const myApiKey = await getSecret(\'my_api_key\');',
                },
              ],
            },
          ],
        },
      ],
    });
  });
});

