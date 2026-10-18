import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnsafeQuery } from './index';

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
//
// The handler wrapper is load-bearing, not decoration. `readsRequestShape`
// asks whether the chain's root ARRIVED as a parameter — that is the whole
// reason a local `const req = {...}` no longer counts as user input. A fixture
// written as bare top-level `req.body.email` has `req` as an unresolved
// global, which is neither a parameter nor a local, so it correctly reports
// nothing. Every fixture below therefore has to sit inside a handler, exactly
// as the code it models does. Wrapping here rather than per-fixture means one
// cannot be left behind and pass vacuously.
const asMongo = (code: string): string =>
  `import 'mongoose';\napp.post('/r', (req, res, request, ctx) => {\n${code}\n});`;
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

/**
 * Helper to create an invalid test case with suggestions
 */
function createInvalidCase(
  code: string,
  output: string,
  options?: { filename?: string; options?: [object] },
) {
  return {
    code,
    ...(options?.filename ? { filename: options.filename } : {}),
    ...(options?.options ? { options: options.options } : {}),
    errors: [
      {
        messageId: 'unsafeQuery' as const,
        suggestions: [
          {
            messageId: 'suggestionUseEq' as const,
            output,
          },
        ],
      },
    ],
  };
}

ruleTester.run('no-unsafe-query', noUnsafeQuery, {
  valid: xmo([
    // =================================================================
    // TRUE NEGATIVES: Safe patterns that should NOT trigger
    // =================================================================

    // TN-1: Using $eq operator explicitly - prevents operator injection
    `User.find({ email: { $eq: req.body.email } })`,

    // TN-1b: no filter at all. `find()` returns the whole collection and is
    // ordinary Mongo — there is no argument to judge, safe or otherwise.
    `User.find()`,

    // TN-2: Literal values are always safe
    `db.collection('users').find({ active: true })`,

    // TN-3: String literal values
    `User.findOne({ role: 'admin' })`,

    // TN-4: Number literal values
    `User.find({ age: 25 })`,

    // TN-5: Null literal values
    `User.find({ deletedAt: null })`,

    // TN-6: Using sanitized input with $eq
    `User.findOne({ email: { $eq: sanitizedEmail } })`,

    // TN-7: Not a MongoDB method - Array.find()
    `someArray.find(x => x.id === req.body.id)`,

    // TN-8: Not a MongoDB method - Object.keys()
    `Object.keys(req.body)`,

    // TN-9: Empty query object
    `User.find({})`,

    // TN-10: Query with only operators (no user input)
    `User.find({ age: { $gt: 18, $lt: 65 } })`,

    // TN-11: Nested object with literals
    `User.find({ 'address.city': 'New York' })`,

    // TN-12: Array of literals
    `User.find({ role: { $in: ['admin', 'moderator'] } })`,

    // TN-13: Mongoose model method without query arg
    `User.findById(someId)`,

    // TN-14: RegExp literal (not user input)
    `User.find({ name: /^John/ })`,

    // TN-15: Date object (not user input)
    `User.find({ createdAt: { $gt: new Date('2023-01-01') } })`,

    // TN-16: Second argument to updateOne is safe
    `User.updateOne({ _id: { $eq: id } }, { $set: req.body })`,

    // TN-17: Aggregation pipeline (different AST structure)
    `User.aggregate([{ $match: { active: true } }])`,

    // TN-18: In test file (default allowInTests: true)
    {
      code: `User.find({ email: req.body.email })`,
      filename: 'user.test.ts',
    },

    // TN-19: In spec file
    {
      code: `User.find({ email: req.body.email })`,
      filename: 'user.spec.ts',
    },

    // TN-20: allowInTests: false still allows $eq pattern
    {
      code: `User.find({ email: { $eq: req.body.email } })`,
      filename: 'user.test.ts',
      options: [{ allowInTests: false }],
    },

    // TN-21: Custom method not in additionalMethods list
    {
      code: `User.customFindMethod({ email: req.body.email })`,
      options: [{ additionalMethods: ['otherMethod'] }],
    },
  ]),

  invalid: xmo([
    // =================================================================
    // TRUE POSITIVES: Vulnerable patterns that MUST trigger
    // =================================================================

    // TP-1: Direct req.body in query (classic attack vector)
    createInvalidCase(
      `User.find({ email: req.body.email })`,
      `User.find({ email: { $eq: req.body.email } })`,
    ),

    // TP-2: Direct req.query in findOne
    createInvalidCase(
      `db.collection('users').findOne({ username: req.query.user })`,
      `db.collection('users').findOne({ username: { $eq: req.query.user } })`,
    ),

    // TP-3: req.params in updateOne filter
    createInvalidCase(
      `User.updateOne({ _id: req.params.id }, { $set: { active: true } })`,
      `User.updateOne({ _id: { $eq: req.params.id } }, { $set: { active: true } })`,
    ),

    // TP-4: Multiple user inputs in same query (first error)
    {
      code: `User.findOne({ email: req.body.email, password: req.body.password })`,
      errors: [
        {
          messageId: 'unsafeQuery',
          suggestions: [
            {
              messageId: 'suggestionUseEq',
              output: `User.findOne({ email: { $eq: req.body.email }, password: req.body.password })`,
            },
          ],
        },
        {
          messageId: 'unsafeQuery',
          suggestions: [
            {
              messageId: 'suggestionUseEq',
              output: `User.findOne({ email: req.body.email, password: { $eq: req.body.password } })`,
            },
          ],
        },
      ],
    },

    // TP-5: ctx.request.body (Koa style)
    createInvalidCase(
      `User.find({ email: ctx.request.body.email })`,
      `User.find({ email: { $eq: ctx.request.body.email } })`,
    ),

    // TP-6: ctx.query (Koa style)
    createInvalidCase(
      `User.find({ search: ctx.query.term })`,
      `User.find({ search: { $eq: ctx.query.term } })`,
    ),

    // TP-7: request.body (alternative naming)
    createInvalidCase(
      `User.find({ email: request.body.email })`,
      `User.find({ email: { $eq: request.body.email } })`,
    ),

    // TP-8: request.query
    createInvalidCase(
      `User.find({ search: request.query.q })`,
      `User.find({ search: { $eq: request.query.q } })`,
    ),

    // TP-9: request.params
    createInvalidCase(
      `User.deleteOne({ _id: request.params.id })`,
      `User.deleteOne({ _id: { $eq: request.params.id } })`,
    ),

    // TP-10: deleteMany with user input
    createInvalidCase(
      `User.deleteMany({ userId: req.body.userId })`,
      `User.deleteMany({ userId: { $eq: req.body.userId } })`,
    ),

    // TP-11: findOneAndUpdate with user input in filter
    createInvalidCase(
      `User.findOneAndUpdate({ email: req.body.email }, { $set: { active: true } })`,
      `User.findOneAndUpdate({ email: { $eq: req.body.email } }, { $set: { active: true } })`,
    ),

    // TP-12: findOneAndDelete with user input
    createInvalidCase(
      `User.findOneAndDelete({ _id: req.params.id })`,
      `User.findOneAndDelete({ _id: { $eq: req.params.id } })`,
    ),

    // TP-13: replaceOne with user input in filter
    createInvalidCase(
      `User.replaceOne({ _id: req.params.id }, newDoc)`,
      `User.replaceOne({ _id: { $eq: req.params.id } }, newDoc)`,
    ),

    // TP-14: countDocuments with user input
    createInvalidCase(
      `User.countDocuments({ status: req.query.status })`,
      `User.countDocuments({ status: { $eq: req.query.status } })`,
    ),

    // =================================================================
    // OPTIONS: allowInTests: false
    // =================================================================

    // OPT-1: Test file with allowInTests: false should flag
    createInvalidCase(
      `User.find({ email: req.body.email })`,
      `User.find({ email: { $eq: req.body.email } })`,
      { filename: 'user.test.ts', options: [{ allowInTests: false }] },
    ),

    // OPT-2: Spec file with allowInTests: false should flag
    createInvalidCase(
      `User.find({ email: req.body.email })`,
      `User.find({ email: { $eq: req.body.email } })`,
      { filename: 'user.spec.ts', options: [{ allowInTests: false }] },
    ),

    // =================================================================
    // OPTIONS: additionalMethods
    // =================================================================

    // OPT-3: Custom method added via additionalMethods
    createInvalidCase(
      `User.customFind({ email: req.body.email })`,
      `User.customFind({ email: { $eq: req.body.email } })`,
      { options: [{ additionalMethods: ['customFind'] }] },
    ),
  ]),
});

