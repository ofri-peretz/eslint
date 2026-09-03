import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { noHardcodedCredentials } from './index';

/**
 * Every fixture imports a PostgreSQL client, because the rule now abstains in
 * files that use no PostgreSQL at all. Wrapping the arrays rather than editing
 * each fixture means one cannot be left behind — a fixture missing the import
 * would pass vacuously on the gate instead of exercising the detection it was
 * written for.
 */
const withPg = (code: string): string => `import { Pool } from 'pg';\n${code}`;
const pg = <T,>(cases: T[]): T[] =>
  cases.map((c) =>
    typeof c === 'string'
      ? (withPg(c) as T)
      : ({ ...c, code: withPg((c as { code: string }).code) } as T),
  );


const ruleTester = new RuleTester({
  languageOptions: {
    parser,
  },
});

ruleTester.run('no-hardcoded-credentials', noHardcodedCredentials, {
  valid: pg([
    "import { Client } from 'pg';\nnew Client({ password: process.env.DB_PASSWORD })",
    "new Pool({ connectionString: process.env.DATABASE_URL })",
    "import { Client } from 'pg';\nnew Client()", // No config, assumes env vars or defaults
    // Ignored NewExpressions (coverage)
    "new OtherClass({ password: '123' })",
    "import { Client } from 'pg';\nnew Client({ ...config })", // Spread element (not Property)
    "import { Client } from 'pg';\nnew Client('some-random-string')", // String but not a protocol match
    "import { Client } from 'pg';\nnew Client(123)", // Non-string arg
    "new Pool({ user: 'postgres', database: 'mydb' })", // No password
  ]),
  invalid: pg([
    {
      // `Client` has to be IMPORTED to be a Client. Without the import these
      // fixtures asserted that the rule may decide from the spelling alone,
      // which is how `new Client(...)` on a test double got reported.
      code: "import { Client } from 'pg';\nnew Client({ password: 'mysecretpassword' })",
      errors: [{ messageId: 'noHardcodedCredentials' }],
    },
    {
      code: "new Pool({ connectionString: 'postgres://user:pass@localhost:5432/db' })",
      errors: [{ messageId: 'noHardcodedCredentials' }],
    },
    {
      code: "import { Client } from 'pg';\nnew Client('postgres://user:pass@localhost:5432/db')",
      errors: [{ messageId: 'noHardcodedCredentials' }],
    },
    {
      // This was a VALID case, and its own comment said why: "computed key
      // (ignored by rule for now)". That is a test asserting a defect as
      // correct behaviour. `{ ['password']: … }` is `{ password: … }`.
      code: "import { Client } from 'pg';\nnew Client({ ['password']: 'secret' })",
      errors: [{ messageId: 'noHardcodedCredentials' }],
    },
  ]),
});
