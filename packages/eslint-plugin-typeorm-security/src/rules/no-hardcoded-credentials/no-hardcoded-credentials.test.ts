/**
 * Tests for typeorm-security/no-hardcoded-credentials
 * CWE-798 — a literal database password in connection configuration.
 *
 * This rule shipped with no invalid case anywhere in the suite. The factory
 * (`createHardcodedCredentialsRule`) is covered in eslint-devkit; what was
 * unproven is that THIS plugin's wiring — its module gate and connection keys —
 * fires on typeorm code.
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
const DRIVER = `import { DataSource } from 'typeorm';\n`;

describe('no-hardcoded-credentials', () => {
  ruleTester.run('no-hardcoded-credentials', noHardcodedCredentials, {
    valid: [
      {
        name: 'a value read from a config object, whose contents this file cannot see',
        code:
          DRIVER +
          `new DataSource({ type: 'postgres', host, database, password: config.dbPassword })`,
      },
      {
        name: 'the fix — the password comes from the environment',
        code:
          DRIVER +
          `new DataSource({ type: 'postgres', host, database, password: process.env.DB_PASSWORD })`,
      },
      {
        // Same call shape, no typeorm import: this is somebody else's API.
        name: 'silent without the driver import',
        code: `new DataSource({ type: 'postgres', host, database, password: 'hunter2' })`,
      },
    ],
    invalid: [
      {
        name: 'a template literal with no interpolation is still a literal',
        code:
          DRIVER +
          `new DataSource({ type: 'postgres', host, database, password: \`hunter2\` })`,
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'a literal password in the connection config',
        code:
          DRIVER +
          `new DataSource({ type: 'postgres', host, database, password: 'hunter2' })`,
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'the password hidden inside a connection URL',
        code:
          DRIVER +
          `new DataSource({ type: 'postgres', url: 'postgres://admin:hunter2@db.internal:5432/app' })`,
        errors: [{ messageId: 'credentialsInUrl' }],
      },
    ],
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-typeorm-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('no-hardcoded-credentials — fp/fn review 2026-10', () => {
  ruleTester.run('fp-fn review 2026-10', noHardcodedCredentials, {
    valid: [
      {
        // @found typeorm-security FP/FN review 2026-10-12, synthetic probe (BENCHMARK-CRITERIA B1)
        name: 'FP: a test data source',
        filename: '/repo/test/data-source.ts',
        code:
          DRIVER +
          "new DataSource({ type: 'postgres', host: 'localhost', password: 'test' });",
      },
    ],
    invalid: [
      {
        // @found nestjs/nest:sample/05-sql-typeorm/src/app.module.ts:12
        name: 'FN: TypeOrmModule.forRoot in a NestJS module',
        code: "import { TypeOrmModule } from '@nestjs/typeorm';\nexport const foo = TypeOrmModule.forRoot({ type: 'mysql', host: 'localhost', port: 3306, username: 'root', password: 'root', database: 'test', autoLoadEntities: true, synchronize: true });",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        // @found typeorm-security FP/FN review 2026-10-12, synthetic probe (ormconfig.js)
        name: 'FN: an ormconfig.js with no typeorm import',
        code: "module.exports = { type: 'mysql', host: 'localhost', username: 'root', password: 'root', database: 'test', entities: ['dist/**/*.entity.js'], synchronize: true };",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
    ],
  });
});

/**
 * An app config that holds a TypeORM block AND other services' settings, with
 * no typeorm import — the config shape is the only evidence, and it covers the
 * TypeORM block, not its neighbours.
 */
describe('no-hardcoded-credentials — config-shape ownership', () => {
  const APP_CONFIG = `export default defineConfig({
  database: {
    type: 'mysql',
    host: process.env.MYSQL_HOST || 'db.internal',
    password: process.env.MYSQL_PASSWORD || 'y3xxKRAmamMGTk3s',
    synchronize: true,
  },
  bullRedis: {
    host: 'localhost',
    port: '6379',
    password: '123456',
  },
});`;
  ruleTester.run('config-shape ownership', noHardcodedCredentials, {
    valid: [
      {
        // @found ILB-Corpus-Truth off-SDK regression, 2026-10-19
        name: 'FP: a Redis block beside a TypeORM config shape, no typeorm import',
        code: `export default defineConfig({
  database: { type: 'mysql', password: process.env.MYSQL_PASSWORD, synchronize: true },
  bullRedis: { host: 'localhost', port: '6379', password: '123456' },
});`,
      },
    ],
    invalid: [
      {
        name: 'the TypeORM block of the same config is still reported',
        code: APP_CONFIG,
        errors: [{ messageId: 'hardcodedPassword', line: 5 }],
      },
    ],
  });
});