// ---------------------------------------------------------------------------
// Edges pinned by mutation testing (npm run mutation -- --plugin mongodb-security).
// Each fixture is the input that tells the rule apart from a Stryker mutant
// that survived the suite above; see docs/MUTATION_TESTING.md.
// ---------------------------------------------------------------------------

const inHandler = (body: string): string =>
  `app.post('/users', async (req, res) => { ${body} });`;

ruleTester.run('mutation-guided edges', noUnsafeQuery, {
  valid: xmo([
    {
      // The documented fix: a coerced string cannot carry `{ $ne: null }`.
      name: 'String(req.body.x) coerces the value before it reaches the filter',
      code: inHandler(`await User.find({ name: String(req.body.name) });`),
    },
    {
      name: 'a comparison of request input yields a boolean, not an operator object',
      code: inHandler(
        `await User.find({ isAdmin: req.body.role === 'admin' });`,
      ),
    },
    {
      name: 'a filter built by a helper from a non-request value',
      code: inHandler(`await User.find(buildFilter(id));`),
    },
    {
      name: 'spreading a constant default filter',
      code: inHandler(
        `await User.find({ ...DEFAULT_FILTER, deleted: false });`,
      ),
    },
  ]),
  invalid: xmo([
    {
      name: 'the message names the request path that reached the filter',
      code: inHandler(`await User.find({ email: req.body.email });`),
      errors: [
        {
          messageId: 'unsafeQuery',
          data: { input: 'req.body.email' },
          suggestions: [
            {
              messageId: 'suggestionUseEq',
              output: inHandler(
                `await User.find({ email: { $eq: req.body.email } });`,
              ),
            },
          ],
        },
      ],
    },
    {
      // Spreading the body into the filter is find(req.body) with extra keys:
      // `{ "password": { "$ne": null } }` in the body lands in the query.
      name: 'spreading the request body into the filter object',
      code: inHandler(`await User.findOne({ ...req.body, deleted: false });`),
      errors: [{ messageId: 'unsafeQuery' }],
    },
    {
      name: 'spreading a nested request object into the filter object',
      code: inHandler(`await User.find({ ...req.query.filters });`),
      errors: [{ messageId: 'unsafeQuery' }],
    },
  ]),
});

