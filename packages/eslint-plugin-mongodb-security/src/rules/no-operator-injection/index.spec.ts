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
 * Request input is a `.body` / `.query` / `.params` read off a function
 * PARAMETER, so every fixture that means "request input" runs inside a
 * handler. A free `req` is nobody's request.
 */
const inHandler = (code: string): string =>
  `app.post('/r', (req, res, request, ctx) => { ${code} });`;

ruleTester.run('no-operator-injection', noOperatorInjection, {
  valid: xmo([
    // Static values in operators
    `User.find({ age: { $gt: 18 } });`,
    // No user input
    `User.find({ status: { $ne: 'deleted' } });`,
    // $eq with user input is safe
    inHandler(`User.find({ email: { $eq: req.body.email } });`),
    // Non-operator properties
    inHandler(`User.find({ name: req.body.name });`),
    // Test file (allowed by default)
    {
      code: inHandler(`User.find({ age: { $ne: req.body.age } });`),
      filename: 'query.test.ts',
    },
  ]),

  invalid: xmo([
    // $ne with user input
    {
      code: inHandler(`User.find({ age: { $ne: req.body.age } });`),
      errors: [{ messageId: 'operatorInjection' }],
    },
    // $gt with req.query
    {
      code: inHandler(`User.find({ score: { $gt: req.query.minScore } });`),
      errors: [{ messageId: 'operatorInjection' }],
    },
    // $lt with req.params
    {
      code: inHandler(`User.find({ price: { $lt: req.params.maxPrice } });`),
      errors: [{ messageId: 'operatorInjection' }],
    },
    // $exists with request.body
    {
      code: inHandler(`User.find({ field: { $exists: request.body.check } });`),
      errors: [{ messageId: 'operatorInjection' }],
    },
    // $nin with ctx.request.query (Koa)
    {
      code: inHandler(
        `User.find({ role: { $nin: ctx.request.query.roles } });`,
      ),
      errors: [{ messageId: 'operatorInjection' }],
    },
    // allowInTests: false
    {
      code: inHandler(`User.find({ age: { $ne: req.body.age } });`),
      filename: 'query.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'operatorInjection' }],
    },
  ]),
});

/**
 * Request input is found in the AST, not in the source text. The rule used to
 * search the operator value's text for `req.body` and friends: `prereq.bodyCount`
 * contains those characters, Fastify's `request.query` did not. And a value that
 * can only be a primitive cannot be the `{ $ne: null }` object this rule is
 * about. Owner decision, 2026-10-18.
 */
