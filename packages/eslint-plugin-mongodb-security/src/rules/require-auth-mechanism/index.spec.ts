import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireAuthMechanism } from '../require-auth-mechanism/index';

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

ruleTester.run('require-auth-mechanism', requireAuthMechanism, {
  valid: xmo([
    // With authMechanism
    `mongoose.connect(uri, { authMechanism: "SCRAM-SHA-256" });`,
    // createConnection with authMechanism
    `mongoose.createConnection(uri, { authMechanism: "SCRAM-SHA-1" });`,
    // Not a connection method
    `mongoose.model("User", schema);`,
    // Not a member expression
    `connect(uri);`,
    // Test file (allowed by default)
    {
      code: `mongoose.connect(uri);`,
      filename: 'db.test.ts',
    },
  ]),

  invalid: xmo([
    // No options at all
    {
      code: `mongoose.connect(uri);`,
      errors: [{ messageId: 'requireAuthMechanism' }],
    },
    // Options without authMechanism
    {
      code: `mongoose.connect(uri, { useNewUrlParser: true });`,
      errors: [{ messageId: 'requireAuthMechanism' }],
    },
    // createConnection without authMechanism
    {
      code: `mongoose.createConnection(uri, { ssl: true });`,
      errors: [{ messageId: 'requireAuthMechanism' }],
    },
    // Empty options
    {
      code: `mongoose.connect(uri, {});`,
      errors: [{ messageId: 'requireAuthMechanism' }],
    },
    // allowInTests: false
    {
      code: `mongoose.connect(uri);`,
      filename: 'db.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'requireAuthMechanism' }],
    },
  ]),
});

// ---------------------------------------------------------------------------
// Edges pinned by mutation testing (npm run mutation -- --plugin mongodb-security).
// Each fixture is the input that tells the rule apart from a Stryker mutant
// that survived the suite above; see docs/MUTATION_TESTING.md.
// ---------------------------------------------------------------------------

ruleTester.run('mutation-guided edges', requireAuthMechanism, {
  valid: xmo([
    {
      name: 'disconnect() opens no connection',
      code: `import mongoose from 'mongoose';\nmongoose.disconnect();`,
    },
    {
      // The connection string is the other documented place to name it.
      name: 'authMechanism in the connection string, no options',
      code: `import mongoose from 'mongoose';\nmongoose.connect('mongodb://app@db.internal:27017/app?authSource=admin&authMechanism=SCRAM-SHA-256');`,
    },
    {
      name: 'authMechanism in a template-literal connection string',
      code: "import mongoose from 'mongoose';\nmongoose.connect(`mongodb://app@${host}/app?authMechanism=SCRAM-SHA-256`);",
    },
    {
      name: 'authMechanism in the connection string, options without it',
      code: `import mongoose from 'mongoose';\nmongoose.connect('mongodb://app@db.internal/app?authMechanism=MONGODB-X509', { tls: true });`,
    },
  ]),
  invalid: xmo([
    {
      name: 'a connection string with other parameters but no authMechanism',
      code: `import mongoose from 'mongoose';\nmongoose.connect('mongodb://app@db.internal/app?authSource=admin');`,
      errors: [{ messageId: 'requireAuthMechanism' }],
    },
  ]),
});
