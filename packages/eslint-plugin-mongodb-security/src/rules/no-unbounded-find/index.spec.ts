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
      errors: [
        {
          messageId: 'unboundedFind',
          suggestions: [
            {
              messageId: 'suggestionAddLimit',
              output: `User.find({}).limit(100);`,
            },
          ],
        },
      ],
    },
    // find without any chaining
    {
      code: `const users = User.find({ active: true });`,
      errors: [
        {
          messageId: 'unboundedFind',
          suggestions: [
            {
              messageId: 'suggestionAddLimit',
              output: `const users = User.find({ active: true }).limit(100);`,
            },
          ],
        },
      ],
    },
    // find with sort but no limit
    {
      code: `User.find({}).sort({ name: 1 });`,
      errors: [
        {
          messageId: 'unboundedFind',
          suggestions: [
            {
              messageId: 'suggestionAddLimit',
              output: `User.find({}).limit(100).sort({ name: 1 });`,
            },
          ],
        },
      ],
    },
    // allowInTests: false
    {
      code: `User.find({});`,
      filename: 'query.test.ts',
      options: [{ allowInTests: false }],
      errors: [
        {
          messageId: 'unboundedFind',
          suggestions: [
            {
              messageId: 'suggestionAddLimit',
              output: `User.find({}).limit(100);`,
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

ruleTester.run('mutation-guided edges', noUnboundedFind, {
  valid: xmo([
    {
      name: 'native driver: limit next to a projection in the options object',
      code: `db.collection('u').find({ a: 1 }, { projection: { _id: 1 }, limit: 50 });`,
    },
    {
      // Mongoose's signature is find(filter, projection, options): the
      // options object — and its limit — is the THIRD argument.
      name: 'Mongoose: limit in the options argument after a null projection',
      code: `User.find({ a: 1 }, null, { limit: 10 });`,
    },
    {
      name: 'Mongoose: limit in the options argument after a string projection',
      code: `User.find({ a: 1 }, 'name email', { limit: 10, sort: { name: 1 } });`,
    },
  ]),
  invalid: xmo([
    {
      // The first argument is the filter: this finds every plan whose
      // `limit` field is 5, however many there are.
      name: 'a filter on a field named limit is not a limit',
      code: `Plan.find({ limit: 5 });`,
      errors: [
        {
          messageId: 'unboundedFind',
          suggestions: [
            {
              messageId: 'suggestionAddLimit',
              output: `Plan.find({ limit: 5 }).limit(100);`,
            },
          ],
        },
      ],
    },
    {
      name: 'options that only spread another object show no limit',
      code: `User.find({ a: 1 }, null, { ...pageOptions });`,
      errors: [
        {
          messageId: 'unboundedFind',
          suggestions: [
            {
              messageId: 'suggestionAddLimit',
              output: `User.find({ a: 1 }, null, { ...pageOptions }).limit(100);`,
            },
          ],
        },
      ],
    },
    {
      name: 'Mongoose: an options argument without a limit is still unbounded',
      code: `User.find({ a: 1 }, null, { sort: { a: 1 } });`,
      errors: [
        {
          messageId: 'unboundedFind',
          suggestions: [
            {
              messageId: 'suggestionAddLimit',
              output: `User.find({ a: 1 }, null, { sort: { a: 1 } }).limit(100);`,
            },
          ],
        },
      ],
    },
    {
      // The outer query's .limit() bounds the outer query, not the subquery
      // that builds its filter.
      name: 'a subquery inside a limited query is not bounded by that limit',
      code: `const recent = Post.find({ author: { $in: User.find({ active: true }).distinct('_id') } }).limit(10);`,
      errors: [
        {
          messageId: 'unboundedFind',
          suggestions: [
            {
              messageId: 'suggestionAddLimit',
              output: `const recent = Post.find({ author: { $in: User.find({ active: true }).limit(100).distinct('_id') } }).limit(10);`,
            },
          ],
        },
      ],
    },
  ]),
});
