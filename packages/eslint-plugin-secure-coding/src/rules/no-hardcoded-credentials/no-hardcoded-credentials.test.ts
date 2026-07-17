/**
 * Comprehensive tests for no-hardcoded-credentials rule
 * CWE-798: Use of Hard-coded Credentials
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import { Linter, type Rule } from 'eslint';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noHardcodedCredentials } from './index';

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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'API_KEY', credentialType: 'API key' },
                  output: 'const apiKey = process.env.API_KEY || \'sk_live_FAKE_LIVE_KEY_FOR_TESTING_PURPOSES_ONLY_1234567890\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'API key' },
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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'KEY', credentialType: 'AWS access key' },
                  output: 'const key = process.env.KEY || \'AKIAIOSFODNN7EXAMPLE\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'AWS access key' },
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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'AWS_KEY', credentialType: 'AWS access key' },
                  output: 'const awsKey = process.env.AWS_KEY || \'AKIA1234567890ABCDEF\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'AWS access key' },
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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'API_KEY', credentialType: 'API key' },
                  output: 'const config = { apiKey: process.env.API_KEY || \'sk_test_FAKE_TEST_KEY_FOR_TESTING_PURPOSES_ONLY_ABCDEF\' };',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'API key' },
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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'TOKEN', credentialType: 'JWT token' },
                  output: 'const token = process.env.TOKEN || \'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'JWT token' },
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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'AUTH_TOKEN', credentialType: 'OAuth token' },
                  output: 'const authToken = process.env.AUTH_TOKEN || \'ghp_1234567890123456789012345678901234567890\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'OAuth token' },
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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'TOKEN', credentialType: 'OAuth token' },
                  output: 'const token = process.env.TOKEN || \'gho_1234567890123456789012345678901234567890\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'OAuth token' },
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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'TOKEN', credentialType: 'OAuth token' },
                  output: 'const token = process.env.TOKEN || \'ghu_1234567890123456789012345678901234567890\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'OAuth token' },
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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'TOKEN', credentialType: 'OAuth token' },
                  output: 'const token = process.env.TOKEN || \'ghs_1234567890123456789012345678901234567890\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'OAuth token' },
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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'TOKEN', credentialType: 'OAuth token' },
                  output: 'const token = process.env.TOKEN || \'ghr_1234567890123456789012345678901234567890\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'OAuth token' },
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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'PASSWORD', credentialType: 'Common password' },
                  output: 'const password = process.env.PASSWORD || \'password123\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'Common password' },
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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'PWD', credentialType: 'Common password' },
                  output: 'const pwd = process.env.PWD || \'admin\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'Common password' },
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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'PASS', credentialType: 'Common password' },
                  output: 'const pass = process.env.PASS || \'123456\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'Common password' },
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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'DB_URL', credentialType: 'Database connection string' },
                  output: 'const dbUrl = process.env.DB_URL || \'mysql://user:password@localhost:3306/dbname\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'Database connection string' },
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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'MONGO_URI', credentialType: 'Database connection string' },
                  output: 'const mongoUri = process.env.MONGO_URI || \'mongodb://admin:secret123@localhost:27017/mydb\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'Database connection string' },
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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'CONN_STRING', credentialType: 'Database connection string' },
                  output: 'const connString = process.env.CONN_STRING || \'postgres://user:pass@localhost:5432/db\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'Database connection string' },
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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'SECRET', credentialType: 'Secret key' },
                  output: 'const secret = process.env.SECRET || \'dGhpcyBpcyBhIHNlY3JldCBrZXkgdGhhdCBpcyB2ZXJ5IGxvbmc=\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'Secret key' },
                  output: 'const secret = await getSecret(\'secret\');',
                },
              ],
            },
          ],
        },
        // Note: bare `const key = "..."` was deliberately removed from
        // the rule's credential-name allowlist 2026-05-09 — see the
        // CREDENTIAL_VARIABLE_NAMES comment in the rule source. `key`
        // alone is the canonical name for non-credential dynamic keys
        // (Map keys, AST node keys, dynamic property names, …) and was
        // a major FP source on vercel/ai. Tests using `apiKey`,
        // `secretKey`, `secret` etc. continue to fire correctly via the
        // structural / context-positive paths.
        {
          code: 'const apiKey = "abcdef1234567890abcdef1234567890abcdef12";',
          errors: [
            {
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'API_KEY', credentialType: 'Secret key' },
                  output: 'const apiKey = process.env.API_KEY || \'abcdef1234567890abcdef1234567890abcdef12\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'Secret key' },
                  output: 'const apiKey = await getSecret(\'api_key\');',
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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'API_KEY', credentialType: 'API key' },
                  output: 'const query = process.env.API_KEY || `sk_live_FAKE_LIVE_KEY_FOR_TESTING_PURPOSES_ONLY_123456`;',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'API key' },
                  output: 'const query = await getSecret(\'api_key\');',
                },
              ],
            },
          ],
        },
        {
          code: 'const query = `sk_live_FAKE_LIVE_KEY_FOR_TESTING_PURPOSES_ONLY_123456${someVar}`;',
          errors: [
            {
              messageId: 'useEnvironmentVariable',
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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'API_KEY', credentialType: 'API key' },
                  output: 'const apiKey = process.env.API_KEY || \'sk_test_FAKE_TEST_KEY_FOR_TESTING_PURPOSES_ONLY_1234567890\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'API key' },
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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'API_KEY', credentialType: 'API key' },
                  output: 'const config = { apiKey: process.env.API_KEY || \'sk_live_FAKE_LIVE_KEY_FOR_TESTING_PURPOSES_ONLY_123456\' };',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'API key' },
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
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'MY_API_KEY', credentialType: 'API key' },
                  output: 'const myApiKey = process.env.MY_API_KEY || \'sk_live_FAKE_LIVE_KEY_FOR_TESTING_PURPOSES_ONLY_123456\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'API key' },
                  output: 'const myApiKey = await getSecret(\'my_api_key\');',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Coverage — custom patterns, ambiguous API key, label context, credential-name context', () => {
    ruleTester.run('coverage matrix', noHardcodedCredentials, {
      valid: [
        // customPatterns: an invalid regex must be caught (try/catch) and
        // skipped rather than crash the rule.
        {
          code: 'const value = "anything-at-all-not-a-real-secret-1234567890";',
          options: [{ customPatterns: [{ pattern: '[', type: 'Broken' }] }],
        },
        // isLabelContext — array elements: `labels` var makes array entries
        // UI text, not credentials.
        {
          code: 'const labels = ["Enter password"];',
        },
        // isLabelContext — assignment: input.type = "password" is a UI
        // form-field type, not a credential.
        {
          code: 'input.type = "password";',
        },
        // isLabelContext — string-literal object key matching a label name.
        {
          code: 'const x = { "placeholder": "Enter your password here" };',
        },
        // isLabelContext — setAttribute/getAttribute second arg is UI text.
        {
          code: 'el.setAttribute("type", "password");',
        },
        {
          code: 'el.getAttribute("placeholder");',
        },
      ],
      invalid: [
        // customPatterns: a matching custom pattern fires with the
        // user-supplied type label.
        {
          code: 'const value = "CUSTOM-SECRET-9f8e7d6c5b4a";',
          options: [{ customPatterns: [{ pattern: '^CUSTOM-SECRET-', type: 'Custom secret' }] }],
          errors: [
            {
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'VALUE', credentialType: 'Custom secret' },
                  output: 'const value = process.env.VALUE || \'CUSTOM-SECRET-9f8e7d6c5b4a\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'Custom secret' },
                  output: 'const value = await getSecret(\'value\');',
                },
              ],
            },
          ],
        },
        // Generic 32+-char alphanumeric actually hits the EARLIER
        // `secretKey` structural check (length>=32 + hex/base64-ish
        // shape) before reaching the generic-ambiguous-apikey branch —
        // type is 'Secret key', not 'API key'. Ground-truthed via direct
        // Linter.verify(), not guessed.
        {
          code: 'const apiKey = "aB3xY9zQ7mK1pL5vN8wR2tS6uH4jF0dC";',
          errors: [
            {
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'API_KEY', credentialType: 'Secret key' },
                  output: 'const apiKey = process.env.API_KEY || \'aB3xY9zQ7mK1pL5vN8wR2tS6uH4jF0dC\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'Secret key' },
                  output: 'const apiKey = await getSecret(\'api_key\');',
                },
              ],
            },
          ],
        },
        // inferCredentialTypeFromContext via a Property key (Identifier):
        // context-positive path for a value with no structural pattern
        // match, gated by detectPasswords through the object-key name.
        // NOTE (ground-truthed): the suggestion's `data.credentialType`
        // reads the raw `type` (empty here), not the report's `finalType`
        // ('Credential value') — that's a real, pre-existing asymmetry in
        // the rule's report vs suggest data, not a test mistake.
        {
          code: 'const config = { password: "SuperSecretPhrase!!" };',
          errors: [
            {
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'PASSWORD', credentialType: '' },
                  output: 'const config = { password: process.env.PASSWORD || \'SuperSecretPhrase!!\' };',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: '' },
                  output: 'const config = { password: await getSecret(\'password\') };',
                },
              ],
            },
          ],
        },
        // inferCredentialTypeFromContext via a Property key (string
        // literal, not Identifier). envVarName generation only special-
        // cases an Identifier key, so a literal key falls back to the
        // default API_KEY.
        {
          code: 'const config = { "password": "SuperSecretPhrase!!" };',
          errors: [
            {
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'API_KEY', credentialType: '' },
                  output: 'const config = { "password": process.env.API_KEY || \'SuperSecretPhrase!!\' };',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: '' },
                  output: 'const config = { "password": await getSecret(\'api_key\') };',
                },
              ],
            },
          ],
        },
        // inferCredentialTypeFromContext via AssignmentExpression
        // (obj.password = "...") — also not envVarName-special-cased,
        // falls back to API_KEY.
        {
          code: 'this.password = "SuperSecretPhrase!!";',
          errors: [
            {
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'API_KEY', credentialType: '' },
                  output: 'this.password = process.env.API_KEY || \'SuperSecretPhrase!!\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: '' },
                  output: 'this.password = await getSecret(\'api_key\');',
                },
              ],
            },
          ],
        },
        // inferCredentialTypeFromContext fallthrough to 'other' — a
        // credential-named variable that matches none of the
        // password/token/database/apikey suffix patterns, so the option
        // gates never apply (always honoured). VariableDeclarator IS
        // envVarName-special-cased, so this one does get a real name.
        {
          code: 'const credentials = "SuperSecretPhrase!!";',
          errors: [
            {
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'CREDENTIALS', credentialType: '' },
                  output: 'const credentials = process.env.CREDENTIALS || \'SuperSecretPhrase!!\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: '' },
                  output: 'const credentials = await getSecret(\'credentials\');',
                },
              ],
            },
          ],
        },
        // isCredentialContext — array elements: `const secrets = ['SuperSecretPhrase!!']`
        // walks up through the ArrayExpression to the credential-named
        // var ('secrets' -> singular 'secret' matches). ArrayExpression
        // isn't envVarName-special-cased -> API_KEY fallback.
        {
          code: 'const secrets = ["SuperSecretPhrase!!"];',
          errors: [
            {
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'API_KEY', credentialType: '' },
                  output: 'const secrets = [process.env.API_KEY || \'SuperSecretPhrase!!\'];',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: '' },
                  output: 'const secrets = [await getSecret(\'api_key\')];',
                },
              ],
            },
          ],
        },
        // isCredentialContext — AssignmentExpression with a plain
        // Identifier left-hand side (not MemberExpression). Note: a bare
        // `secretValue` does NOT match matches() (must end in one of the
        // exact credential suffixes, e.g. 'secret' — 'secretValue' ends
        // in 'value', not 'secret') — ground-truthed to emit NO error;
        // `mySecret` (ends in 'secret') is the real positive fixture.
        {
          code: 'let mySecret; mySecret = "SuperSecretPhrase!!";',
          errors: [
            {
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'API_KEY', credentialType: '' },
                  output: 'let mySecret; mySecret = process.env.API_KEY || \'SuperSecretPhrase!!\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: '' },
                  output: 'let mySecret; mySecret = await getSecret(\'api_key\');',
                },
              ],
            },
          ],
        },
        // isCredentialContext — Property with a string-literal key (not
        // Identifier), e.g. `{ 'secretKey': '...' }`.
        {
          code: 'const config = { "secretKey": "SuperSecretPhrase!!" };',
          errors: [
            {
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'API_KEY', credentialType: '' },
                  output: 'const config = { "secretKey": process.env.API_KEY || \'SuperSecretPhrase!!\' };',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: '' },
                  output: 'const config = { "secretKey": await getSecret(\'api_key\') };',
                },
              ],
            },
          ],
        },
      ],
    });
    // Ground-truthed negative: 'secretValue' doesn't match matches() at
    // all (must END in a credential suffix; 'Value' doesn't qualify), so
    // this is a genuinely valid case, not a bug.
    ruleTester.run('secretValue name does not match credential suffix', noHardcodedCredentials, {
      valid: [
        { code: 'let secretValue; secretValue = "SuperSecretPhrase!!";' },
      ],
      invalid: [],
    });
  });

  describe('Coverage — isTestFile filename patterns, remaining label/credential-context branches', () => {
    ruleTester.run('isTestFile filename patterns', noHardcodedCredentials, {
      valid: [
        // Each fixture's filename avoids every earlier pattern in the OR
        // chain so the short-circuit actually reaches this one.
        { code: 'const apiKey = "AKIA1234567890ABCDEF";', filename: 'src/foo.fixture.ts', options: [{ allowInTests: true }] },
        { code: 'const apiKey = "AKIA1234567890ABCDEF";', filename: 'src/foo.mock.ts', options: [{ allowInTests: true }] },
        { code: 'const apiKey = "AKIA1234567890ABCDEF";', filename: 'src/__tests__/foo.ts', options: [{ allowInTests: true }] },
        { code: 'const apiKey = "AKIA1234567890ABCDEF";', filename: 'src/__mocks__/foo.ts', options: [{ allowInTests: true }] },
        { code: 'const apiKey = "AKIA1234567890ABCDEF";', filename: 'src/test/foo.ts', options: [{ allowInTests: true }] },
        { code: 'const apiKey = "AKIA1234567890ABCDEF";', filename: 'src/tests/foo.ts', options: [{ allowInTests: true }] },
        { code: 'const apiKey = "AKIA1234567890ABCDEF";', filename: 'src/fixtures/foo.ts', options: [{ allowInTests: true }] },
        { code: 'const apiKey = "AKIA1234567890ABCDEF";', filename: 'src/mocks/foo.ts', options: [{ allowInTests: true }] },
      ],
      invalid: [],
    });

    ruleTester.run('label and credential context - remaining branches', noHardcodedCredentials, {
      valid: [
        // isLabelContext: Property with an Identifier key that's directly
        // in LABEL_CONTEXT_NAMES ('type').
        { code: 'const config = { type: "password" };' },
        // isLabelContext: Property key isn't label-typed, but the
        // enclosing object's own variable is 'labels' — the Property
        // fallback recursion (walks Property -> ObjectExpression ->
        // VariableDeclarator).
        { code: 'const labels = { foo: "SuperSecretPhrase!!" };' },
        // isLabelContext: MemberExpression call whose method name is
        // neither setAttribute nor getAttribute — false branch of that
        // check, falls through to "not a label", then the value/context
        // don't look like a credential either.
        { code: 'el.someOtherMethod("type", "just-a-plain-value-not-a-secret");' },
        // isCredentialContext: AssignmentExpression to a MemberExpression
        // property whose name doesn't match any credential suffix.
        { code: 'this.randomThing = "just a plain long value";' },
        // isCredentialContext: AssignmentExpression to a bare Identifier
        // whose name doesn't match any credential suffix.
        { code: 'let randomVar; randomVar = "just a plain long value";' },
        // isCredentialContext: Property with an Identifier key that
        // doesn't match any credential suffix.
        { code: 'const config = { randomField: "just a plain long value" };' },
        // isCredentialContext: Property with a string-Literal key that
        // doesn't match any credential suffix.
        { code: 'const config = { "randomField": "just a plain long value" };' },
        // Template literal (no interpolation) whose text doesn't look like
        // a credential.
        { code: '`just a plain safe string`;' },
        // Template literal WITH interpolation whose quasi parts don't look
        // like a credential.
        { code: '`Hello ${name}, welcome!`;' },
      ],
      invalid: [
        // process.env fallback skip-check: the left side of `||` is not a
        // `process.env.X` MemberExpression, so the exemption doesn't
        // apply and a structurally-obvious credential still reports.
        {
          code: 'const apiKey = someOtherFallback || "AKIA1234567890ABCDEF";',
          errors: [
            {
              messageId: 'useEnvironmentVariable',
              suggestions: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'API_KEY', credentialType: 'AWS access key' },
                  output: 'const apiKey = someOtherFallback || process.env.API_KEY || \'AKIA1234567890ABCDEF\';',
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: 'AWS access key' },
                  output: 'const apiKey = someOtherFallback || await getSecret(\'api_key\');',
                },
              ],
            },
          ],
        },
      ],
    });
  });
});

/**
 * Regression lock — the machine-readable finding and the docs metadata must
 * report the SAME CVSS. `formatLLMMessage` → `enrichFromCWE` bakes
 * `CWE_MAPPING['CWE-798'].cvss` into the emitted message at construction time
 * (the rule sets no per-message cvss), so a stale `meta.docs.cvss` silently
 * disagrees with what the rule actually emits — exactly the bug this locks.
 * The published article hardcoded-secrets-ai-agents-autofix.md quotes
 * `CVSS:9.8` as authoritative, so 9.8 is the source of truth.
 * The ecosystem-wide version of this invariant lives in
 * security-cvss-docs-consistency.lock.test.ts.
 */
