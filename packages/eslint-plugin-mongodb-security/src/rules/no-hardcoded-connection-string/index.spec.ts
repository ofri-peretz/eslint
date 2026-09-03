import { RuleTester } from '@typescript-eslint/rule-tester';
import { noHardcodedConnectionString } from '../no-hardcoded-connection-string/index';

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

ruleTester.run('no-hardcoded-connection-string', noHardcodedConnectionString, {
  valid: xmo([
    // Environment variable reference
    `const uri = process.env.MONGODB_URI;`,
    // Variable (not a literal)
    `mongoose.connect(connectionString);`,
    // Non-MongoDB URI
    `const url = 'https://example.com';`,
    // postgres://
    `const pg = 'postgresql://localhost:5432/db';`,
    // Test file (allowed by default)
    {
      code: `const uri = 'mongodb://localhost:27017/test';`,
      filename: 'db.test.ts',
    },
  ]),

  invalid: xmo([
    // Basic mongodb:// URI
    {
      code: `const uri = 'mongodb://localhost:27017/mydb';`,
      errors: [{ messageId: 'hardcodedConnectionString' }],
    },
    // mongodb+srv:// URI
    {
      code: `const uri = 'mongodb+srv://user:pass@cluster.mongodb.net/db';`,
      errors: [{ messageId: 'hardcodedConnectionString' }],
    },
    // Direct in connect()
    {
      code: `mongoose.connect('mongodb://admin:password@host:27017/prod');`,
      errors: [{ messageId: 'hardcodedConnectionString' }],
    },
    // Template literal
    {
      code: 'const uri = `mongodb://localhost:27017/${dbName}`;',
      errors: [{ messageId: 'hardcodedConnectionString' }],
    },
    // allowInTests: false in test file
    {
      code: `const uri = 'mongodb://localhost:27017/test';`,
      filename: 'db.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'hardcodedConnectionString' }],
    },
  ]),
});
