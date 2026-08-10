import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnsafePopulate } from '../no-unsafe-populate/index';

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

ruleTester.run('no-unsafe-populate', noUnsafePopulate, {
  valid: xmo([
    // Static string path
    `User.findOne({}).populate("posts");`,
    // Static string path with select
    `User.findOne({}).populate("comments");`,
    // Object with static path
    `User.findOne({}).populate({ path: "posts", select: "title" });`,
    // No arguments
    `User.findOne({}).populate();`,
    // Not populate method
    `User.findOne({}).exec();`,
    // Not a member expression
    `populate("test");`,
    // Test file (allowed by default)
    {
      code: `User.findOne({}).populate(req.body.field);`,
      filename: 'user.test.ts',
    },
  ]),

  invalid: xmo([
    // Direct user input
    {
      code: `User.findOne({}).populate(req.body.field);`,
      errors: [{ messageId: 'unsafePopulate' }],
    },
    // req.query input
    {
      code: `User.findOne({}).populate(req.query.include);`,
      errors: [{ messageId: 'unsafePopulate' }],
    },
    // Variable (potentially tainted)
    {
      code: `User.findOne({}).populate(userField);`,
      errors: [{ messageId: 'unsafePopulate' }],
    },
    // Object with user-controlled path
    {
      code: `User.findOne({}).populate({ path: req.body.field });`,
      errors: [{ messageId: 'unsafePopulate' }],
    },
    // Object with variable path
    {
      code: `User.findOne({}).populate({ path: populatePath });`,
      errors: [{ messageId: 'unsafePopulate' }],
    },
    // allowInTests: false
    {
      code: `User.findOne({}).populate(req.body.field);`,
      filename: 'user.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'unsafePopulate' }],
    },
  ]),
});