ruleTester.run(
  'request input by AST, primitives are safe',
  noOperatorInjection,
  {
    valid: xmo([
      {
        name: 'a local whose name merely contains "req" and "body"',
        code: inHandler(
          `const prereq = { bodyCount: 1 }; User.find({ n: { $gt: prereq.bodyCount } });`,
        ),
      },
      {
        name: 'a property spelled bodyCount off the request is not its body',
        code: inHandler(`User.find({ n: { $gt: req.bodyCount } });`),
      },
      {
        name: 'a request property written as a string literal',
        code: inHandler(`User.find({ n: { $ne: 'req.body.x' } });`),
      },
      {
        name: 'a free req that is not a handler parameter',
        code: `User.find({ n: { $ne: req.body.x } });`,
      },
      {
        name: 'Number() makes the bound a number',
        code: inHandler(`User.find({ n: { $gt: Number(req.query.min) } });`),
      },
      {
        name: 'parseInt() makes the bound a number',
        code: inHandler(
          `User.find({ n: { $gte: parseInt(req.query.min, 10) } });`,
        ),
      },
      {
        name: 'parseFloat() makes the bound a number',
        code: inHandler(
          `User.find({ n: { $lt: parseFloat(req.query.max) } });`,
        ),
      },
      {
        name: 'Number.parseInt() is the same parser',
        code: inHandler(
          `User.find({ n: { $lte: Number.parseInt(req.query.max, 10) } });`,
        ),
      },
      {
        name: 'Number.parseFloat() is the same parser',
        code: inHandler(
          `User.find({ n: { $lte: Number.parseFloat(req.query.max) } });`,
        ),
      },
      {
        name: 'String() makes the operand a string',
        code: inHandler(`User.find({ n: { $ne: String(req.query.x) } });`),
      },
      {
        name: 'unary + makes the bound a number',
        code: inHandler(`User.find({ n: { $gt: +req.query.min } });`),
      },
      {
        name: 'a template literal makes the operand a string',
        code: inHandler('User.find({ n: { $ne: `${req.query.x}` } });'),
      },
      {
        name: 'arithmetic over request input is a number',
        code: inHandler(`User.find({ n: { $gt: req.query.min * 1 } });`),
      },
      {
        name: 'an array of coerced values',
        code: inHandler(
          `User.find({ n: { $nin: [Number(req.query.a), , 3] } });`,
        ),
      },
      {
        name: 'a default between two values that are not request input',
        code: inHandler(`User.find({ n: { $gt: min || 0 } });`),
      },
      {
        name: 'a conditional between two values that are not request input',
        code: inHandler(`User.find({ n: { $gt: ok ? min : 0 } });`),
      },
      {
        name: 'a call over values that are not request input',
        code: inHandler(`User.find({ n: { $gt: pick(min, max) } });`),
      },
      {
        name: 'a call on Number that is not a parser',
        code: inHandler(`User.find({ n: { $gt: Number.isNaN(min) } });`),
      },
    ]),
    invalid: xmo([
      {
        name: "Fastify's (request, reply) handler reads request.query",
        code: `import 'fastify';\nfastify.get('/u', async (request, reply) => { await User.find({ n: { $ne: request.query.x } }); });`,
        errors: [{ messageId: 'operatorInjection' }],
      },
      {
        name: 'a request value behind a default',
        code: inHandler(`User.find({ n: { $gt: req.query.min || 0 } });`),
        errors: [{ messageId: 'operatorInjection' }],
      },
      {
        name: 'a request value as the default',
        code: inHandler(
          `User.find({ n: { $gt: fallback ?? req.query.min } });`,
        ),
        errors: [{ messageId: 'operatorInjection' }],
      },
      {
        name: 'a request value in either branch of a conditional',
        code: inHandler(`User.find({ n: { $gt: ok ? 0 : req.query.min } });`),
        errors: [{ messageId: 'operatorInjection' }],
      },
      {
        name: 'a request value in the consequent of a conditional',
        code: inHandler(`User.find({ n: { $gt: ok ? req.query.min : 0 } });`),
        errors: [{ messageId: 'operatorInjection' }],
      },
      {
        name: 'a request value as an element of a $nin array',
        code: inHandler(
          `User.find({ role: { $nin: [, 'root', req.query.role] } });`,
        ),
        errors: [{ messageId: 'operatorInjection' }],
      },
      {
        name: 'a request array spread into a $nin array',
        code: inHandler(`User.find({ role: { $nin: [...req.query.roles] } });`),
        errors: [{ messageId: 'operatorInjection' }],
      },
      {
        name: 'JSON.parse turns a request string back into an object',
        code: inHandler(
          `User.find({ n: { $gt: JSON.parse(req.query.min) } });`,
        ),
        errors: [{ messageId: 'operatorInjection' }],
      },
      {
        name: 'a non-parser method on Number does not coerce its argument',
        code: inHandler(
          `User.find({ n: { $gt: Number.wrap(req.query.min) } });`,
        ),
        errors: [{ messageId: 'operatorInjection' }],
      },
      {
        name: 'request input as the first of several call arguments',
        code: inHandler(
          `User.find({ n: { $gt: JSON.parse(req.query.min, reviver) } });`,
        ),
        errors: [{ messageId: 'operatorInjection' }],
      },
      {
        name: 'a callee that is not a name does not coerce',
        code: inHandler(`User.find({ n: { $gt: make()(req.query.min) } });`),
        errors: [{ messageId: 'operatorInjection' }],
      },
      {
        name: 'a method of Number chosen at runtime is not known to parse',
        code: inHandler(
          `User.find({ n: { $gt: Number[fn](req.query.min) } });`,
        ),
        errors: [{ messageId: 'operatorInjection' }],
      },
      {
        name: 'a method named like a parser on another object does not coerce',
        code: inHandler(
          `User.find({ n: { $gt: util.parseInt(req.query.min) } });`,
        ),
        errors: [{ messageId: 'operatorInjection' }],
      },
    ]),
  },
);
