import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnboundedFind } from '../no-unbounded-find/index';

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

ruleTester.run('no-unbounded-find', noUnboundedFind, {
  valid: xmo([
    // find with limit chained
    `User.find({}).limit(100);`,
    // Not a member expression
    `find({});`,
    // Not a find method
    `User.save();`,
    // Test file (allowed by default)
    {
      code: `User.find({});`,
      filename: 'query.test.ts',
    },
    // findOne is bounded by definition (returns at most one document) — never fire
    `User.findOne({ email: 'test@test.com' });`,
    // Long chain ending in .limit() — accept .limit() at any depth
    `db.collection('u').find({ a: 1 }, { projection: { _id: 1 } }).select('-password').limit(100).toArray();`,
    // Native driver: limit option in 2nd arg
    `db.collection('u').find({ a: 1 }, { limit: 50 });`,
  ]),

  invalid: xmo([
    // find without limit
    {
      code: `User.find({});`,
      errors: [{
        messageId: 'unboundedFind',
        suggestions: [{ messageId: 'suggestionAddLimit', output: `User.find({}).limit(100);` }],
      }],
    },
    // find without any chaining
    {
      code: `const users = User.find({ active: true });`,
      errors: [{
        messageId: 'unboundedFind',
        suggestions: [{ messageId: 'suggestionAddLimit', output: `const users = User.find({ active: true }).limit(100);` }],
      }],
    },
    // find with sort but no limit
    {
      code: `User.find({}).sort({ name: 1 });`,
      errors: [{
        messageId: 'unboundedFind',
        suggestions: [{ messageId: 'suggestionAddLimit', output: `User.find({}).limit(100).sort({ name: 1 });` }],
      }],
    },
    // allowInTests: false
    {
      code: `User.find({});`,
      filename: 'query.test.ts',
      options: [{ allowInTests: false }],
      errors: [{
        messageId: 'unboundedFind',
        suggestions: [{ messageId: 'suggestionAddLimit', output: `User.find({}).limit(100);` }],
      }],
    },
  ]),
});
