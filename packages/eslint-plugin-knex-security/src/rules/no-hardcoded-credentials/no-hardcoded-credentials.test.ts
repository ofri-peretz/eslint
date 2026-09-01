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
        code: DRIVER + `knex({ client: 'pg', connection: { host, database, password: config.dbPassword } })`,
      },
      {
        name: 'the fix — the password comes from the environment',
        code: DRIVER + `knex({ client: 'pg', connection: { host, database, password: process.env.DB_PASSWORD } })`,
      },
      {
        // Same call shape, no knex import: this is somebody else's API.
        name: 'silent without the driver import',
        code: `knex({ client: 'pg', connection: { host, database, password: 'hunter2' } })`,
      },
    ],
    invalid: [
      {
        name: 'a template literal with no interpolation is still a literal',
        code: DRIVER + `knex({ client: 'pg', connection: { host, database, user: 'admin', password: \`hunter2\` } })`,
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'a literal password in the connection config',
        code: DRIVER + `knex({ client: 'pg', connection: { host, database, password: 'hunter2' } })`,
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'the password hidden inside a connection URL',
        code: DRIVER + `knex({ client: 'pg', connection: 'postgres://admin:hunter2@db.internal:5432/app' })`,
        errors: [{ messageId: 'credentialsInUrl' }],
      },
    ],
  });
});
