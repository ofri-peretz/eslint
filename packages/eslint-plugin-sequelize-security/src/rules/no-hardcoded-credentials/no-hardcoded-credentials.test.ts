/**
 * Tests for sequelize-security/no-hardcoded-credentials
 * CWE-798 — a literal database password in connection configuration.
 *
 * This rule shipped with no invalid case anywhere in the suite. The factory
 * (`createHardcodedCredentialsRule`) is covered in eslint-devkit; what was
 * unproven is that THIS plugin's wiring — its module gate and connection keys —
 * fires on sequelize code.
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
const DRIVER = `import { Sequelize } from 'sequelize';\n`;

describe('no-hardcoded-credentials', () => {
  ruleTester.run('no-hardcoded-credentials', noHardcodedCredentials, {
    valid: [
      {
        name: 'a value read from a config object, whose contents this file cannot see',
        code:
          DRIVER +
          `new Sequelize({ dialect: 'postgres', host, database, password: config.dbPassword })`,
      },
      {
        name: 'the fix — the password comes from the environment',
        code:
          DRIVER +
          `new Sequelize({ dialect: 'postgres', host, database, password: process.env.DB_PASSWORD })`,
      },
      {
        // No sequelize import AND no Sequelize config shape: somebody else's
        // API. (The fixture that used to sit here carried `dialect:
        // 'postgres'` — Sequelize's own config contract, the sequelize-cli
        // `config.js` shape — so it moved to `invalid` as an FN of the
        // 2026-10 review.)
        name: 'silent without the driver import or its config shape',
        code: `new Client({ host, database, password: 'hunter2' })`,
      },
    ],
    invalid: [
      {
        name: 'a template literal with no interpolation is still a literal',
        code:
          DRIVER +
          `new Sequelize({ dialect: 'postgres', host, database, password: \`hunter2\` })`,
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'a literal password in the connection config',
        code:
          DRIVER +
          `new Sequelize({ dialect: 'postgres', host, database, password: 'hunter2' })`,
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'the password hidden inside a connection URL',
        code:
          DRIVER +
          `new Sequelize('postgres://admin:hunter2@db.internal:5432/app')`,
        errors: [{ messageId: 'credentialsInUrl' }],
      },
    ],
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-sequelize-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('no-hardcoded-credentials — fp/fn review 2026-10', () => {
  ruleTester.run('fp-fn review 2026-10', noHardcodedCredentials, {
    valid: [
      {
        // @found sequelize-security FP/FN review 2026-10-12, synthetic probe (BENCHMARK-CRITERIA B1)
        name: 'FP: a test file pointing at a throwaway database',
        filename: '/repo/test/setup.ts',
        code:
          DRIVER +
          "new Sequelize({ dialect: 'postgres', host: 'localhost', password: 'postgres' });",
      },
      {
        name: 'positional password from the environment',
        code:
          DRIVER +
          "new Sequelize('db', 'app', process.env.DB_PASSWORD, { dialect: 'mysql' });",
      },
    ],
    invalid: [
      {
        // Moved here from `valid` ("silent without the driver import"):
        // `dialect: 'postgres'` is Sequelize's own config contract.
        // @found sequelize-security FP/FN review 2026-10-12, synthetic probe (config without import)
        name: 'FN: a Sequelize config with no sequelize import',
        code: "new Sequelize({ dialect: 'postgres', host, database, password: 'hunter2' })",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        // @found sequelize-security FP/FN review 2026-10-12, synthetic probe (sequelize-cli config.js)
        name: 'FN: a sequelize-cli config.js',
        code: "module.exports = { development: { username: 'root', password: 'root', database: 'db_dev', host: '127.0.0.1', dialect: 'mysql' } };",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        // @found sequelize-security FP/FN review 2026-10-12, synthetic probe (positional password)
        name: 'FN: the positional password argument',
        code:
          DRIVER +
          "const foo = new Sequelize('db', 'root', 'hunter2', { dialect: 'mysql', host: 'db' });",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        // @found nestjs/nest:sample/07-sequelize/src/app.module.ts:12
        name: 'FN: SequelizeModule.forRoot in a NestJS module',
        code: "import { SequelizeModule } from '@nestjs/sequelize';\nexport const foo = SequelizeModule.forRoot({ dialect: 'mysql', host: 'localhost', port: 3306, username: 'root', password: 'root', database: 'test' });",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
    ],
  });
});