describe('no-hardcoded-credentials — CVSS docs/message consistency (lock)', () => {
  // CVSS the rule emits in its real finding, via ESLint's Linter API (the same
  // path used to verify the original mismatch).
  function emittedCvss(): number {
    const messages = new Linter().verify(
      `const apiKey = 'sk_live_FAKE_LIVE_KEY_FOR_TESTING_PURPOSES_ONLY_123456';`,
      {
        languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
        plugins: {
          sec: {
            rules: {
              'no-hardcoded-credentials':
                noHardcodedCredentials as unknown as Rule.RuleModule,
            },
          },
        },
        rules: { 'sec/no-hardcoded-credentials': 'error' },
      },
    );
    const finding = messages.find(
      (m) => m.ruleId === 'sec/no-hardcoded-credentials',
    );
    if (!finding) throw new Error('rule emitted no finding for the fixture');
    const match = /CVSS:(\d+(?:\.\d+)?)/.exec(finding.message);
    if (!match)
      throw new Error(`no CVSS token in emitted message: ${finding.message}`);
    return Number(match[1]);
  }

  const docsCvss = (
    noHardcodedCredentials.meta.docs as unknown as { cvss?: number }
  ).cvss;

  it('emitted finding CVSS equals meta.docs.cvss', () => {
    expect(emittedCvss()).toBe(docsCvss);
  });

  it('the agreed CWE-798 score is 9.8 (CWE_MAPPING + article authoritative)', () => {
    expect(docsCvss).toBe(9.8);
    expect(emittedCvss()).toBe(9.8);
  });
});

