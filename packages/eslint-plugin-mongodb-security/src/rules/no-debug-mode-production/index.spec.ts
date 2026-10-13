import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDebugModeProduction } from '../no-debug-mode-production/index';

/**
 * Every fixture imports mongoose, because the rules now abstain in files with
 * no Mongo in them. Wrapping the arrays rather than editing each fixture means
 * one cannot be left behind — a fixture missing the import would pass
 * vacuously on the gate instead of exercising the detection it was written
 * for. `output` and errors[].suggestions[].output are prefixed too, since
 * autofix fixtures assert the whole file back.
 */
// A SIDE-EFFECT import: satisfies the gate without reserving any binding, so
// fixtures that already declare `mongoose`/`db` do not redeclare.
const asMongo = (code: string): string => `import 'mongoose';\n${code}`;
type MongoSuggestion = { output?: string | null };
type MongoCase = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly MongoSuggestion[] } | string>;
};
const xmo = <T>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asMongo(c) as T;
    const test = c as MongoCase;
    return {
      ...c,
      code: asMongo(test.code),
      ...(typeof test.output === 'string'
        ? { output: asMongo(test.output) }
        : {}),
      ...(test.errors
        ? {
            errors: test.errors.map((e) =>
              typeof e === 'string' || !Array.isArray(e.suggestions)
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asMongo(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });

const ruleTester = new RuleTester();

ruleTester.run('no-debug-mode-production', noDebugModeProduction, {
  valid: xmo([
    // Debug set to false
    `mongoose.set('debug', false);`,
    // Debug based on env check
    `mongoose.set('debug', process.env.NODE_ENV !== 'production');`,
    // Different option
    `mongoose.set('strict', true);`,
    // Not a set() call
    `mongoose.connect(uri);`,
    // Test file (allowed by default)
    {
      code: `mongoose.set('debug', true);`,
      filename: 'setup.test.ts',
    },
  ]),

  invalid: xmo([
    // mongoose.set('debug', true)
    {
      code: `mongoose.set('debug', true);`,
      errors: [
        {
          messageId: 'debugModeProduction',
          suggestions: [
            {
              messageId: 'suggestionGateOnNodeEnv',
              output: `mongoose.set('debug', process.env.NODE_ENV !== 'production');`,
            },
          ],
        },
      ],
    },
    // Any object.set('debug', true)
    {
      code: `db.set('debug', true);`,
      errors: [
        {
          messageId: 'debugModeProduction',
          suggestions: [
            {
              messageId: 'suggestionGateOnNodeEnv',
              output: `db.set('debug', process.env.NODE_ENV !== 'production');`,
            },
          ],
        },
      ],
    },
    // config.set('debug', true) - also flags since any .set('debug', true) is risky
    {
      code: `config.set('debug', true);`,
      errors: [
        {
          messageId: 'debugModeProduction',
          suggestions: [
            {
              messageId: 'suggestionGateOnNodeEnv',
              output: `config.set('debug', process.env.NODE_ENV !== 'production');`,
            },
          ],
        },
      ],
    },
    // allowInTests: false
    {
      code: `mongoose.set('debug', true);`,
      filename: 'setup.test.ts',
      options: [{ allowInTests: false }],
      errors: [
        {
          messageId: 'debugModeProduction',
          suggestions: [
            {
              messageId: 'suggestionGateOnNodeEnv',
              output: `mongoose.set('debug', process.env.NODE_ENV !== 'production');`,
            },
          ],
        },
      ],
    },
  ]),
});

// ---------------------------------------------------------------------------
// Edges pinned by mutation testing (npm run mutation -- --plugin mongodb-security).
// Each fixture is the input that tells the rule apart from a Stryker mutant
// that survived the suite above; see docs/MUTATION_TESTING.md.
// ---------------------------------------------------------------------------

ruleTester.run('mutation-guided edges', noDebugModeProduction, {
  valid: xmo([
    {
      name: 'a bare set() call is not mongoose.set()',
      code: `set('debug', true);`,
    },
    {
      name: "mongoose.set('debug') with no value does not turn debug on",
      code: `mongoose.set('debug');`,
    },
    {
      name: 'only set() configures debug mode',
      code: `cache.put('debug', true);`,
    },
  ]),
  invalid: [],
});

const gated = "process.env.NODE_ENV !== 'production'";

ruleTester.run('object form of set()', noDebugModeProduction, {
  valid: xmo([
    { name: 'debug: false', code: `mongoose.set({ debug: false });` },
    {
      name: 'debug gated on the environment',
      code: `mongoose.set({ debug: process.env.NODE_ENV !== 'production' });`,
    },
    {
      name: 'other options set to true',
      code: `mongoose.set({ strictQuery: true, autoIndex: true });`,
    },
    {
      name: 'a spread of a config object is not traced',
      code: `mongoose.set({ ...options });`,
    },
    { name: 'set() with no arguments', code: `mongoose.set();` },
    {
      name: "a 'debug' string value is not the boolean true",
      code: `mongoose.set({ debug: 'true' });`,
    },
  ]),
  invalid: xmo([
    {
      name: 'mongoose.set({ debug: true })',
      code: `mongoose.set({ debug: true });`,
      errors: [
        {
          messageId: 'debugModeProduction',
          suggestions: [
            {
              messageId: 'suggestionGateOnNodeEnv',
              output: `mongoose.set({ debug: ${gated} });`,
            },
          ],
        },
      ],
    },
    {
      name: 'debug: true alongside other options, with a quoted key',
      code: `mongoose.set({ strictQuery: true, 'debug': true });`,
      errors: [
        {
          messageId: 'debugModeProduction',
          suggestions: [
            {
              messageId: 'suggestionGateOnNodeEnv',
              output: `mongoose.set({ strictQuery: true, 'debug': ${gated} });`,
            },
          ],
        },
      ],
    },
    {
      name: "mongoose['set']('debug', true) is the same call",
      code: `mongoose['set']('debug', true);`,
      errors: [
        {
          messageId: 'debugModeProduction',
          suggestions: [
            {
              messageId: 'suggestionGateOnNodeEnv',
              output: `mongoose['set']('debug', ${gated});`,
            },
          ],
        },
      ],
    },
  ]),
});
