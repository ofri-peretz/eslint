import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { noInsecureSsl } from './index';

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

ruleTester.run('no-insecure-ssl', noInsecureSsl, {
  valid: pg([
    // Default (secure)
    "new Client()",
    "new Pool({ user: 'postgres' })",
    // Explicitly secure
    "new Client({ ssl: { ca: '...' } })",
    "new obj.Client({ ssl: { rejectUnauthorized: false } })", // MemberExpression callee (ignored)
    // String connection string (would require different parsing, rule targets config object)
    "new Client('postgres://user:pass@host/db')",
    // Line 51: ssl object without rejectUnauthorized property (else branch)
    "new Client({ ssl: { minVersion: 'TLSv1.2' } })",
    // Line 51: ssl.rejectUnauthorized = true (explicit secure)
    "new Client({ ssl: { rejectUnauthorized: true } })",
    // Line 51: ssl = true (non-object, else branch for ObjectExpression check)
    "new Client({ ssl: true })",
    // Line 51: ssl = false (also non-object)
    "new Client({ ssl: false })",
  ]),
  invalid: pg([
    {
      code: "new Client({ ssl: { rejectUnauthorized: false } })",
      errors: [{ messageId: 'noInsecureSsl' }],
    },
    {
      code: "new Pool({ ssl: { rejectUnauthorized: false } })",
      errors: [{ messageId: 'noInsecureSsl' }],
    },
  ]),
});
