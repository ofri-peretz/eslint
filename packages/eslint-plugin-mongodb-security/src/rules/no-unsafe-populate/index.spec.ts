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

// ---------------------------------------------------------------------------
// Edges pinned by mutation testing (npm run mutation -- --plugin mongodb-security).
// Each fixture is the input that tells the rule apart from a Stryker mutant
// that survived the suite above; see docs/MUTATION_TESTING.md.
// ---------------------------------------------------------------------------

ruleTester.run('mutation-guided edges', noUnsafePopulate, {
  valid: xmo([
    {
      // Only the `path` key names what gets joined; a variable `select` list
      // narrows the fields of a hardcoded path.
      name: 'a hardcoded path with a variable select list',
      code: `Post.find().populate({ path: 'author', select: AUTHOR_FIELDS });`,
    },
  ]),
  invalid: [],
});

ruleTester.run('computed method names', noUnsafePopulate, {
  valid: xmo([
    {
      name: 'a computed method name that is not static is not populate',
      code: `function h(req) { User.findOne({})[method](req.query.p); }`,
    },
  ]),
  invalid: xmo([
    {
      name: "query['populate'](...) is the same call as query.populate(...)",
      code: `function h(req) { User.findOne({})['populate'](req.query.p); }`,
      errors: [{ messageId: 'unsafePopulate' }],
    },
  ]),
});

/**
 * A `const` naming a string is a hardcoded path — the fix this rule's message
 * asks for — and was reported because every identifier was. The forms that
 * build a path from the request (a template literal, an array element) were
 * missed. Owner decision, 2026-10-18.
 */
ruleTester.run('const paths and request-built paths', noUnsafePopulate, {
  valid: xmo([
    {
      name: 'a const string names a hardcoded path',
      code: `const AUTHOR = 'author';\nfunction h(req) { Post.find().populate(AUTHOR); }`,
    },
    {
      name: 'a const template literal with no interpolation',
      code: 'const AUTHOR = `author`;\nfunction h(req) { Post.find().populate(AUTHOR); }',
    },
    {
      name: 'a const string as the path of an options object',
      code: `const AUTHOR = 'author';\nfunction h(req) { Post.find().populate({ path: AUTHOR, select: req.query.f }); }`,
    },
    {
      name: 'an array of literal paths',
      code: `function h(req) { Post.find().populate(['author', , 'comments']); }`,
    },
    {
      name: 'a template literal over constants',
      code: 'function h(req) { Post.find().populate(`${PREFIX}.author`); }',
    },
  ]),
  invalid: xmo([
    {
      name: 'a template literal built from request input',
      code: 'function h(req) { Post.find().populate(`${req.query.rel}`); }',
      errors: [{ messageId: 'unsafePopulate' }],
    },
    {
      name: 'request input in the second interpolation of a template path',
      code: 'function h(req) { Post.find().populate(`${PREFIX}.${req.query.rel}`); }',
      errors: [{ messageId: 'unsafePopulate' }],
    },
    {
      name: 'a request path after another option of the options object',
      code: `function h(req) { Post.find().populate({ select: 'name', path: req.body.rel }); }`,
      errors: [{ messageId: 'unsafePopulate' }],
    },
    {
      name: 'request input as one element of an array of paths',
      code: `function h(req) { Post.find().populate([req.query.rel, 'author']); }`,
      errors: [{ messageId: 'unsafePopulate' }],
    },
    {
      name: 'a request-built template as an element of an array of paths',
      code: "function h(req) { Post.find().populate(['author', `${req.query.rel}.owner`]); }",
      errors: [{ messageId: 'unsafePopulate' }],
    },
    {
      name: 'a template literal built from request input as the path option',
      code: 'function h(req) { Post.find().populate({ path: `${req.body.rel}` }); }',
      errors: [{ messageId: 'unsafePopulate' }],
    },
    {
      name: 'a let string may be reassigned',
      code: `let REL = 'author';\nfunction h(req) { REL = req.query.rel; Post.find().populate(REL); }`,
      errors: [{ messageId: 'unsafePopulate' }],
    },
    {
      name: 'a const that is not a string',
      code: `const REL = pick(req);\nfunction h(req) { Post.find().populate(REL); }`,
      errors: [{ messageId: 'unsafePopulate' }],
    },
    {
      name: 'a const numeric literal is not a path string',
      code: `const REL = 3;\nfunction h(req) { Post.find().populate(REL); }`,
      errors: [{ messageId: 'unsafePopulate' }],
    },
    {
      name: 'a const template literal that interpolates',
      code: 'const REL = `${x}`;\nfunction h(req) { Post.find().populate(REL); }',
      errors: [{ messageId: 'unsafePopulate' }],
    },
    {
      name: 'a destructured const is a read of something else',
      code: `const { REL } = config;\nfunction h(req) { Post.find().populate(REL); }`,
      errors: [{ messageId: 'unsafePopulate' }],
    },
    {
      name: 'a parameter is not a const',
      code: `function h(req, rel) { Post.find().populate(rel); }`,
      errors: [{ messageId: 'unsafePopulate' }],
    },
    {
      name: 'an unresolved global is not a const',
      code: `function h(req) { Post.find().populate(REL); }`,
      errors: [{ messageId: 'unsafePopulate' }],
    },
  ]),
});
