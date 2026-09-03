import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnsafeWhere } from '../no-unsafe-where/index';

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

ruleTester.run('no-unsafe-where', noUnsafeWhere, {
  valid: xmo([
    // Normal query operators
    `User.find({ age: { $gt: 18 } });`,
    // Standard Mongoose where (field-based)
    `User.find().where('age').gt(18);`,
    // No $where in object
    `User.find({ name: 'John' });`,
    // Test file (allowed by default)
    {
      code: `User.find({ $where: 'this.age > 18' });`,
      filename: 'query.test.ts',
    },
  ]),

  invalid: xmo([
    // $where in query object (string property)
    {
      code: `User.find({ $where: 'this.age > 18' });`,
      errors: [{ messageId: 'unsafeWhere' }],
    },
    // $where with function
    {
      code: `User.find({ $where: function() { return this.age > 18; } });`,
      errors: [{ messageId: 'unsafeWhere' }],
    },
    // $where as quoted key
    {
      code: `db.collection('users').find({ '$where': 'this.isAdmin' });`,
      errors: [{ messageId: 'unsafeWhere' }],
    },
    // .where('$where') method call
    {
      code: `User.find().where('$where', 'this.age > 18');`,
      errors: [{ messageId: 'unsafeWhere' }],
    },
    // allowInTests: false
    {
      code: `User.find({ $where: 'this.isDanger' });`,
      filename: 'query.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'unsafeWhere' }],
    },
  ]),
});
