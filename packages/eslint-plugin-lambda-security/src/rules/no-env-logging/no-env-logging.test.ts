import { RuleTester } from '@typescript-eslint/rule-tester';
import { noEnvLogging } from './index';

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
const lambda = <T>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asLambda(c) as T;
    const test = c as Case;
    return {
      ...c,
      code: asLambda(test.code),
      // Autofix and suggestion fixtures assert the WHOLE file back, so every
      // `output` needs the same prefix or each fixable rule fails on the header
      // alone — including the ones nested under errors[].suggestions[].
      ...(typeof test.output === 'string'
        ? { output: asLambda(test.output) }
        : {}),
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

ruleTester.run('no-env-logging', noEnvLogging, {
  valid: lambda([
    // ========== VALID: Logging specific env vars ==========
    {
      name: 'logging one non-secret variable by name',
      code: `console.log('Region:', process.env.AWS_REGION);`,
    },
    {
      code: `console.log('Node env:', process.env.NODE_ENV);`,
    },
    {
      code: `logger.info({ region: process.env.AWS_REGION });`,
    },
    // ========== VALID: No process.env in logs ==========
    {
      code: `console.log('Hello world');`,
    },
    {
      code: `console.log(userId, requestId);`,
    },
    // ========== VALID: Test file ==========
    {
      code: `console.log(process.env);`,
      filename: 'handler.test.ts',
    },
    // ========== VALID: Not a logging call ==========
    {
      code: `const env = process.env;`,
    },
    {
      code: `validateConfig(process.env);`,
    },
    // ========== VALID: Other object logging ==========
    {
      code: `console.log(JSON.stringify({ config }));`,
    },
    // ========== VALID: What reaches the log holds no value ==========
    {
      name: 'the list of variable names carries no secret values',
      code: `console.log('Environment:', Object.keys(process.env));`,
    },
    {
      name: 'a template literal coerces the object to "[object Object]"',
      code: 'console.log(`Starting with env: ${process.env}`);',
    },
    {
      name: 'string concatenation coerces the object the same way',
      code: `console.log('env: ' + process.env);`,
    },
    {
      name: 'a named variable inside a structured payload',
      code: `logger.debug('Config', { region: process.env.AWS_REGION, tags: [process.env.STAGE] });`,
    },
    {
      name: 'a computed console method that is not a logging method',
      code: `console['table'](process.env);`,
    },
    {
      name: 'a non-logging call nested in a payload',
      code: `console.log('Config', loadConfig(process.env));`,
    },
  ]),
  invalid: lambda([
    // ========== INVALID: Direct process.env logging ==========
    {
      name: 'logging the whole environment prints every secret in it',
      code: `console.log(process.env);`,
      errors: [{ messageId: 'envLogging' }],
    },
    {
      code: `console.info(process.env);`,
      errors: [{ messageId: 'envLogging' }],
    },
    {
      code: `console.debug(process.env);`,
      errors: [{ messageId: 'envLogging' }],
    },
    // ========== INVALID: JSON.stringify of process.env ==========
    {
      code: `console.log(JSON.stringify(process.env));`,
      errors: [{ messageId: 'envLogging' }],
    },
    // ========== INVALID: Logger with process.env ==========
    {
      code: `logger.info(process.env);`,
      errors: [{ messageId: 'envLogging' }],
    },
    {
      code: `log.debug(process.env);`,
      errors: [{ messageId: 'envLogging' }],
    },
    // ========== INVALID: The whole object nested in what is logged ==========
    {
      name: 'the environment as a property of a structured log payload',
      code: `logger.debug('Environment', { env: process.env });`,
      errors: [{ messageId: 'envLogging' }],
    },
    {
      name: 'the environment spread into a structured log payload',
      code: `console.log('Environment:', { ...process.env });`,
      errors: [{ messageId: 'envLogging' }],
    },
    {
      name: 'the environment inside an array argument',
      code: `console.log(['env', process.env]);`,
      errors: [{ messageId: 'envLogging' }],
    },
    {
      name: 'every entry of the environment',
      code: `console.log(Object.entries(process.env));`,
      errors: [{ messageId: 'envLogging' }],
    },
    {
      name: 'a serialized environment concatenated into the message',
      code: `console.log('env: ' + JSON.stringify(process.env, null, 2));`,
      errors: [{ messageId: 'envLogging' }],
    },
    {
      name: 'a serialized environment interpolated into the message',
      code: 'console.log(`env: ${JSON.stringify(process.env)}`);',
      errors: [{ messageId: 'envLogging' }],
    },
    {
      name: 'a fallback that may log the whole environment',
      code: `console.log(debug ? process.env : {});`,
      errors: [{ messageId: 'envLogging' }],
    },
    {
      name: 'the environment on the else branch of a fallback',
      code: `console.log(redact ? {} : process.env);`,
      errors: [{ messageId: 'envLogging' }],
    },
    {
      name: 'a default that may log the whole environment',
      code: `console.log(overrides ?? process.env);`,
      errors: [{ messageId: 'envLogging' }],
    },
    {
      name: 'a cast does not change what is logged',
      code: `console.log(process.env as Record<string, string>);`,
      errors: [{ messageId: 'envLogging' }],
    },
    {
      name: 'console method spelled as a string subscript',
      code: `console['log']('Environment:', process.env);`,
      errors: [{ messageId: 'envLogging' }],
    },
    {
      name: 'process.env spelled as a string subscript',
      code: `console.log(process['env']);`,
      errors: [{ messageId: 'envLogging' }],
    },
    // ========== INVALID: Test file with allowInTests: false ==========
    {
      code: `console.log(process.env);`,
      filename: 'handler.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'envLogging' }],
    },
  ]),
});
