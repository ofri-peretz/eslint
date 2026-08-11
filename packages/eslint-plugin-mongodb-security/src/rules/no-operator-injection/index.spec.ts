import { RuleTester } from '@typescript-eslint/rule-tester';
import { noOperatorInjection } from '../no-operator-injection/index';

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

ruleTester.run('no-operator-injection', noOperatorInjection, {
  valid: xmo([
    // Static values in operators
    `User.find({ age: { $gt: 18 } });`,
    // No user input
    `User.find({ status: { $ne: 'deleted' } });`,
    // $eq with user input is safe
    `User.find({ email: { $eq: req.body.email } });`,
    // Non-operator properties
    `User.find({ name: req.body.name });`,
    // Test file (allowed by default)
    {
      code: `User.find({ age: { $ne: req.body.age } });`,
      filename: 'query.test.ts',
    },
  ]),

  invalid: xmo([
    // $ne with user input
    {
      code: `User.find({ age: { $ne: req.body.age } });`,
      errors: [{ messageId: 'operatorInjection' }],
    },
    // $gt with req.query
    {
      code: `User.find({ score: { $gt: req.query.minScore } });`,
      errors: [{ messageId: 'operatorInjection' }],
    },
    // $lt with req.params
    {
      code: `User.find({ price: { $lt: req.params.maxPrice } });`,
      errors: [{ messageId: 'operatorInjection' }],
    },
    // $exists with request.body
    {
      code: `User.find({ field: { $exists: request.body.check } });`,
      errors: [{ messageId: 'operatorInjection' }],
    },
    // $nin with ctx.request.body
    {
      code: `User.find({ role: { $nin: ctx.request.roles } });`,
      errors: [{ messageId: 'operatorInjection' }],
    },
    // allowInTests: false
    {
      code: `User.find({ age: { $ne: req.body.age } });`,
      filename: 'query.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'operatorInjection' }],
    },
  ]),
});
