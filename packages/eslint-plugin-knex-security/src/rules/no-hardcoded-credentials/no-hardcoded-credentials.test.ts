/**
 * Tests for knex-security/no-hardcoded-credentials
 * CWE-798 — a literal database password in connection configuration.
 *
 * This rule shipped with no invalid case anywhere in the suite. The factory
 * (`createHardcodedCredentialsRule`) is covered in eslint-devkit; what was
 * unproven is that THIS plugin's wiring — its module gate and connection keys —
 * fires on knex code.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noHardcodedCredentials } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

/** The module gate: without this import the rule must stay silent. */
const DRIVER = `import knex from 'knex';\n`;

describe('no-hardcoded-credentials', () => {
  ruleTester.run('no-hardcoded-credentials', noHardcodedCredentials, {
    valid: [
      {
        name: 'a value read from a config object, whose contents this file cannot see',
        code:
          DRIVER +
          `knex({ client: 'pg', connection: { host, database, password: config.dbPassword } })`,
      },
      {
        name: 'the fix — the password comes from the environment',
        code:
          DRIVER +
          `knex({ client: 'pg', connection: { host, database, password: process.env.DB_PASSWORD } })`,
      },
      {
        // No knex import AND no knex config shape: somebody else's API.
        // (The fixture that used to sit here carried `{ client: 'pg',
        // connection }` — knex's own config contract, the knexfile shape — so
        // it moved to `invalid` as the knexfile FN of the 2026-10 review.)
        name: 'silent without the driver import or its config shape',
        code: `createClient({ host, database, password: 'hunter2' })`,
      },
    ],
    invalid: [
      {
        name: 'a template literal with no interpolation is still a literal',
        code:
          DRIVER +
          `knex({ client: 'pg', connection: { host, database, user: 'admin', password: \`hunter2\` } })`,
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'a literal password in the connection config',
        code:
          DRIVER +
          `knex({ client: 'pg', connection: { host, database, password: 'hunter2' } })`,
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'the password hidden inside a connection URL',
        code:
          DRIVER +
          `knex({ client: 'pg', connection: 'postgres://admin:hunter2@db.internal:5432/app' })`,
        errors: [{ messageId: 'credentialsInUrl' }],
      },
    ],
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-knex-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('no-hardcoded-credentials — fp/fn review 2026-10', () => {
  ruleTester.run('fp-fn review 2026-10', noHardcodedCredentials, {
    valid: [
      {
        // @found Budibase/budibase:packages/server/src/integrations/tests/utils/mysql.ts:54
        name: 'FP: a test utility pointing at a throwaway container',
        filename: '/repo/packages/server/src/integrations/tests/utils/mysql.ts',
        code:
          DRIVER +
          "knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'password' } });",
      },
    ],
    invalid: [
      {
        // Moved here from `valid` ("silent without the driver import"): a
        // knexfile never imports knex, and `{ client, connection }` is knex's
        // own config contract.
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (knexfile)
        name: 'FN: a knexfile — knex config with no knex import',
        code: "module.exports = { development: { client: 'pg', connection: { host, database, password: 'hunter2' } } };",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (literal fallback)
        name: 'FN: a literal fallback behind the environment variable',
        code:
          DRIVER +
          "knex({ client: 'pg', connection: { host, password: process.env.PGPASSWORD ?? 'postgres' } });",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
    ],
  });
});
