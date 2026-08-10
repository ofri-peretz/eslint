import { RuleTester } from '@typescript-eslint/rule-tester';
import { noBypassMiddleware } from '../no-bypass-middleware/index';

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

ruleTester.run('no-bypass-middleware', noBypassMiddleware, {
  valid: xmo([
    // findOne is safe (triggers middleware)
    `User.findOne({ _id: id });`,
    // save() triggers middleware
    `user.save();`,
    // find() triggers middleware
    `User.find({});`,
    // create() triggers middleware
    `User.create({ name: 'John' });`,
    // Not a member expression
    `updateOne({});`,
    // Test file (allowed by default)
    {
      code: `User.updateOne({ _id: id }, { $set: { active: false } });`,
      filename: 'user.test.ts',
    },
  ]),

  invalid: xmo([
    // updateOne bypasses middleware
    {
      code: `User.updateOne({ _id: id }, { $set: { active: false } });`,
      errors: [{ messageId: 'bypassMiddleware' }],
    },
    // updateMany bypasses middleware
    {
      code: `User.updateMany({}, { $set: { active: false } });`,
      errors: [{ messageId: 'bypassMiddleware' }],
    },
    // deleteOne bypasses middleware
    {
      code: `User.deleteOne({ _id: id });`,
      errors: [{ messageId: 'bypassMiddleware' }],
    },
    // deleteMany bypasses middleware
    {
      code: `User.deleteMany({ old: true });`,
      errors: [{ messageId: 'bypassMiddleware' }],
    },
    // findOneAndUpdate bypasses middleware
    {
      code: `User.findOneAndUpdate({ _id: id }, { $set: { name: 'New' } });`,
      errors: [{ messageId: 'bypassMiddleware' }],
    },
    // findOneAndDelete bypasses middleware
    {
      code: `User.findOneAndDelete({ _id: id });`,
      errors: [{ messageId: 'bypassMiddleware' }],
    },
    // insertMany bypasses middleware
    {
      code: `User.insertMany([{ name: 'A' }, { name: 'B' }]);`,
      errors: [{ messageId: 'bypassMiddleware' }],
    },
    // bulkWrite bypasses middleware
    {
      code: `User.bulkWrite([{ updateOne: { filter: {}, update: {} } }]);`,
      errors: [{ messageId: 'bypassMiddleware' }],
    },
    // allowInTests: false
    {
      code: `User.updateOne({ _id: id }, { $set: { x: 1 } });`,
      filename: 'user.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'bypassMiddleware' }],
    },
  ]),
});
