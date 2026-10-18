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
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
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
        name: 'a value read from a config object, whose contents this file cannot see',
        code:
          DRIVER +
          `mysql.createConnection({ host, user, database, password: config.dbPassword })`,
      },
      {
        name: 'the fix — the password comes from the environment',
        code:
          DRIVER +
          `mysql.createConnection({ host, user, database, password: process.env.DB_PASSWORD })`,
      },
      {
        // Same call shape, no mysql2 import: this is somebody else's API.
        name: 'silent without the driver import',
        code: `mysql.createConnection({ host, user, database, password: 'hunter2' })`,
      },
    ],
    invalid: [
      {
        name: 'a template literal with no interpolation is still a literal',
        code:
          DRIVER +
          `mysql.createConnection({ host, user, database, password: \`hunter2\` })`,
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'a literal password in the connection config',
        code:
          DRIVER +
          `mysql.createConnection({ host, user, database, password: 'hunter2' })`,
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'the password hidden inside a connection URL',
        code:
          DRIVER +
          `mysql.createConnection('mysql://admin:hunter2@db.internal:3306/app')`,
        errors: [{ messageId: 'credentialsInUrl' }],
      },
    ],
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-mysql-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('no-hardcoded-credentials — fp/fn review 2026-10', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mysql-creds-'));
  // bezkoder/nodejs-express-mysql keeps the password in a config module.
  fs.writeFileSync(
    path.join(dir, 'db.config.js'),
    'module.exports = { HOST: "localhost", USER: "root", PASSWORD: "123456", DB: "testdb" };\n',
  );
  const MODEL = path.join(dir, 'db.js');

  ruleTester.run('fp-fn review 2026-10', noHardcodedCredentials, {
    valid: [
      {
        // @found mysql-security FP/FN review 2026-10-12, synthetic probe (BENCHMARK-CRITERIA B1)
        name: 'FP: a test file pointing at a throwaway local database',
        filename: '/repo/test/db.test.ts',
        code:
          DRIVER +
          "mysql.createConnection({ host: 'localhost', user: 'root', password: 'root' });",
      },
      {
        name: 'a DSN constant that no driver call reads is not reported where it is declared',
        code: DRIVER + "export const foo = 'mysql://root:s3cret@db/app';",
      },
      {
        name: 'a password from a config module whose value is not a literal',
        filename: MODEL,
        code: "const mysql = require('mysql');\nconst foo = require('./missing.js');\nmysql.createConnection({ host: foo.HOST, password: foo.PASSWORD });",
      },
    ],
    invalid: [
      {
        // @found mysql-security FP/FN review 2026-10-12, synthetic probe (literal fallback)
        name: 'FN: a literal fallback behind the environment variable',
        code:
          DRIVER +
          "mysql.createPool({ host: 'db', user: 'root', password: process.env.DB_PASSWORD || 'root' });",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        // @found mysql-security FP/FN review 2026-10-12, synthetic probe (template DSN)
        name: 'FN: a DSN template whose static head carries the password',
        code:
          DRIVER +
          'mysql.createPool({ uri: `mysql://root:s3cret@${process.env.DB_HOST}:3306/app` });',
        errors: [{ messageId: 'credentialsInUrl' }],
      },
      {
        // @found mysql-security FP/FN review 2026-10-12, synthetic probe (DSN bound first)
        name: 'FN: a DSN bound to a constant, then handed to the driver',
        code:
          DRIVER +
          "const foo = 'mysql://root:s3cret@db/app';\nmysql.createPool(foo);",
        errors: [{ messageId: 'credentialsInUrl' }],
      },
      {
        // @found sidorares/node-mysql2:website/docs/examples/connections/createPoolCluster.mdx:31
        name: 'FN: a DSN handed to a pool cluster member',
        code:
          DRIVER +
          "const foo = mysql.createPoolCluster();\nfoo.add('clusterA', 'mysql://root:password@localhost:3306/test');",
        errors: [{ messageId: 'credentialsInUrl' }],
      },
      {
        // @found bezkoder/nodejs-express-mysql:app/models/db.js:7
        name: 'FN: the password is a literal in the config module the connection reads',
        filename: MODEL,
        code: "const mysql = require('mysql');\nconst foo = require('./db.config.js');\nmysql.createConnection({ host: foo.HOST, user: foo.USER, password: foo.PASSWORD, database: foo.DB });",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        // @found sidorares/node-mysql2:website/docs/examples/connections/create-pool.mdx:29
        name: 'the documented DSN example commits its password',
        code:
          DRIVER +
          "const foo = mysql.createPool('mysql://root:password@localhost:3306/test');",
        errors: [{ messageId: 'credentialsInUrl' }],
      },
    ],
  });
});
