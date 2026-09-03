import { RuleTester } from '@typescript-eslint/rule-tester';
import { noHardcodedCredentials } from '../no-hardcoded-credentials/index';

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

ruleTester.run('no-hardcoded-credentials', noHardcodedCredentials, {
  valid: xmo([
    // Environment variable
    `const opts = { user: process.env.DB_USER };`,
    // Variable reference
    `const opts = { password: dbPassword };`,
    // Empty string (ignored)
    `const opts = { password: '' };`,
    // Non-credential key
    `const opts = { host: 'localhost' };`,
    // Number value
    `const opts = { port: 27017 };`,
    // Boolean value
    `const opts = { ssl: true };`,
    // Test file (allowed by default)
    {
      code: `const opts = { password: 'secret123' };`,
      filename: 'db.test.ts',
    },
  ]),

  invalid: xmo([
    // Hardcoded password
    {
      code: `const opts = { password: 'secret123' };`,
      errors: [{ messageId: 'hardcodedCredentials' }],
    },
    // Hardcoded user
    {
      code: `const opts = { user: 'admin' };`,
      errors: [{ messageId: 'hardcodedCredentials' }],
    },
    // Hardcoded username
    {
      code: `const config = { username: 'root' };`,
      errors: [{ messageId: 'hardcodedCredentials' }],
    },
    // Hardcoded pass
    {
      code: `const config = { pass: 'mypassword' };`,
      errors: [{ messageId: 'hardcodedCredentials' }],
    },
    // Hardcoded auth
    {
      code: `const config = { auth: 'Bearer token123' };`,
      errors: [{ messageId: 'hardcodedCredentials' }],
    },
    // In connection options
    {
      code: `mongoose.connect(uri, { user: 'admin', pass: 'secret' });`,
      errors: [
        { messageId: 'hardcodedCredentials' },
        { messageId: 'hardcodedCredentials' },
      ],
    },
    // allowInTests: false
    {
      code: `const opts = { password: 'test123' };`,
      filename: 'db.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'hardcodedCredentials' }],
    },
  ]),
});
