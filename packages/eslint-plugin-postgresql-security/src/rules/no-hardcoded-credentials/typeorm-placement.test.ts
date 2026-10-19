/**
 * Placement: a postgres URL in a TypeORM config is TypeORM's finding.
 *
 * `new DataSource({ type: 'postgres', url: 'postgres://app:pw@db/app' })` was
 * reported by this rule AND by `typeorm-security/no-hardcoded-credentials`, so
 * a project running both plugins got two CRITICAL findings on one string.
 * typeorm-security owns TypeORM configs (owner decision, 2026-10-18); this rule
 * skips a DSN inside a TypeORM options object. typeorm-security's
 * `typeorm-placement.test.ts` runs both rules together and locks the count at
 * exactly one.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noHardcodedCredentials } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const DSN = `'postgres://app:s3cret@db.prod.internal:5432/app'`;

const DATA_SOURCE = `import { DataSource } from 'typeorm';
export const ds = new DataSource({ type: 'postgres', url: ${DSN}, entities: [] });`;
const OPTIONS_CONST = `import { DataSource } from 'typeorm';
const options = { type: 'postgres', url: ${DSN} };
export const ds = new DataSource(options);`;
const FOR_ROOT = `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
@Module({ imports: [TypeOrmModule.forRoot({ type: 'postgres', url: ${DSN} })] })
export class AppModule {}`;
const ORMCONFIG = `export default { type: 'postgres', url: ${DSN}, entities: ['dist/**/*.js'] };`;

ruleTester.run(
  'no-hardcoded-credentials — TypeORM placement',
  noHardcodedCredentials,
  {
    valid: [
      {
        name: 'a DSN in new DataSource({ type: "postgres" })',
        code: DATA_SOURCE,
      },
      { name: 'a DSN in TypeORM options held in a const', code: OPTIONS_CONST },
      { name: 'a DSN in TypeOrmModule.forRoot()', code: FOR_ROOT },
      { name: 'a DSN in an ormconfig default export', code: ORMCONFIG },
      {
        name: 'aurora-postgres is TypeORM too',
        code: `import { DataSource } from 'typeorm';\nnew DataSource({ type: 'aurora-postgres', url: ${DSN} });`,
      },
      {
        name: 'a cockroachdb ormconfig carrying only TypeORM keys',
        code: `module.exports = { ...base, [k]: 1, type: 'cockroachdb', url: ${DSN}, synchronize: false };`,
      },
    ],
    invalid: [
      {
        // No TypeORM import and no TypeORM key: typeorm-security does not
        // claim this object, so this rule keeps it.
        name: 'a { type: "postgres" } object with no TypeORM evidence',
        code: `export const config = { ...base, [k]: 1, type: 'postgres', url: ${DSN} };`,
        errors: [{ messageId: 'noHardcodedCredentials' }],
      },
      {
        name: 'a TypeORM file, but a type that is not a postgres driver',
        code: `import { DataSource } from 'typeorm';\nnew DataSource({ type: 'mysql', url: ${DSN} });`,
        errors: [{ messageId: 'noHardcodedCredentials' }],
      },
      {
        name: 'a TypeORM file, but a type chosen at runtime',
        code: `import { DataSource } from 'typeorm';\nnew DataSource({ type: driver, url: ${DSN} });`,
        errors: [{ messageId: 'noHardcodedCredentials' }],
      },
      {
        name: 'a TypeORM file, but an object with no type',
        code: `import { DataSource } from 'typeorm';\nexport const urls = { primary: ${DSN} };`,
        errors: [{ messageId: 'noHardcodedCredentials' }],
      },
      {
        name: 'a TypeORM file, but a DSN that is not a property value',
        code: `import { DataSource } from 'typeorm';\nexport const DATABASE_URL = ${DSN};`,
        errors: [{ messageId: 'noHardcodedCredentials' }],
      },
    ],
  },
);
