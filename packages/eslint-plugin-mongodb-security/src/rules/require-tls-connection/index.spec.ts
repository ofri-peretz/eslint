import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireTlsConnection } from '../require-tls-connection/index';

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

ruleTester.run('require-tls-connection', requireTlsConnection, {
  valid: xmo([
    // TLS enabled
    `mongoose.connect(uri, { tls: true });`,
    // SSL enabled
    `mongoose.connect(uri, { ssl: true });`,
    // createConnection with tls
    `mongoose.createConnection(uri, { tls: true });`,
    // Not a connect method
    `mongoose.model('User', schema);`,
    // Function call without member expression
    `connect(uri);`,
    // Test file (allowed by default)
    {
      code: `mongoose.connect('mongodb://localhost:27017/test');`,
      filename: 'db.test.ts',
    },
  ]),

  invalid: xmo([
    // No options at all
    {
      code: `mongoose.connect(uri);`,
      errors: [
        {
          messageId: 'requireTls',
          suggestions: [
            {
              messageId: 'suggestionAddTls',
              output: `mongoose.connect(uri, { tls: true });`,
            },
          ],
        },
      ],
    },
    // Options without tls/ssl
    {
      code: `mongoose.connect(uri, { retryWrites: true });`,
      errors: [
        {
          messageId: 'requireTls',
          suggestions: [
            {
              messageId: 'suggestionAddTls',
              output: `mongoose.connect(uri, { retryWrites: true, tls: true });`,
            },
          ],
        },
      ],
    },
    // tls set to false
    {
      code: `mongoose.connect(uri, { tls: false });`,
      errors: [
        {
          messageId: 'requireTls',
          suggestions: [
            {
              messageId: 'suggestionAddTls',
              output: `mongoose.connect(uri, { tls: true });`,
            },
          ],
        },
      ],
    },
    // createConnection without tls
    {
      code: `mongoose.createConnection(uri, { authSource: 'admin' });`,
      errors: [
        {
          messageId: 'requireTls',
          suggestions: [
            {
              messageId: 'suggestionAddTls',
              output: `mongoose.createConnection(uri, { authSource: 'admin', tls: true });`,
            },
          ],
        },
      ],
    },
    // allowInTests: false
    {
      code: `mongoose.connect(uri);`,
      filename: 'connect.test.ts',
      options: [{ allowInTests: false }],
      errors: [
        {
          messageId: 'requireTls',
          suggestions: [
            {
              messageId: 'suggestionAddTls',
              output: `mongoose.connect(uri, { tls: true });`,
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

ruleTester.run('mutation-guided edges', requireTlsConnection, {
  valid: xmo([
    {
      // "Use of the +srv connection string modifier automatically sets the
      // tls (or the equivalent ssl) option to true" — MongoDB connection
      // string reference.
      name: 'a mongodb+srv:// connection string has TLS on by default',
      code: `import mongoose from 'mongoose';\nmongoose.connect('mongodb+srv://cluster0.example.mongodb.net/app');`,
    },
    {
      name: 'a mongodb+srv:// template literal has TLS on by default',
      code: "import mongoose from 'mongoose';\nmongoose.connect(`mongodb+srv://${host}/app`, { maxPoolSize: 5 });",
    },
    {
      name: 'tls=true in the connection string',
      code: `import mongoose from 'mongoose';\nmongoose.connect('mongodb://db.example.com:27017/app?tls=true', { maxPoolSize: 5 });`,
    },
    {
      name: 'ssl=true in the connection string',
      code: `import mongoose from 'mongoose';\nmongoose.connect('mongodb://db.example.com/app?replicaSet=rs0&ssl=true');`,
    },
  ]),
  invalid: xmo([
    {
      name: 'mongodb+srv:// with tls=false turns the default off',
      code: `import mongoose from 'mongoose';\nmongoose.connect('mongodb+srv://cluster0.example.mongodb.net/app?tls=false');`,
      errors: [
        {
          messageId: 'requireTls',
          suggestions: [
            {
              messageId: 'suggestionAddTls',
              output: `import mongoose from 'mongoose';\nmongoose.connect('mongodb+srv://cluster0.example.mongodb.net/app?tls=false', { tls: true });`,
            },
          ],
        },
      ],
    },
    {
      name: 'mongodb+srv:// with tls: false in the options turns the default off',
      code: `import mongoose from 'mongoose';\nmongoose.connect('mongodb+srv://cluster0.example.mongodb.net/app', { maxPoolSize: 5, tls: false });`,
      errors: [
        {
          messageId: 'requireTls',
          suggestions: [
            {
              messageId: 'suggestionAddTls',
              output: `import mongoose from 'mongoose';\nmongoose.connect('mongodb+srv://cluster0.example.mongodb.net/app', { maxPoolSize: 5, tls: true });`,
            },
          ],
        },
      ],
    },
  ]),
});
