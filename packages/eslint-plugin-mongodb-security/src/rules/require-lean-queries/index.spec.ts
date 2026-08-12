import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireLeanQueries } from '../require-lean-queries/index';

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
const xmo = <T,>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asMongo(c) as T;
    const test = c as MongoCase;
    return {
      ...c,
      code: asMongo(test.code),
      ...(typeof test.output === 'string' ? { output: asMongo(test.output) } : {}),
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

ruleTester.run('require-lean-queries', requireLeanQueries, {
  valid: xmo([
    // With .lean()
    `User.find({}).lean();`,
    // findOne with .lean()
    `User.findOne({ email }).lean();`,
    // findById with .lean()
    `User.findById(id).lean();`,
    // Chained with other methods and .lean()
    `User.find({}).sort({ name: 1 }).lean();`,
    // Not a query method
    `User.save({});`,
    // Not a member expression
    `find({});`,
    // Test file (allowed by default)
    {
      code: `User.find({});`,
      filename: 'user.test.ts',
    },
  ]),

  invalid: xmo([
    // find without .lean()
    {
      code: `User.find({});`,
      errors: [{
        messageId: 'useLean',
        suggestions: [{ messageId: 'suggestionAddLean', output: `User.find({}).lean();` }],
      }],
    },
    // findOne without .lean()
    {
      code: `User.findOne({ email: "test@test.com" });`,
      errors: [{
        messageId: 'useLean',
        suggestions: [{ messageId: 'suggestionAddLean', output: `User.findOne({ email: "test@test.com" }).lean();` }],
      }],
    },
    // findById without .lean()
    {
      code: `User.findById(id);`,
      errors: [{
        messageId: 'useLean',
        suggestions: [{ messageId: 'suggestionAddLean', output: `User.findById(id).lean();` }],
      }],
    },
    // Chained with sort but no .lean()
    {
      code: `User.find({}).sort({ name: 1 });`,
      errors: [{
        messageId: 'useLean',
        suggestions: [{ messageId: 'suggestionAddLean', output: `User.find({}).lean().sort({ name: 1 });` }],
      }],
    },
    // allowInTests: false
    {
      code: `User.find({});`,
      filename: 'user.test.ts',
      options: [{ allowInTests: false }],
      errors: [{
        messageId: 'useLean',
        suggestions: [{ messageId: 'suggestionAddLean', output: `User.find({}).lean();` }],
      }],
    },
  ]),
});
