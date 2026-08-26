/**
 * Tests for mysql-security/no-hardcoded-credentials
 * CWE-798 — a literal database password in connection configuration.
 *
 * This rule shipped with no invalid case anywhere in the suite. The factory
 * (`createHardcodedCredentialsRule`) is covered in eslint-devkit; what was
 * unproven is that THIS plugin's wiring — its module gate and connection keys —
 * fires on mysql code.
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
const DRIVER = `import mysql from 'mysql2';\n`;

describe('no-hardcoded-credentials', () => {
  ruleTester.run('no-hardcoded-credentials', noHardcodedCredentials, {
    valid: [
      {
        name: 'the fix — the password comes from the environment',
        code: DRIVER + `mysql.createConnection({ host, user, database, password: process.env.DB_PASSWORD })`,
      },
      {
        // Same call shape, no mysql2 import: this is somebody else's API.
        name: 'silent without the driver import',
        code: `mysql.createConnection({ host, user, database, password: 'hunter2' })`,
      },
    ],
    invalid: [
      {
        name: 'a literal password in the connection config',
        code: DRIVER + `mysql.createConnection({ host, user, database, password: 'hunter2' })`,
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'the password hidden inside a connection URL',
        code: DRIVER + `mysql.createConnection('mysql://admin:hunter2@db.internal:3306/app')`,
        errors: [{ messageId: 'credentialsInUrl' }],
      },
    ],
  });
});
