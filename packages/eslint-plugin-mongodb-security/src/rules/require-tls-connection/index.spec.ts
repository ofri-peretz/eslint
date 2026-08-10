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
      errors: [{
        messageId: 'requireTls',
        suggestions: [{ messageId: 'suggestionAddTls', output: `mongoose.connect(uri, { tls: true });` }],
      }],
    },
    // Options without tls/ssl
    {
      code: `mongoose.connect(uri, { retryWrites: true });`,
      errors: [{
        messageId: 'requireTls',
        suggestions: [{ messageId: 'suggestionAddTls', output: `mongoose.connect(uri, { retryWrites: true, tls: true });` }],
      }],
    },
    // tls set to false
    {
      code: `mongoose.connect(uri, { tls: false });`,
      errors: [{
        messageId: 'requireTls',
        suggestions: [{ messageId: 'suggestionAddTls', output: `mongoose.connect(uri, { tls: true });` }],
      }],
    },
    // createConnection without tls
    {
      code: `mongoose.createConnection(uri, { authSource: 'admin' });`,
      errors: [{
        messageId: 'requireTls',
        suggestions: [{ messageId: 'suggestionAddTls', output: `mongoose.createConnection(uri, { authSource: 'admin', tls: true });` }],
      }],
    },
    // allowInTests: false
    {
      code: `mongoose.connect(uri);`,
      filename: 'connect.test.ts',
      options: [{ allowInTests: false }],
      errors: [{
        messageId: 'requireTls',
        suggestions: [{ messageId: 'suggestionAddTls', output: `mongoose.connect(uri, { tls: true });` }],
      }],
    },
  ]),
});
