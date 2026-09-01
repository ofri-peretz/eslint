import { RuleTester } from '@typescript-eslint/rule-tester';
import { noSecretsInEnv } from './index';

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

ruleTester.run('no-secrets-in-env', noSecretsInEnv, {
  valid: lambda([
    // ========== VALID: Reading from process.env ==========
    {
      name: 'reading a secret out of the environment',
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
  ]),
  invalid: lambda([
    // ========== INVALID: Direct process.env assignment ==========
    {
      name: 'a secret assigned into process.env, where the console shows it',
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
  ]),
});