/**
 * `$or` / `$and` / `$nor` take an ARRAY of filter documents, and each branch is
 * a filter in its own right. The property loop stopped at the array, so a
 * request value one level down was never seen.
 */
const nested = (code: string, fixed: string) => ({
  code: inHandler(code),
  errors: [
    {
      messageId: 'unsafeQuery' as const,
      suggestions: [
        { messageId: 'suggestionUseEq' as const, output: inHandler(fixed) },
      ],
    },
  ],
});

ruleTester.run('logical operators and computed method names', noUnsafeQuery, {
  valid: xmo([
    {
      name: '$or branches holding only literals',
      code: inHandler(`await User.find({ $or: [{ name: 'a' }, { age: 3 }] });`),
    },
    {
      name: '$or branches that are not object literals are not walked',
      code: inHandler(`await User.find({ $or: [branch, , ...rest] });`),
    },
    {
      // Only the logical operators hold filters. An array value of any other
      // key is an equality match on an array, which an operator object
      // inside it cannot turn into an operator.
      name: 'an array of objects under a non-operator key is a literal value',
      code: inHandler(`await User.find({ tags: [{ name: req.body.name }] });`),
    },
    {
      name: 'a computed method name that is not static is not a known method',
      code: inHandler(`await User[method]({ name: req.body.name });`),
    },
    {
      name: 'a key computed at runtime is not known to be a logical operator',
      code: inHandler(`await User.find({ [op]: [{ name: req.body.name }] });`),
    },
  ]),
  invalid: xmo([
    {
      name: 'request input inside $or',
      ...nested(
        `await User.find({ $or: [{ name: req.body.name }] });`,
        `await User.find({ $or: [{ name: { $eq: req.body.name } }] });`,
      ),
    },
    {
      name: 'request input inside $and',
      ...nested(
        `await User.find({ $and: [{ active: true }, { name: req.query.name }] });`,
        `await User.find({ $and: [{ active: true }, { name: { $eq: req.query.name } }] });`,
      ),
    },
    {
      name: 'request input inside $nor, with a quoted key',
      ...nested(
        `await User.find({ '$nor': [{ name: req.query.name }] });`,
        `await User.find({ '$nor': [{ name: { $eq: req.query.name } }] });`,
      ),
    },
    {
      name: 'request input two logical levels down',
      ...nested(
        `await User.find({ $and: [{ $or: [{ name: req.body.name }] }] });`,
        `await User.find({ $and: [{ $or: [{ name: { $eq: req.body.name } }] }] });`,
      ),
    },
    {
      name: 'a spread of the request body inside a $or branch',
      code: inHandler(`await User.find({ $or: [{ ...req.body }] });`),
      errors: [{ messageId: 'unsafeQuery' }],
    },
    {
      // Not an array literal, so there are no branches to walk — the whole
      // operand is request input and is reported as a value.
      name: 'a $or operand taken whole from the request',
      ...nested(
        `await User.find({ $or: req.body.conditions });`,
        `await User.find({ $or: { $eq: req.body.conditions } });`,
      ),
    },
    {
      name: "User['findOne'](...) is the same call as User.findOne(...)",
      ...nested(
        `await User['findOne']({ name: req.body.name });`,
        `await User['findOne']({ name: { $eq: req.body.name } });`,
      ),
    },
  ]),
});

