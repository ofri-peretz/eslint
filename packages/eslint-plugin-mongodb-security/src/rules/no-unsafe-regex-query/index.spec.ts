import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnsafeRegexQuery } from '../no-unsafe-regex-query/index';

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

ruleTester.run('no-unsafe-regex-query', noUnsafeRegexQuery, {
  valid: xmo([
    // Static regex
    `User.find({ name: { $regex: /^john/i } });`,
    // Static string regex
    `User.find({ name: { $regex: "^john" } });`,
    // No $regex
    `User.find({ name: "john" });`,
    // Non-query method
    `User.save({ name: { $regex: req.body.search } });`,
    // Not a member expression
    `find({ name: { $regex: req.body.search } });`,
    // Test file (allowed by default)
    {
      code: `User.find({ name: { $regex: req.body.search } });`,
      filename: 'search.test.ts',
    },
  ]),

  invalid: xmo([
    // User input in $regex
    {
      code: `User.find({ name: { $regex: req.body.search } });`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // Template literal with expression
    {
      code: 'User.find({ name: { $regex: `${req.query.search}` } });',
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // new RegExp with user input
    {
      code: `User.find({ name: { $regex: new RegExp(req.query.pattern) } });`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // findOne with $regex
    {
      code: `User.findOne({ email: { $regex: req.body.emailPattern } });`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // allowInTests: false
    {
      code: `User.find({ name: { $regex: req.body.search } });`,
      filename: 'search.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'unsafeRegex' }],
    },
  ]),
});
