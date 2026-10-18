import { RuleTester } from '@typescript-eslint/rule-tester';
import { noSelectSensitiveFields } from '../no-select-sensitive-fields/index';

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

ruleTester.run('no-select-sensitive-fields', noSelectSensitiveFields, {
  valid: xmo([
    // Query with .select() excluding sensitive fields
    `User.find({}).select("-password -refreshToken");`,
    // Query with .select() returning only safe fields
    `User.find({}).select("name email");`,
    // Non-query method
    `User.save({ password: 'test' });`,
    // Not a member expression
    `find({});`,
    // Test file (allowed by default)
    {
      code: `User.find({});`,
      filename: 'user.test.ts',
    },
    // findOne with select
    `User.findOne({ email }).select("-password -secret");`,
    // findById with select
    `User.findById(id).select("name");`,
  ]),

  invalid: xmo([
    // find without .select(), schema in view
    {
      code: `const userSchema = new Schema({ email: String, password: String });\nUser.find({});`,
      errors: [{ messageId: 'selectSensitiveFields' }],
    },
    // findOne without .select()
    {
      code: `const userSchema = new Schema({ email: String, password: String });\nUser.findOne({ email: req.body.email });`,
      errors: [{ messageId: 'selectSensitiveFields' }],
    },
    // findById without .select()
    {
      code: `const userSchema = new Schema({ email: String, password: String });\nUser.findById(req.params.id);`,
      errors: [{ messageId: 'selectSensitiveFields' }],
    },
    // select that includes sensitive field
    {
      code: `User.find({}).select("name password email");`,
      errors: [{ messageId: 'selectSensitiveFields' }],
    },
    // allowInTests: false
    {
      code: `const userSchema = new Schema({ email: String, password: String });\nUser.find({});`,
      filename: 'user.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'selectSensitiveFields' }],
    },
  ]),
});

// ---------------------------------------------------------------------------
// Edges pinned by mutation testing (npm run mutation -- --plugin mongodb-security).
// Each fixture is the input that tells the rule apart from a Stryker mutant
// that survived the suite above; see docs/MUTATION_TESTING.md.
// ---------------------------------------------------------------------------

const SCHEMA = `const userSchema = new Schema({ email: String, password: String });\n`;

ruleTester.run('mutation-guided edges', noSelectSensitiveFields, {
  valid: xmo([
    {
      // The default-on test-file exemption, with a sensitive field in view so
      // the exemption — not the visibility check — is what keeps it quiet.
      name: 'a test file is exempt even with a password field in view',
      code: `${SCHEMA}User.find({});`,
      filename: 'user.test.ts',
    },
    {
      name: 'a native-driver inclusion projection alongside other options',
      code: `${SCHEMA}db.collection('users').find({}, { limit: 10, projection: { name: 1 } });`,
    },
    {
      name: 'a native-driver inclusion projection after spread options',
      code: `${SCHEMA}db.collection('users').find({}, { ...readOptions, projection: { name: 1 } });`,
    },
    {
      name: 'an inclusion projection with quoted keys is still an inclusion projection',
      code: `${SCHEMA}db.collection('users').find({}, { projection: { 'name': 1, 'email': 1 } });`,
    },
    {
      name: 'Array.prototype.find in a file that declares a password field',
      code: `${SCHEMA}const hit = items.find((i) => i.id === id);`,
    },
  ]),
  invalid: xmo([
    {
      // `$slice` is not an inclusion: every other field — password included —
      // comes back.
      name: 'a $slice-only projection returns the whole document',
      code: `${SCHEMA}db.collection('users').find({}, { projection: { comments: { $slice: 5 } } });`,
      errors: [{ messageId: 'selectSensitiveFields' }],
    },
    {
      name: 'a sensitive field declared under a quoted key is still in view',
      code: `const userSchema = new Schema({ 'password': String });\nUser.findOne({});`,
      errors: [{ messageId: 'selectSensitiveFields' }],
    },
    {
      name: '.lean() is not .select() — the chain still returns every field',
      code: `${SCHEMA}User.findOne({ a: 1 }).lean();`,
      errors: [{ messageId: 'selectSensitiveFields' }],
    },
  ]),
});
