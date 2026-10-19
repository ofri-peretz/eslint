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

// ---------------------------------------------------------------------------
// Edges pinned by mutation testing (npm run mutation -- --plugin mongodb-security).
// Each fixture is the input that tells the rule apart from a Stryker mutant
// that survived the suite above; see docs/MUTATION_TESTING.md.
// ---------------------------------------------------------------------------

ruleTester.run('mutation-guided edges', noUnsafeRegexQuery, {
  valid: xmo([
    {
      name: 'a template literal with no interpolation is a constant pattern',
      code: 'User.find({ name: { $regex: `^admin` } });',
    },
  ]),
  invalid: [],
});

ruleTester.run('regex sinks the property loop missed', noUnsafeRegexQuery, {
  valid: xmo([
    {
      name: '$or branches with a literal $regex',
      code: `User.find({ $or: [{ name: { $regex: '^a' } }] });`,
    },
    {
      name: '$or branches that are not object literals are not walked',
      code: `User.find({ $or: [branch, , ...rest] });`,
    },
    {
      name: 'an array under a non-operator key is not a filter',
      code: `User.find({ tags: [{ name: { $regex: req.query.q } }] });`,
    },
    {
      name: 'a $or operand that is not an array literal has no branches to walk',
      code: `User.find({ $or: conditions });`,
    },
    {
      name: 'a RegExp built from a literal',
      code: `User.find({ name: new RegExp('^admin') });`,
    },
    {
      name: 'a RegExp with no pattern argument',
      code: `User.find({ name: new RegExp() });`,
    },
    {
      name: 'a RegExp built from a local value',
      code: `User.find({ name: RegExp(pattern) });`,
    },
    {
      name: 'a constructor that is not RegExp',
      code: `User.find({ name: new Matcher(req.query.q) });`,
    },
    {
      name: 'a RegExp from request input under a key other than $regex',
      code: `User.find({ name: { $options: new RegExp(req.query.q) } });`,
    },
    {
      name: 'a computed method name that is not static is not a known method',
      code: `User[method]({ name: { $regex: req.query.q } });`,
    },
    {
      name: 'a key computed at runtime is not known to be a logical operator',
      code: `User.find({ [op]: [{ name: { $regex: req.query.q } }] });`,
    },
  ]),
  invalid: xmo([
    {
      name: '$regex from request input inside $or',
      code: `User.find({ $or: [{ name: { $regex: req.query.q } }] });`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    {
      name: '$regex from request input inside $and, two levels down',
      code: `User.find({ $and: [{ $nor: [{ name: { $regex: req.body.q } }] }] });`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    {
      name: "a quoted '$or' key",
      code: `User.find({ '$or': [{ name: { $regex: req.query.q } }] });`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    {
      // Mongo matches a RegExp filter value exactly as it does `$regex`.
      name: 'new RegExp(req.query.q) as the filter value',
      code: `User.find({ name: new RegExp(req.query.q) });`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    {
      name: 'RegExp(req.query.q) without new',
      code: `User.find({ name: RegExp(req.query.q, 'i') });`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    {
      name: 'RegExp(req.query.q) without new, as the $regex value',
      code: `User.find({ name: { $regex: RegExp(req.query.q) } });`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    {
      name: 'new RegExp(req.query.q) inside $or',
      code: `User.find({ $or: [{ name: new RegExp(req.query.q) }] });`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    {
      name: "User['find'](...) is the same call as User.find(...)",
      code: `User['find']({ name: { $regex: req.query.q } });`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
  ]),
});

/**
 * An escaped value interpolated into a `$regex` template is the rule's own
 * documented fix — `` `^${escapeRegex(q)}` `` anchors a value that can no
 * longer carry a metacharacter. It was reported, because every interpolation
 * was. Owner decision, 2026-10-18.
 */
ruleTester.run('escaped interpolation', noUnsafeRegexQuery, {
  valid: xmo([
    {
      name: 'the documented fix: an anchored escapeRegex() value',
      code: 'User.find({ name: { $regex: `^${escapeRegex(req.query.q)}` } });',
    },
    {
      name: "lodash's escapeRegExp, called off the namespace",
      code: 'User.find({ name: { $regex: `^${_.escapeRegExp(req.query.q)}$` } });',
    },
    {
      name: 'a bare escapeRegExp()',
      code: 'User.find({ name: { $regex: `${escapeRegExp(req.query.q)}` } });',
    },
    {
      name: 'escape-string-regexp under its conventional name',
      code: 'User.find({ name: { $regex: `^${escapeStringRegexp(req.query.q)}` } });',
    },
    {
      name: 'escape-string-regexp imported under any name',
      code: "import esc from 'escape-string-regexp';\nUser.find({ name: { $regex: `^${esc(req.query.q)}` } });",
    },
    {
      name: 'lodash.escaperegexp required under any name',
      code: "const quote = require('lodash.escaperegexp');\nUser.find({ name: { $regex: `^${quote(req.query.q)}` } });",
    },
    {
      name: 'every interpolation escaped',
      code: 'User.find({ name: { $regex: `^${escapeRegex(a)}-${escapeRegex(b)}` } });',
    },
  ]),
  invalid: xmo([
    {
      name: 'one escaped interpolation does not cover another',
      code: 'User.find({ name: { $regex: `^${escapeRegex(a)}-${req.query.q}` } });',
      errors: [{ messageId: 'unsafeRegex' }],
    },
    {
      name: 'a helper that is not an escaper',
      code: 'User.find({ name: { $regex: `^${trim(req.query.q)}` } });',
      errors: [{ messageId: 'unsafeRegex' }],
    },
    {
      name: 'an unrelated module imported under an escaper-like name',
      code: "import esc from 'html-escaper';\nUser.find({ name: { $regex: `^${esc(req.query.q)}` } });",
      errors: [{ messageId: 'unsafeRegex' }],
    },
    {
      name: 'a named export of an escaping module is not its default',
      code: "import { other } from 'escape-string-regexp';\nUser.find({ name: { $regex: `^${other(req.query.q)}` } });",
      errors: [{ messageId: 'unsafeRegex' }],
    },
    {
      name: 'a computed member is not known to be an escaper',
      code: 'User.find({ name: { $regex: `^${_[fn](req.query.q)}` } });',
      errors: [{ messageId: 'unsafeRegex' }],
    },
    {
      name: 'a called call is not an escaper',
      code: 'User.find({ name: { $regex: `^${make()(req.query.q)}` } });',
      errors: [{ messageId: 'unsafeRegex' }],
    },
  ]),
});
