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

ruleTester.run('no-env-logging', noEnvLogging, {
  valid: lambda([
    // ========== VALID: Logging specific env vars ==========
    {
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
  ]),
  invalid: lambda([
    // ========== INVALID: Direct process.env logging ==========
    {
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
    // ========== INVALID: Test file with allowInTests: false ==========
    {
      code: `console.log(process.env);`,
      filename: 'handler.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'envLogging' }],
    },
  ]),
});