// Layer 2: raw unit tests against rule.create() with a mock context, for the
// "no grandparent" defensive fallback branches in isLabelContext's
// ObjectExpression/ArrayExpression arms and isCredentialContext's
// ArrayExpression arm. Every real TSESTree node's parent chain terminates at
// Program, so a real ObjectExpression/ArrayExpression parsed from source
// code always has a `.parent` — these branches only exist to guard against a
// detached/synthetic AST fragment, which is exactly what a mock-context node
// is.
describe('Layer 2 - mock context', () => {
  it('isLabelContext returns false when the enclosing ObjectExpression has no parent (detached node)', () => {
    const { listeners, reports } = createWithMockContext(noHardcodedCredentials);
    const literal = listeners.Literal as (node: unknown) => void;

    literal({
      type: 'Literal',
      value: 'just a plain string',
      parent: { type: 'ObjectExpression' },
    });

    expect(reports).toHaveLength(0);
  });

  it('isLabelContext returns false when the enclosing ArrayExpression has no parent (detached node)', () => {
    const { listeners, reports } = createWithMockContext(noHardcodedCredentials);
    const literal = listeners.Literal as (node: unknown) => void;

    literal({
      type: 'Literal',
      value: 'just a plain string',
      parent: { type: 'ArrayExpression' },
    });

    expect(reports).toHaveLength(0);
  });

  it('isCredentialContext returns false when the enclosing ArrayExpression has no parent (detached node)', () => {
    const { listeners, reports } = createWithMockContext(noHardcodedCredentials);
    const literal = listeners.Literal as (node: unknown) => void;

    literal({
      type: 'Literal',
      value: 'just a plain string of decent length',
      parent: { type: 'ArrayExpression' },
    });

    expect(reports).toHaveLength(0);
  });

  it('isLabelContext recurses to the grandparent when the enclosing ObjectExpression has one', () => {
    const { listeners, reports } = createWithMockContext(noHardcodedCredentials);
    const literal = listeners.Literal as (node: unknown) => void;

    literal({
      type: 'Literal',
      value: 'AKIA1234567890ABCDEF',
      parent: {
        type: 'ObjectExpression',
        parent: { type: 'VariableDeclarator', id: { type: 'Identifier', name: 'labels' } },
      },
    });

    expect(reports).toHaveLength(0);
  });

  it('isLabelContext returns true for a JSXAttribute parent', () => {
    const { listeners, reports } = createWithMockContext(noHardcodedCredentials);
    const literal = listeners.Literal as (node: unknown) => void;

    literal({
      type: 'Literal',
      value: 'AKIA1234567890ABCDEF',
      parent: { type: 'JSXAttribute' },
    });

    expect(reports).toHaveLength(0);
  });

  it('isLabelContext returns false when parent is undefined (top-level literal) and a structural match still reports', () => {
    const { listeners, reports } = createWithMockContext(noHardcodedCredentials);
    const literal = listeners.Literal as (node: unknown) => void;

    literal({
      type: 'Literal',
      value: 'AKIA1234567890ABCDEF',
      parent: undefined,
    });

    expect(reports).toHaveLength(1);
  });

  it('isCredentialContext returns false when parent is undefined, gating off an ambiguous match', () => {
    const { listeners, reports } = createWithMockContext(noHardcodedCredentials);
    const literal = listeners.Literal as (node: unknown) => void;

    literal({
      type: 'Literal',
      value: 'aB3xY9zQ7mK1pL5vN8wR2tS6uH4jF0dC',
      parent: undefined,
    });

    expect(reports).toHaveLength(0);
  });

  it('isLabelContext Property fallback does not recurse when the Property has no ObjectExpression parent (detached node)', () => {
    const { listeners, reports } = createWithMockContext(noHardcodedCredentials);
    const literal = listeners.Literal as (node: unknown) => void;

    const node: Record<string, unknown> = { type: 'Literal', value: 'AKIA1234567890ABCDEF' };
    node.parent = {
      type: 'Property',
      key: { type: 'Identifier', name: 'foo' },
      value: node,
      parent: undefined,
    };

    literal(node);

    expect(reports).toHaveLength(1);
  });

  it('isLabelContext Property fallback does not recurse when the enclosing ObjectExpression has no parent (detached node)', () => {
    const { listeners, reports } = createWithMockContext(noHardcodedCredentials);
    const literal = listeners.Literal as (node: unknown) => void;

    const node: Record<string, unknown> = { type: 'Literal', value: 'AKIA1234567890ABCDEF' };
    node.parent = {
      type: 'Property',
      key: { type: 'Identifier', name: 'foo' },
      value: node,
      parent: { type: 'ObjectExpression' },
    };

    literal(node);

    expect(reports).toHaveLength(1);
  });
});