/**
 * Coercion to a string is coercion to a string, whichever way it is spelled.
 * `String(req.body.x)` was quiet while `` `${req.body.x}` `` and
 * `'a' + req.body.x` were CRITICAL findings, although all three turn a
 * `{ "$ne": null }` body into `'[object Object]'`. Owner decision, 2026-10-18.
 */
ruleTester.run('string-coerced request input', noUnsafeQuery, {
  valid: xmo([
    {
      name: 'a template literal over request input is a string',
      code: inHandler('await User.find({ name: `${req.body.name}` });'),
    },
    {
      name: 'request input in any interpolation of a template is still a string',
      code: inHandler(
        'await User.find({ slug: `${prefix}-${req.body.name}` });',
      ),
    },
    {
      name: 'concatenating request input yields a string',
      code: inHandler(`await User.find({ name: 'user:' + req.body.name });`),
    },
    {
      name: 'adding two request values yields a string or a number',
      code: inHandler(
        `await User.find({ name: req.body.first + req.body.last });`,
      ),
    },
    {
      name: 'a template-literal id passed as the whole filter',
      code: inHandler('await User.findById(`${req.params.id}`);'),
    },
    {
      name: 'a String()-coerced id passed as the whole filter',
      code: inHandler(`await User.findById(String(req.params.id));`),
    },
    {
      name: 'a concatenated id passed as the whole filter',
      code: inHandler(`await User.findById('user:' + req.params.id);`),
    },
    {
      name: 'a helper over a concatenation of constants',
      code: inHandler(`await User.find(build('a' + suffix));`),
    },
  ]),
  invalid: xmo([
    {
      // The coercion has to be the value itself. A helper handed request
      // input can return an object — `JSON.parse` is the usual one.
      name: 'a filter built by a call over request input is not a coercion',
      code: inHandler(`await User.find(JSON.parse(req.query.filter));`),
      errors: [
        {
          messageId: 'unsafeQuery',
          suggestions: [
            {
              messageId: 'suggestionUseEq',
              output: inHandler(
                `await User.find({ $eq: JSON.parse(req.query.filter) });`,
              ),
            },
          ],
        },
      ],
    },
    {
      // JSON assembled from a string and parsed back is an object again, and
      // `x","$ne":"` in the body puts an operator in it.
      name: 'request input concatenated into JSON that is parsed into the filter',
      code: inHandler(
        `await User.find(JSON.parse('{"name":"' + req.body.name + '"}'));`,
      ),
      errors: [
        {
          messageId: 'unsafeQuery',
          suggestions: [
            {
              messageId: 'suggestionUseEq',
              output: inHandler(
                `await User.find({ $eq: JSON.parse('{"name":"' + req.body.name + '"}') });`,
              ),
            },
          ],
        },
      ],
    },
    {
      name: 'request input templated into JSON that is parsed into the filter',
      code: inHandler(
        'await User.find(JSON.parse(`{"name":"${req.body.name}"}`));',
      ),
      errors: [
        {
          messageId: 'unsafeQuery',
          suggestions: [
            {
              messageId: 'suggestionUseEq',
              output: inHandler(
                'await User.find({ $eq: JSON.parse(`{"name":"${req.body.name}"}`) });',
              ),
            },
          ],
        },
      ],
    },
    {
      name: 'request input in the second interpolation of parsed JSON',
      code: inHandler(
        'await User.find(JSON.parse(`{"a":"${a}","name":"${req.body.name}"}`));',
      ),
      errors: [
        {
          messageId: 'unsafeQuery',
          suggestions: [
            {
              messageId: 'suggestionUseEq',
              output: inHandler(
                'await User.find({ $eq: JSON.parse(`{"a":"${a}","name":"${req.body.name}"}`) });',
              ),
            },
          ],
        },
      ],
    },
    {
      name: 'a callee that is not a name is not String()',
      code: inHandler(`await User.findById(make()(req.params.id));`),
      errors: [
        {
          messageId: 'unsafeQuery',
          suggestions: [
            {
              messageId: 'suggestionUseEq',
              output: inHandler(
                `await User.findById({ $eq: make()(req.params.id) });`,
              ),
            },
          ],
        },
      ],
    },
    {
      name: 'a call other than String() over request input is not a coercion',
      code: inHandler(`await User.findById(toId(req.params.id));`),
      errors: [
        {
          messageId: 'unsafeQuery',
          suggestions: [
            {
              messageId: 'suggestionUseEq',
              output: inHandler(
                `await User.findById({ $eq: toId(req.params.id) });`,
              ),
            },
          ],
        },
      ],
    },
  ]),
});
